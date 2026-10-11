# Novo ciclo A–G: implementação final

Ciclo `rhc-evolution-8w`, 8 semanas, início previsto em 2026-10-12. Sem readaptação nem bloco extra obrigatório de aquecimento. O vínculo anterior é concluído; sessões, exercícios executados, cargas, repetições, datas, exposições e medidas permanecem intactos. Nicole não recebe alteração de programa.

| Dia | Sessão | Séries de musculação |
|---|---|---:|
| Segunda | A — Empurrar | 12 |
| Terça | B — Posterior | 15 |
| Quarta | C — Puxar | 13 |
| Quinta | D — Pernas | 14 |
| Sexta | E — Corrida leve | 0 |
| Sábado | F — Complementar | 15 |
| Domingo | G — Longão | 0 |

Total corrigido: **69**, não 68. Séries unilaterais são contadas por músculo/lado, sem dobrar o volume semanal nominal. Halteres são a elevação lateral padrão; máquina e polia são alternativas com histórico independente. Alternativas do ciclo anterior foram selecionadas por foco muscular, sem tratar como equivalentes exatas; não herdam cargas ou incrementos do principal. Romeno mantido, leg press unilateral substitui afundo no Smith, prancha substitui rollout. Barra fixa exclusivamente pronada sem assistência; lastro opcional.

## Histórico e cargas

- Oito pares de aliases confirmados em `2026-10-09-exercise-catalog-deduplication.md`; tabela de aliases unifica consultas sem apagar IDs ou snapshots históricos. Registros duplicados não são sobrescritos nem somados.
- Baselines por posição de exercício do novo ciclo; A e F têm prescrições e progressão independentes. B e D usam a mesma cadeira flexora, com duas prescrições distintas.
- Última carga executada e concluída da MESMA variação, anterior ao início do deload anterior (2026-10-06). Sessão e data de origem são guardadas no baseline. Ausência de histórico permanece nula, sem carga inventada.
- Leg press unilateral: registro próprio de 30 kg em 2026-07-30. Não usar carga do bilateral.
- Peso corporal legado da barra não é convertido em lastro; baseline do lastro = 0. A prancha tem segundos por série e baseline de carga = 0. Registros antigos permanecem intactos.
- Após a primeira execução, a próxima abertura usa a última carga realmente executada; sugestões não são aplicadas automaticamente.

## Progressão e registros

Progressão dupla nos exercícios dinâmicos: todas as séries realizadas, todas no topo da faixa, esforço registrado dentro do alvo. Sem RPE, sem reps completas ou sem carga real, não aumentar. Preservar incrementos previamente configurados da mesma variação; onde faltam, confirmar o menor incremento disponível e ajustar manualmente. Deload e fim do ciclo suspendem aumentos automáticos. O fim do ciclo aparece explicitamente, sem manter a última fase por tempo indefinido.

Prancha por tempo; Pallof por lado e controle; barra por repetições e lastro opcional. A contagem de falhas consecutivas foi unificada. Volume em kg × reps soma repetições reais de cada série e exclui séries não realizadas e segundos; não é uma comparação válida entre equipamentos nem entre treino com peso corporal e máquinas.

Corridas E/G: distância e duração inseridas manualmente do Adidas Running, sem GPS ou cronômetro de corrida. Nenhum aumento de distância prescrito sem dados de recuperação. A agenda, opções de treino, rascunhos, salvamento e histórico aceitam G. Sessões legadas E com musculação não são classificadas como corrida.

Finalização offline constrói as mesmas exposições que a online. Sessão, exposições e consumo do rascunho são transacionais; trava por operação impede duplicação concorrente. Lançamentos retroativos não substituem a última carga por uma data anterior.

## Validação

- 62 testes Vitest aprovados e build Vite/PWA aprovado.
- Baseline e migration executados em PostgreSQL via PGlite, com schemas de suporte auth/storage simulados. Cinco arquivos SQL aprovados: permissões, integridade, rascunhos, finalização atômica e novo ciclo.
- Novo teste SQL: ativação só para admin, idempotência, 69 séries, alias de flexora preservando 65 kg pré-deload em ambos os slots, fingerprint histórico intacto, barra sem lastro legado e corrida G idempotente.
- CI de banco atualizado para incluir migrations incrementais da V2. Validação Supabase completa feita no CI antes de merge.
- Deploy do frontend, migration remota e ativação do perfil são etapas separadas. A migration publica o template, sem ativar automaticamente nenhum perfil.

A tela autenticada depende da sessão do proprietário; compilação, CI e verificações de banco não substituem validação visual autenticada. Não concluir eficácia do programa nem sustentabilidade em 60 min somente a partir desses testes: acompanhar duração real, desempenho, fadiga, sono e medidas durante o ciclo.
