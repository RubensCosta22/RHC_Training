# RHCT-TRAIN-001 — Ciclo A–F, corrida registrável e recuperação de treino em andamento

## 1. Identificação

- **Produto:** RHC Training
- **Risk Tier:** R2 — Medium
- **Status:** Draft
- **Owner:** Rubens Costa
- **Standard:** RHC Tech SDD v1.3

## 2. Problema

O plano atual do perfil Henrique possui treinos A–E. Como a rotina semanal passou a ter seis dias de treino, o sábado volta ao treino A antes de um sexto treino complementar existir.

O treino E também é tratado como uma sessão comum e pode ser concluído sem registrar distância ou tempo da corrida.

Além disso, os dados preenchidos durante um treino existem apenas no estado da página. Ao atualizar ou reabrir a rota antes da finalização, séries, cargas, repetições, alternativas e exercícios concluídos são perdidos.

## 3. Objetivos

1. Adicionar ao plano de Henrique o treino F — Complementar, priorizando máquinas e barra fixa.
2. Evoluir o treino E para registrar distância, duração e ritmo médio, com entrada manual e cronômetro.
3. Permitir medição opcional de distância por geolocalização, sempre com fallback manual.
4. Persistir automaticamente um treino em andamento e restaurá-lo após atualização, fechamento acidental ou interrupção temporária.
5. Preservar integralmente todo o histórico, cargas, sessões, fotos, medições e programas existentes.

## 4. Não objetivos

- Não transformar o aplicativo em produto público ou comercial.
- Não criar feed, compartilhamento de rotas ou ranking.
- Não armazenar a rota GPS completa no servidor nesta versão.
- Não alterar planos de Nicole, Rudney, Karol ou outros perfis.
- Não recalcular ou migrar cargas históricas.
- Não apagar, regravar ou arquivar sessões existentes.

## 5. Treino F — Complementar

### 5.1 Estrutura proposta

1. Barra fixa pronada — 4×6–10
   - alternativas: barra neutra, Graviton, pulldown articulado;
2. Remada articulada — 3×10–12
   - alternativas: remada Hammer, remada baixa, remada convergente;
3. Elevação lateral na máquina — 4×12–15
   - alternativas: cabo unilateral, halteres;
4. Reverse Fly / Peck Deck invertido — 4×12–15
   - alternativas: cabo, máquina posterior de ombros;
5. Rosca Scott máquina — 3×10–12
   - alternativas: barra W, Scott unilateral;
6. Tríceps máquina — 3×10–12
   - alternativas: corda, paralelas assistidas;
7. Panturrilha sentado — 4×15
   - alternativas: máquina em pé, leg press;
8. Abdominal máquina — 3×15
   - alternativas: crunch no cabo, crunch;
9. Prancha — 3×45–60 segundos.

### 5.2 Experiência

O treino F deve usar a mesma estrutura dos demais treinos:

- séries e repetições;
- carga;
- séries concluídas;
- alternativas;
- histórico da última carga;
- vídeo de execução quando disponível;
- observações e dificuldade;
- salvamento offline e finalização normal.

## 6. Treino E — Corrida

### 6.1 Dados mínimos

- distância em quilômetros;
- duração em horas, minutos e segundos;
- ritmo médio calculado em min/km;
- observação opcional;
- modo de registro: manual, cronômetro ou GPS.

### 6.2 Cronômetro

Deve permitir:

- iniciar;
- pausar;
- continuar;
- finalizar;
- restaurar o tempo após atualização da página;
- não depender de um contador incremental sujeito a throttling; o tempo deve ser derivado de timestamps e períodos pausados.

### 6.3 GPS opcional

- solicitar permissão somente após ação explícita do usuário;
- mostrar estado de aquisição/falha de sinal;
- acumular distância apenas a partir de pontos aceitáveis;
- rejeitar pontos com precisão inadequada e saltos incompatíveis;
- manter pontos de rota apenas em memória durante a sessão;
- não gravar latitude/longitude em logs ou banco nesta versão;
- permitir correção manual da distância antes da finalização;
- nunca bloquear conclusão quando GPS estiver indisponível.

## 7. Rascunho persistente de treino

### 7.1 Conteúdo preservado

O rascunho deve incluir, quando aplicável:

- profileId e tipo do treino;
- identidade/versão do plano carregado;
- academia, data, duração e observação;
- exercício selecionado e alternativa escolhida;
- carga, repetições, RPE, dificuldade e observações;
- séries concluídas;
- exercícios concluídos;
- estado expandido relevante;
- dados da corrida;
- estado do cronômetro;
- timestamp da última alteração.

### 7.2 Chave e isolamento

Cada rascunho deve ser isolado por usuário autenticado, perfil e treino. Um usuário não pode restaurar rascunho pertencente a outro usuário/perfil.

### 7.3 Salvamento

- salvar automaticamente após alterações, com debounce curto;
- manter uma cópia local para sobreviver a refresh e offline;
- não criar `workout_session` concluída a cada alteração;
- não duplicar sessões no banco;
- exibir indicação discreta de “salvo neste dispositivo” ou falha de persistência.

