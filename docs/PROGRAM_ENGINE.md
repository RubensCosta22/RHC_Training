# Motor de Programas — RHC Training

## Objetivo

Adicionar programas periodizados sem substituir o modelo historico existente. O primeiro consumidor sera o perfil Henrique com o RHC Strength 12W, que sera criado em PR posterior.

## Garantia de preservacao

O PR #33 nao move, regrava, apaga ou arquiva automaticamente nenhuma linha existente de:

- `workout_sessions`;
- `workout_exercises`;
- `exercise_records`;
- `body_measurements`;
- `progress_photos`.

O ciclo anterior de um perfil pode receber um marcador em `profile_training_archives`. Esse marcador define um rotulo e uma data limite (`history_through`), mas os treinos continuam nas tabelas historicas originais com os mesmos IDs, cargas e datas.

Assim, o historico do Henrique continua disponivel para estatisticas, exportacao e consulta mesmo depois de iniciar um programa novo.

## Hierarquia

`training_programs`
→ `program_phases`
→ `program_sessions`
→ `program_exercises`
→ `program_exercise_substitutions`

A atribuicao ao usuario acontece por `profile_program_enrollments`.

## Tipos de sessao

- `strength`: musculacao/forca;
- `running`: corrida e condicionamento;
- `recovery`: recuperacao planejada.

Cada sessao pode ter uma prescricao JSON adicional para estruturas que nao se encaixam em series/repeticoes, como corrida continua ou intervalada.

## Tipos de exercicio

- `principal`: prioridade de progressao e maior controle de RPE;
- `secundario`: progressao moderada;
- `acessorio`: preferencia por faixas de repeticoes/double progression.

## Progressao

O dominio `programEngine.js` e puro e nao altera dados sozinho.

### Carga

Se todas as series e repeticoes forem concluidas dentro do RPE alvo, a decisao e `increase` e usa o menor incremento configurado para a variacao/equipamento.

Uma falha isolada gera `hold`.

Falhas consecutivas, conforme o limite configurado, geram `regress` com percentual configuravel. A recomendacao sera apresentada ao usuario no PR de Execucao Inteligente; nao ha alteracao silenciosa de carga.

### Double progression

Acessorios podem subir carga somente quando todas as series atingirem o topo da faixa de repeticoes com RPE controlado.

## Baselines

`profile_program_exercise_baselines` guarda carga inicial e menor incremento por variacao. Isso impede tratar cargas de maquinas diferentes como equivalentes.

Exemplo: Supino Hammer e Chest Press possuem historicos de carga independentes mesmo quando ocupam o mesmo padrao de movimento.

## Corrida

O enrollment suporta `running_baseline`. Para o piloto Henrique, o baseline conhecido e 10 km em aproximadamente 50 minutos, mas a prescricao completa do RHC Strength 12W sera adicionada no PR #35.

## Seguranca

- templates publicados sao leitura para usuarios autenticados;
- enrollments exigem permissao de gerenciamento do perfil;
- baselines exigem permissao de edicao;
- arquivos de ciclo sao gravados somente pela RPC autenticada;
- nao ha DELETE direto das tabelas de historico/enrollment.
