# RHCT-DATA-001 — Correção de taxonomia de grupo muscular

Status: Approved / Ready
Tipo: manutenção corretiva / integridade de dados

## Problema

A coluna `workout_exercises.muscle_group` contém conceitos diferentes misturados:

1. grupos musculares reais, como `Peito`, `Costas`, `Bíceps`, `Tríceps`, `Quadríceps`, `Glúteos`, `Panturrilha`, `Posterior`, `Core`;
2. padrões de movimento, como `empurrar_horizontal`, `puxar_vertical`, `extensao_quadril`, `flexao_joelho`, `anti_rotacao`;
3. categorias/modalidades, como `Cardio` e `Mobilidade`;
4. duplicatas de capitalização, como `core` e `Core`.

## Causa raiz confirmada

O programa estruturado RHC Strength 12W armazena corretamente `movement_pattern` em `program_exercises`, mas `getActiveProgramWorkout()` copiava esse valor também para `muscleGroup`. Na finalização, `muscleGroup` era persistido como `workout_exercises.muscle_group`.

A tela administrativa de planos também permitia texto livre em `muscleGroup`, sem taxonomia canônica.

## Objetivos

- impedir a criação de novos registros conceitualmente incorretos;
- separar `muscle_group` de `movement_pattern` no domínio e no banco;
- manter compatibilidade com todo o histórico existente;
- não apagar, reescrever nem recalcular sessões históricas;
- tornar novos grupos musculares canônicos e consistentes;
- preservar padrões de movimento para progressão e substituições.

## Fora de escopo

- redesenho do app;
- novas funcionalidades de treino;
- recalcular estatísticas históricas;
- normalizar em massa os 34 valores históricos;
- substituir exercícios históricos.

## Taxonomia canônica para novos registros

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

`Cardio` e `Mobilidade` não são grupos musculares e podem resultar em `muscle_group = null` quando não houver um músculo primário aplicável nesta versão.

## Estratégia aprovada

### Banco

Adicionar de forma compatível:

- `workout_exercises.movement_pattern text null`;
- `program_exercises.primary_muscle_group text null`.

A migration pode atualizar **configuração do programa** (`program_exercises.primary_muscle_group`) para que os próximos treinos sejam gerados corretamente. É proibido atualizar histórico de `workout_sessions`, `workout_exercises`, `exercise_records`, fotos ou medidas.

Não adicionar CHECK retroativa em `workout_exercises.muscle_group`, pois os valores legados precisam continuar válidos.

### Programa estruturado

Cada exercício do programa terá:

- `primary_muscle_group`: grupo muscular canônico;
- `movement_pattern`: padrão biomecânico existente.

`getActiveProgramWorkout()` deverá mapear:

- `muscleGroup <- primary_muscle_group`;
- `movementPattern <- movement_pattern`.

### Persistência

Novos treinos persistirão separadamente:

- `muscle_group` a partir da taxonomia canônica;
- `movement_pattern` quando disponível.

A RPC atômica continuará backward-compatible com payloads que não enviam `movement_pattern`.

### Administração

O campo de grupo muscular deixa de ser texto livre e passa a usar a lista canônica centralizada. Valores legados conhecidos podem ser normalizados ao editar/salvar um plano, sem tocar em sessões históricas.

## Compatibilidade histórica

Os 34 valores existentes permanecem exatamente como foram gravados. Esta entrega corrige somente a geração futura de dados. Uma eventual camada de leitura normalizada poderá ser criada em outra Spec, se necessária.

## Critérios de aceite

1. Novo treino do programa estruturado não grava `empurrar_horizontal`, `puxar_vertical` etc. em `muscle_group`.
2. O padrão continua salvo em `movement_pattern`.
3. Novos/alterados planos administrativos usam somente grupos canônicos ou `null`.
4. `core` não volta a ser criado como variante de `Core`.
5. Nenhuma linha histórica de sessões, exercícios, recordes, fotos ou medidas é alterada pela migration.
6. Histórico anterior continua carregando normalmente.
7. Progressão de cargas continua funcionando.
8. Build, testes e Security CI passam antes do merge.

## Rollback

Rollback de aplicação consiste em reverter o código. As novas colunas podem permanecer no banco sem impacto; não remover colunas em rollback emergencial.
