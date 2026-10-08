# RHC Training V2 — Diagnóstico e plano de evolução (2026-10-08)

> Branch isolada: `audit/next-cycle-rhc-v2`. Documento de diagnóstico; nenhuma alteração no banco, no programa ativo ou em produção.

## Decisões de produto confirmadas

- Novo ciclo: segunda A empurrar; terça B posterior; quarta C puxar/abdômen; quinta D quadríceps/core; sexta E corrida leve; sábado F superiores/abdômen; domingo G longão.
- Barra fixa exclusivamente pronada, sem assistência; lastro opcional, não obrigatório.
- Leg press unilateral possui histórico anterior e deve recuperá-lo sem misturar com o bilateral.
- Prancha registra duração por série, não exige peso.
- Corrida é **manual**, sem GPS e sem cronômetro. Entrada de distância em km (vírgula ou ponto), minutos e segundos separados (0–59), ritmo calculado, dados anteriores preservados.
- Corrida terá distância/tempo/ritmo e resumos de quilometragem independentes da tonelagem.
- Nenhum cadastro/ativação do novo programa antes de concluir diagnóstico e validação.

## Achados de inspeção estática

| Prioridade | Achado | Evidência no código | Validação / solução proposta |
|---|---|---|---|
| P0 | Histórico de carga pode vir de exercício alternativo, não da variação selecionada | `src/pages/Workout.jsx` `resolveExerciseRecord` | Exibir referência apenas exata; histórico alternativo sem sugerir kg equivalentes |
| P0 | Contagem de falhas de progressão divergente entre serviço e painel | `src/services/programExecutionService.js`, `src/components/SmartExecutionPanel.jsx` | Centralizar regra; diferenciar falha real, hold, manual, deload |
| P1 | Entrada de repetições nasce preenchida com mínimo prescrito | `src/pages/Workout.jsx` `buildInitialExerciseValues` | Separar meta de repetições efetivamente realizadas |
| P1 | Tipos de execução sem carga/por tempo não são modelados de ponta a ponta | `src/services/workoutCompletionV2Service.js` `normalizeExercise`; `src/components/ExerciseCard.jsx` | Modelos: external_load, bodyweight, timed_isometric, unilateral |
| P1 | Corrida manual usa segundos inteiros e oferece GPS/cronômetro desnecessários | `src/components/RunningSessionPanel.jsx` | Simplificar interface, manter contrato `duration_seconds` e `distance_meters` |
| P1 | Tonelagem genérica aplicada à sessão, sem métricas específicas de corrida | `src/services/workoutCompletionV2Service.js` | Dashboard separado para corrida; preservar valor zero de tonelagem sem chamá-lo de volume total |
| P1 | Aderência por contagem de códigos pode mascarar treinos repetidos e semanas | `src/services/programStatsService.js` | Vincular sessão à semana/enrollment e comparar slots programados |
| P1 | Agrupamento de evolução por nome pode fragmentar variações | `src/services/programStatsService.js` | IDs estáveis com snapshots para histórico |
| P1 | Progressão dupla não valida `completedSets` diretamente; RPE nulo passa como controlado | `src/domain/programEngine.js` | Regras explícitas para dados incompletos, RIR/RPE e séries |
| P2 | GPS mantém watcher durante pausa comum do cronômetro | `src/components/RunningSessionPanel.jsx` | Será eliminado ao simplificar para registro manual |
| P2 | Testes do motor cobrem poucos casos de borda | `src/domain/programEngine.test.js` | Testar ausência de RPE, séries incompletas, deload, unilateral, sem lastro, isometria |
| P2 | Dependências em `package.json` usam faixas com `^` | `package.json` | Conferir lockfile, CI, audit e política de atualização antes de mudar |
| P2 | Rascunhos locais/remotos têm prevenção de conflito, mas exigem testes de regressão | `src/services/workoutDraftLocalService.js`, `src/services/workoutDraftService.js` | Testar offline, retomada, duplicidade e troca de ciclo |

## Auditoria do programa atual e novo