### 7.4 Restauração

Quando existir rascunho compatível, restaurá-lo automaticamente ou apresentar uma escolha clara entre continuar e descartar.

Se o plano/exercícios tiverem mudado, restaurar somente campos compatíveis e informar que parte do rascunho não pôde ser aplicada.

### 7.5 Limpeza

O rascunho deve ser removido somente quando:

- o treino for salvo com sucesso;
- o usuário confirmar descarte;
- o rascunho exceder a retenção definida;
- o usuário sair e a política de segurança exigir remoção do dispositivo compartilhado.

Falha de rede ou erro ao finalizar não pode apagar o rascunho.

## 8. Dados e migração

A implementação deve ser aditiva.

- novos campos/tabelas devem aceitar ausência de dados antigos;
- sessões históricas sem métricas de corrida permanecem válidas;
- nenhuma migration pode executar DELETE, TRUNCATE ou atualização em massa do histórico;
- `workout_sessions`, `workout_exercises`, `exercise_records`, `body_measurements` e `progress_photos` não serão regravados;
- o treino F será acrescentado apenas ao plano do perfil Henrique de forma idempotente;
- aplicação da migration duas vezes não pode criar duplicatas.

## 9. Segurança e privacidade

- RLS obrigatória para qualquer nova tabela persistida no Supabase;
- usuário só acessa rascunhos/métricas de perfis autorizados;
- coordenadas GPS não serão persistidas nesta versão;
- dados de localização não entram em logs;
- inputs de notas continuam sanitizados e limitados;
- finalização deve ser idempotente contra clique duplo e retry.

## 10. Estados de UX

- carregando treino;
- rascunho restaurado;
- rascunho incompatível parcial;
- salvando localmente;
- falha ao salvar rascunho;
- offline;
- GPS solicitando permissão;
- GPS indisponível/negado;
- cronômetro ativo/pausado;
- finalização em progresso;
- erro de finalização com rascunho preservado;
- sucesso com rascunho removido.

## 11. Requisitos funcionais

- **FR-01:** o ciclo de Henrique deve suportar A→B→C→D→E→F→A.
- **FR-02:** o F deve conter exercícios, alternativas e vídeos conforme a mesma estrutura dos treinos existentes.
- **FR-03:** o E deve aceitar distância e duração manualmente.
- **FR-04:** o sistema deve calcular ritmo médio a partir de distância e duração válidas.
- **FR-05:** o cronômetro deve sobreviver à atualização da página.
- **FR-06:** GPS deve ser opcional e possuir fallback manual.
- **FR-07:** alterações do treino em andamento devem ser persistidas automaticamente.
- **FR-08:** refresh/reabertura deve recuperar o rascunho do usuário/perfil/treino correto.
- **FR-09:** finalizar com sucesso deve limpar apenas o rascunho correspondente.
- **FR-10:** falha de finalização deve preservar o rascunho.
- **FR-11:** dados anteriores devem continuar legíveis sem backfill obrigatório.
- **FR-12:** nenhuma sessão pode ser duplicada por retry ou clique duplo.

## 12. Critérios de aceite

- **AC-01:** dado um treino parcialmente preenchido, quando a página for atualizada, cargas, repetições, séries e exercícios concluídos reaparecem.
- **AC-02:** dado um erro de rede na finalização, o usuário recebe erro e o rascunho permanece disponível.
- **AC-03:** dado um treino salvo com sucesso, o rascunho correspondente é removido e a sessão aparece uma única vez no histórico.
- **AC-04:** um usuário não consegue restaurar rascunho de outro usuário ou perfil não autorizado.
- **AC-05:** é possível concluir corrida com distância e tempo manuais e o ritmo calculado corretamente.
- **AC-06:** pausar, atualizar a página e continuar o cronômetro não adiciona tempo do período pausado.
- **AC-07:** negar GPS não impede registro manual nem conclusão da corrida.
- **AC-08:** nenhuma coordenada de localização aparece no banco, telemetria ou logs.
- **AC-09:** o treino F aparece após E apenas para o plano de Henrique.
- **AC-10:** alternativas e vídeos do F funcionam como nos demais treinos.
- **AC-11:** históricos A–E anteriores permanecem inalterados e acessíveis.
- **AC-12:** migration e seed são idempotentes e não criam treino/exercícios duplicados.

## 13. Evidências obrigatórias

- testes unitários de cálculo de ritmo e cronômetro;
- testes de serialização/restauração do rascunho;
- teste de isolamento por usuário/perfil;
- teste de refresh durante treino;
- teste offline e erro de finalização;
- teste de clique duplo/idempotência;
- teste da migration em cópia/ambiente isolado;
- consultas antes/depois comprovando preservação de histórico;
- revisão mobile do E e F;
- validação manual dos vídeos e alternativas;
- revisão adversarial aprovada antes da implementação.
