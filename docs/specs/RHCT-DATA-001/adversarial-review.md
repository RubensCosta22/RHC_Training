# RHCT-DATA-001 — Adversarial Review

Status: PASS FOR IMPLEMENTATION

## Resultado

- Blocker: 0
- Major: 0
- Minor: 0

## Riscos revisados

### 1. Constraint em `workout_exercises.muscle_group` quebraria o histórico

**Risco:** os 34 valores históricos já existentes incluem padrões de movimento, categorias e variações de escrita. Adicionar uma CHECK canônica diretamente nessa coluna faria a migration falhar ou exigiria reescrever histórico.

**Decisão:** não adicionar constraint retroativa em `workout_exercises.muscle_group`. A taxonomia é validada na entrada da aplicação. Apenas `program_exercises.primary_muscle_group`, coluna nova e inicialmente nula, recebe CHECK canônica.

### 2. Backfill histórico poderia alterar estatísticas ou interpretação passada

**Risco:** converter `empurrar_horizontal` em `Peito` ou `Pernas` em `Quadríceps` dentro de sessões concluídas mudaria a semântica histórica e poderia afetar relatórios.

**Decisão:** nenhum `UPDATE`, `DELETE` ou recálculo é permitido em `workout_sessions`, `workout_exercises`, `exercise_records`, fotos ou medidas. Os 34 valores antigos permanecem intactos.

### 3. Programa estruturado continuaria contaminando novos registros

**Risco:** `getActiveProgramWorkout()` copiava `movement_pattern` para `muscleGroup`.

**Correção:** `program_exercises` recebe `primary_muscle_group`; a aplicação passa a mapear `muscleGroup <- primary_muscle_group` e `movementPattern <- movement_pattern`.

### 4. RPC descartaria `movement_pattern`

**Risco:** mesmo com o frontend corrigido, `save_family_workout_session_atomic` não possuía coluna de destino para o padrão de movimento.

**Correção:** migration adiciona `workout_exercises.movement_pattern` e recria a RPC de forma backward-compatible. Payloads antigos continuam funcionando porque a propriedade é opcional.

### 5. Administração poderia recriar variantes livres

**Risco:** o campo de grupo muscular era texto livre.

**Correção:** a administração passa a usar somente `CANONICAL_MUSCLE_GROUPS`; aliases legados são normalizados ao salvar. `Cardio`, `Mobilidade` e padrões biomecânicos não são convertidos em grupos musculares.

### 6. Progressão de carga poderia regredir

**Risco:** a heurística de progressão identifica membros inferiores pelo nome do grupo muscular.

**Validação:** a taxonomia canônica mantém `Quadríceps`, `Posteriores`, `Glúteos` e `Panturrilhas`, todos compatíveis com a heurística atual baseada em substring. Nenhum padrão biomecânico é necessário para essa decisão.

## Invariantes

1. IDs de sessões e exercícios históricos não mudam.
2. Cargas, repetições, volume, datas e recordes históricos não mudam.
3. Os 34 valores históricos continuam consultáveis exatamente como foram gravados.
4. Novos treinos estruturados não gravam padrões de movimento em `muscle_group`.
5. `movement_pattern` continua disponível para novos registros estruturados.
6. Rollback de aplicação não exige remover as novas colunas.