- Atual: fases e histórico de exposições existem; não reiniciar adaptação geral no próximo ciclo.
- Novo: preservar cargas/histórico das máquinas, testar introdução técnica do terra romeno e não inferir carga de uma máquina a partir de outra.
- Nova quarta-feira totaliza **13 séries** (não 12); demais totais conforme plano.
- Monitorar interferência entre posterior terça, quadríceps quinta, corrida leve sexta e longão domingo.
- A progressão do novo programa deve usar RIR 1–3 e não presumir RPE ausente como sucesso.
- A substituição deverá considerar padrão de movimento, musculatura, amplitude, estabilidade e equipamento; identificar equivalência direta versus parcial.

## Critérios de aceite antes de PR para produção

1. Registro manual de corrida aceita `6,02` km e `34:08` sem conversão do usuário, mantém valor durante edição, salva 2048 segundos, mostra ritmo e histórico.
2. Barra pronada salva sem carga; prancha salva segundos por série; leg press unilateral recupera somente histórico próprio.
3. Nenhum incremento de carga com dados incompletos, deload ou exercício alternativo; falhas e regressões são determinísticas.
4. Rascunhos, sincronização offline e conclusão não duplicam sessões.
5. Testes unitários, build, auditoria de dependências e testes manuais móveis passam.
6. Revisar RLS/RPCs e permissões administrativas; não executar migrations diretamente no projeto de produção.
7. Programa atual e seu histórico permanecem intactos; ativação do próximo ciclo exige etapa separada.

## Estado da auditoria

**Concluído:** leitura estática focalizada de treinos, corrida, progresso, rascunhos, rotas, dependências e documentação de segurança.

**Pendente:** execução da suíte e build; testes funcionais no navegador/dispositivo; validação do estado efetivo de RLS, migrações e configurações Supabase; medição de performance; avaliação completa de todos os fluxos e páginas. Achados são diagnósticos estáticos, não falhas reproduzidas em produção.

## Sequência proposta

1. Fechar auditoria técnica e testes, registrar evidências.
2. Corrigir contratos de dados/validação e motor de progressão com testes.
3. Simplificar corrida manual e indicadores; preservar dados antigos.
4. Melhorar substituições e referências históricas.
5. Cadastrar próximo programa inativo, revisar prescrição e executar testes.
6. PR revisado, CI e merge somente após aprovação explícita.


## Verificação do projeto Supabase em 2026-10-08 (somente leitura)

- Advisors segurança: 2 tabelas RLS sem políticas (`event_logs`, `profile_access`), e proteção contra senhas vazadas desativada. Ausência de policy com RLS ligado normalmente nega acesso, não demonstra vazamento. Confirmar intenção e privilégios RPC.
- Advisors desempenho: FK `profile_invitations_claimed_by_fkey` sem índice de apoio; policy `profile_invitations_self_read` com avaliação repetida de auth; duas policies permissivas SELECT em `profile_invitations`; 21 índices sem uso reportado. **Não remover índices automaticamente**.
- Migrações efetivas incluem `20261007131318_workout_integrity_atomic_completion` e `20261007132037_workout_draft_invoker_hardening`; verificar alinhamento entre código e banco antes de modificar RPC.
- Contagens de referência: 73 sessões, 3 rascunhos, 2 matrículas e 292 exposições. Preservar integralmente.
- Sessões de corrida código E: 12 registros, 11 com distância e 11 com duração; uma sessão precisa de análise de completude antes da migração da interface.
- Das 292 exposições, 292 possuem `variation_exercise_id` e 290 possuem RPE. **Preferir ID já persistido ao nome**, e tratar 2 RPE ausentes sem presumir sucesso.
- Há 1 registro de `duration_seconds` em A e 1 em C; não assumir que a coluna só foi usada para corrida.
- Dados observados por consultas de agregação; nenhum dado individual foi alterado.

### Referências oficiais para remediação

- [RLS sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Índices de FKs](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
- [Otimização RLS](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
- [Políticas permissivas](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)
