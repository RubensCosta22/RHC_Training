# RHCT-DATA-001 — Correção de taxonomia de grupo muscular

Status: Draft
Tipo: manutenção corretiva / integridade de dados

## Problema

A coluna `workout_exercises.muscle_group` contém conceitos diferentes misturados:

1. grupos musculares reais, como `Peito`, `Costas`, `Bíceps`, `Tríceps`, `Quadríceps`, `Glúteos`, `Panturrilha`, `Posterior`, `Core`;
2. padrões de movimento, como `empurrar_horizontal`, `puxar_vertical`, `extensao_quadril`, `flexao_joelho`, `anti_rotacao`;
3. categorias/modalidades, como `Cardio` e `Mobilidade`;
4. duplicatas de capitalização, como `core` e `Core`.

## Causa raiz confirmada

O programa estruturado RHC Strength 12W armazena corretamente `movement_pattern` em `program_exercises`, mas `getActiveProgramWorkout()` atualmente copia esse valor também para `muscleGroup`. Na finalização do treino, `muscleGroup` é persistido como `workout_exercises.muscle_group`.

Consequência: sessões tradicionais gravam grupos musculares, enquanto sessões do programa estruturado gravam padrões de movimento na mesma coluna.

A tela administrativa de planos também permite texto livre em `muscleGroup`, sem taxonomia canônica, permitindo novas variações de escrita.

## Objetivos

- interromper imediatamente a criação de novos registros conceitualmente incorretos;
- separar `muscle_group` de `movement_pattern` no domínio e no banco;
- manter compatibilidade com todo o histórico existente;
- não apagar, reescrever nem recalcular sessões históricas;
- tornar novos grupos musculares canônicos e consistentes;
- preservar padrões de movimento, pois eles são úteis para progressão e substituições.

## Fora de escopo

- redesenho do app;
- novas funcionalidades de treino;
- recalcular estatísticas históricas;
- apagar ou atualizar em massa registros antigos;
- substituir exercícios existentes.

## Taxonomia canônica proposta

`muscle_group` para novos registros deve usar apenas valores canônicos de domínio:

- Peito
- Costas
- Ombros
- Bíceps
- Tríceps
- Quadríceps
- Posteriores
- Glúteos
- Panturrilhas
- Core
- Tibial
- Adutores
- Abdutores

`Cardio` e `Mobilidade` não são grupos musculares. Caso um exercício dessas categorias precise ser salvo em `workout_exercises`, seu grupo muscular poderá ser `null` e sua categoria deverá ser representada separadamente no domínio futuro; esta Spec não exige uma coluna `exercise_category` nesta correção, salvo se necessária para evitar regressão funcional.

## Estratégia de correção

### 1. Banco — mudança aditiva

Adicionar a `workout_exercises`:

- `movement_pattern text null`

Não remover `muscle_group`.

Se necessário ao fluxo do programa, adicionar a `program_exercises`:

- `primary_muscle_group text null`

A migration deve ser estritamente aditiva. Não executar `UPDATE` ou `DELETE` em sessões históricas.

### 2. Programa estruturado

Cada `program_exercise` deverá possuir separadamente:

- `primary_muscle_group`: grupo muscular canônico;
- `movement_pattern`: padrão biomecânico existente.

`getActiveProgramWorkout()` deverá mapear:

- `muscleGroup <- primary_muscle_group`
- `movementPattern <- movement_pattern`

Nunca mais copiar `movement_pattern` para `muscleGroup`.

### 3. Persistência de sessão

`saveWorkoutSessionV2` e o fluxo legado deverão persistir separadamente:

- `muscle_group` a partir de `exercise.muscleGroup`;
- `movement_pattern` a partir de `exercise.movementPattern` quando disponível.

### 4. Planos tradicionais

A administração não deverá aceitar qualquer texto arbitrário como novo grupo muscular.

Usar uma lista canônica centralizada para novos/alterados exercícios. Registros e planos já existentes continuam legíveis mesmo se possuírem valores legados.

### 5. Compatibilidade histórica

Os 34 valores existentes não serão normalizados por UPDATE nesta entrega.

Na leitura/relatórios futuros, valores antigos podem ser classificados por uma camada de compatibilidade, mas os dados originais devem permanecer imutáveis.

## Critérios de aceite

1. Completar novo treino do programa estruturado não grava `empurrar_horizontal`, `puxar_vertical`, etc. em `muscle_group`.
2. O padrão de movimento continua disponível em `movement_pattern`.
3. Novos planos administrativos só aceitam grupos musculares canônicos.
4. `Core` não pode voltar a gerar uma segunda variante `core` em novos registros.
5. Nenhuma linha histórica de `workout_sessions`, `workout_exercises`, `exercise_records`, fotos ou medidas é apagada ou atualizada pela migration.
6. Histórico anterior continua carregando normalmente.
7. Progressão de cargas continua funcionando.
8. Build, testes e Security CI passam antes do merge.

## Risco principal

A lógica de progressão atual usa `muscleGroup` para decidir incremento de membros inferiores. A correção deve garantir que a taxonomia canônica preserve essa decisão ou substituir essa heurística por uma função explícita e testada, sem regressão de sugestões de carga.

## Rollback

Como a migration é aditiva, rollback de aplicação consiste em reverter o código. As novas colunas podem permanecer no banco sem impacto. Não remover colunas como parte de rollback emergencial.
