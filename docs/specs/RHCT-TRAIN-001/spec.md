# RHCT-TRAIN-001 — Ciclo A–F, corrida registrável e recuperação de treino em andamento

## 1. Identificação

- **Produto:** RHC Training
- **Risk Tier:** R2 — Medium
- **Status:** Approved / Ready
- **Owner:** Rubens Costa
- **Standard:** RHC Tech SDD v1.3
- **Versão da Spec:** 1.1

## 2. Problema

O plano atual do perfil Henrique possui treinos A–E. Como a rotina semanal passou a ter seis dias de treino, o sábado volta ao treino A antes de existir um sexto treino complementar.

O treino E também é tratado como uma sessão comum e pode ser concluído sem registrar distância ou tempo da corrida.

Além disso, os dados preenchidos durante um treino existem apenas no estado React da página. Ao atualizar ou reabrir a rota antes da finalização, séries, cargas, repetições, alternativas e exercícios concluídos são perdidos.

## 3. Objetivos

1. Adicionar ao plano de Henrique o treino F — Complementar, priorizando máquinas e barra fixa.
2. Evoluir o treino E para registrar distância, duração e ritmo médio, com entrada manual e cronômetro.
3. Permitir medição opcional de distância por geolocalização, sempre com fallback manual.
4. Persistir um treino em andamento e restaurá-lo após atualização, fechamento acidental ou interrupção temporária.
5. Garantir idempotência, isolamento entre usuários/perfis e tratamento explícito de conflitos entre dispositivos.
6. Preservar integralmente todo o histórico, cargas, sessões, fotos, medições e programas existentes.

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
- derivar o tempo de timestamps e períodos pausados, sem depender de contador incremental sujeito a throttling.

### 6.3 GPS opcional

- solicitar permissão somente após ação explícita do usuário;
- mostrar estado de aquisição/falha de sinal;
- acumular distância apenas a partir de pontos aceitáveis;
- permitir correção manual da distância antes da finalização;
- nunca bloquear conclusão quando GPS estiver indisponível;
- manter latitude/longitude somente em memória durante a sessão;
- descartar todos os pontos ao finalizar, cancelar ou abandonar a medição;
- nunca gravar coordenadas em banco, analytics, telemetria ou logs.

### 6.4 Critérios configuráveis de GPS

Os limites devem existir em configuração central testável, não espalhados pela UI:

- precisão máxima aceita (`accuracy`);
- intervalo mínimo entre pontos;
- distância mínima entre pontos para reduzir ruído;
- velocidade máxima plausível para corrida;
- descarte de saltos incompatíveis;
- expiração de pontos antigos.

Os valores exatos serão definidos e justificados no Implementation Plan, validados em teste mobile real. Se a precisão não for confiável, GPS permanece experimental e o modo manual continua sendo o caminho principal.

## 7. Rascunho persistente de treino

### 7.1 Identidade do rascunho

Cada rascunho deve possuir:

- `draftId` estável;
- `userId` do usuário autenticado;
- `profileId`;
- `workoutType`;
- `programEnrollmentId`, quando aplicável;
- identidade/versão do plano;
- `createdAt`;
- `updatedAt`;
- chave idempotente de finalização derivada do `draftId`.

A chave lógica de isolamento deve considerar usuário autenticado + perfil + treino + enrollment, quando existir.

### 7.2 Conteúdo preservado

O rascunho deve incluir, quando aplicável:

- academia, data, duração e observação;
- exercício original e alternativa selecionada;
- carga, repetições, RPE, dificuldade e observações;
- séries concluídas;
- exercícios concluídos;
- dados da corrida;
- estado do cronômetro;
- timestamp da última alteração.

### 7.3 Persistência em dois níveis

#### Persistência local

- atualizada imediatamente quando o estado relevante da tela muda;
- não realiza chamada de rede a cada tecla;
- sobrevive a refresh, fechamento da aba e perda de conexão;
- deve falhar de forma visível, sem afirmar que salvou quando o armazenamento local falhar.

#### Auto Save no servidor

O servidor recebe atualização do rascunho somente em eventos importantes:

- conclusão de um exercício;
- troca da alternativa selecionada;
- alteração de observação geral do treino;
- atualização confirmada de distância ou tempo da corrida;
- pausa da corrida;
- finalização da corrida;
- tentativa de finalização do treino.

Alteração isolada de carga, repetição ou campo parcialmente digitado não dispara sincronização remota por si só, mas permanece protegida pela persistência local imediata.

O Auto Save nunca cria uma `workout_session` concluída. Ele atualiza apenas o rascunho correspondente.

### 7.4 Restauração

Quando existir rascunho compatível, apresentar escolha clara:

- **Continuar treino**;
- **Descartar rascunho**.

A restauração de exercícios segue obrigatoriamente esta prioridade:

1. `programExerciseId`, quando existir;
2. identificador estável do exercício original;
3. combinação controlada de exercício original + alternativa selecionada;
4. caso contrário, não restaurar automaticamente aquele exercício.

É proibido mapear por posição no array.

Itens incompatíveis devem permanecer preservados no payload do rascunho e ser apresentados como não aplicados, sem transferência silenciosa de cargas/repetições para outro exercício.

### 7.5 Isolamento e logout

- rascunhos são logicamente isolados por `auth.user.id`;
- um usuário não pode enumerar, abrir ou restaurar rascunhos de outro usuário;
- logout remove da memória todo rascunho carregado;
- o próximo usuário no dispositivo não pode receber indicação nem conteúdo do usuário anterior;
- deve existir ação explícita para “Descartar rascunho neste dispositivo”.

### 7.6 Conflito entre dispositivos

Se existir versão remota mais recente que a local, o sistema deve informar o conflito e oferecer:

- abrir a versão mais recente;
- manter a versão local como novo rascunho, sem sobrescrever silenciosamente a remota;
- cancelar e voltar.

Se a sessão correspondente ao `draftId` já tiver sido finalizada em outro dispositivo, o rascunho local deve ser marcado como concluído/inválido e não poderá criar nova sessão.

Nenhum conflito será resolvido silenciosamente por “last write wins”.

### 7.7 Retenção e limpeza

- retenção padrão: 30 dias após `updatedAt`;
- após 30 dias, o rascunho não é restaurado automaticamente;
- o usuário deve confirmar restauração de rascunho antigo ou descartá-lo;
- limpeza automática pode ocorrer apenas após a janela e sem apagar sessão concluída;
- o rascunho é removido imediatamente somente após salvamento confirmado da sessão correspondente ou descarte explícito;
- falha de rede, erro de validação ou erro de finalização nunca apaga o rascunho.

## 8. Finalização e idempotência

- cada finalização usa chave idempotente vinculada ao `draftId`;
- clique duplo, retry, retorno de offline ou repetição da chamada deve retornar a mesma sessão, não criar outra;
- antes de criar nova sessão, o servidor verifica se o `draftId` já foi consumido;
- rascunho local antigo é invalidado quando a sessão correspondente já existe;
- a limpeza do rascunho acontece somente depois da confirmação persistida da sessão.

## 9. Dados e migração

A implementação deve ser exclusivamente aditiva.

- novos campos/tabelas aceitam ausência de dados antigos;
- sessões históricas sem métricas de corrida permanecem válidas;
- nenhuma migration pode executar `DELETE`, `TRUNCATE` ou atualização em massa do histórico;
- `workout_sessions`, `workout_exercises`, `exercise_records`, `body_measurements` e `progress_photos` não serão regravados;
- o treino F será acrescentado apenas ao plano do perfil Henrique de forma idempotente;
- aplicação repetida da migration/seed não pode criar duplicatas;
- rollback/remediação deve remover somente estruturas novas ainda não consumidas, nunca dados históricos.

## 10. Segurança e privacidade

- RLS obrigatória para qualquer nova tabela persistida no Supabase;
- usuário só acessa rascunhos/métricas de perfis autorizados;
- coordenadas GPS não serão persistidas nesta versão;
- dados de localização não entram em logs;
- inputs de notas continuam sanitizados e limitados;
- IDs de usuário/perfil não podem ser aceitos apenas da UI sem validação de autorização no banco/servidor;
- conflitos e falhas de Auto Save devem produzir logs estruturados sem conteúdo sensível do treino.

## 11. Estados de UX

- carregando treino;
- rascunho encontrado;
- rascunho restaurado;
- rascunho incompatível parcial;
- rascunho antigo;
- conflito entre dispositivos;
- salvo neste dispositivo;
- sincronizado;
- falha ao salvar localmente;
- falha ao sincronizar;
- offline;
- GPS solicitando permissão;
- GPS indisponível/negado;
- cronômetro ativo/pausado;
- finalização em progresso;
- erro de finalização com rascunho preservado;
- sessão já concluída em outro dispositivo;
- sucesso com rascunho removido.

## 12. Requisitos funcionais

- **FR-01:** o ciclo de Henrique deve suportar A→B→C→D→E→F→A.
- **FR-02:** o F deve conter exercícios, alternativas e vídeos conforme a mesma estrutura dos treinos existentes.
- **FR-03:** o E deve aceitar distância e duração manualmente.
- **FR-04:** o sistema deve calcular ritmo médio a partir de distância e duração válidas.
- **FR-05:** o cronômetro deve sobreviver à atualização da página.
- **FR-06:** GPS deve ser opcional e possuir fallback manual.
- **FR-07:** alterações do treino em andamento devem ser persistidas localmente sem depender do Auto Save remoto.
- **FR-08:** o Auto Save remoto ocorre apenas nos eventos importantes definidos na seção 7.3.
- **FR-09:** refresh/reabertura deve recuperar o rascunho do usuário/perfil/treino correto.
- **FR-10:** finalizar com sucesso deve limpar apenas o rascunho correspondente.
- **FR-11:** falha de finalização deve preservar o rascunho.
- **FR-12:** dados anteriores devem continuar legíveis sem backfill obrigatório.
- **FR-13:** nenhuma sessão pode ser duplicada por retry, clique duplo ou conflito entre dispositivos.
- **FR-14:** mudança de plano deve usar restauração determinística, nunca posição no array.
- **FR-15:** outro usuário no mesmo dispositivo não pode acessar rascunho anterior.

## 13. Critérios de aceite

- **AC-01:** dado um treino parcialmente preenchido, quando a página for atualizada, cargas, repetições, séries e exercícios concluídos reaparecem.
- **AC-02:** digitar carga/repetição atualiza a cópia local sem disparar requisição remota por tecla.
- **AC-03:** concluir um exercício dispara Auto Save remoto do rascunho.
- **AC-04:** dado um erro de rede na finalização, o usuário recebe erro e o rascunho permanece disponível.
- **AC-05:** dado um treino salvo com sucesso, o rascunho correspondente é removido e a sessão aparece uma única vez no histórico.
- **AC-06:** um usuário não consegue restaurar ou enumerar rascunho de outro usuário ou perfil não autorizado.
- **AC-07:** é possível concluir corrida com distância e tempo manuais e o ritmo calculado corretamente.
- **AC-08:** pausar, atualizar a página e continuar o cronômetro não adiciona tempo do período pausado.
- **AC-09:** negar GPS não impede registro manual nem conclusão da corrida.
- **AC-10:** nenhuma coordenada de localização aparece no banco, telemetria ou logs.
- **AC-11:** o treino F aparece após E apenas para o plano de Henrique.
- **AC-12:** alternativas e vídeos do F funcionam como nos demais treinos.
- **AC-13:** históricos A–E anteriores permanecem inalterados e acessíveis.
- **AC-14:** migration e seed são idempotentes e não criam treino/exercícios duplicados.
- **AC-15:** quando o plano mudar, dados só são aplicados pelos identificadores definidos; itens incompatíveis são informados e não remapeados.
- **AC-16:** quando outro dispositivo já tiver concluído o mesmo `draftId`, nova finalização não cria duplicata.
- **AC-17:** quando existir versão remota mais recente, o usuário recebe opções explícitas e nenhuma versão é sobrescrita silenciosamente.
- **AC-18:** após logout, outro usuário no aparelho não consegue visualizar nem restaurar o rascunho anterior.
- **AC-19:** rascunho com mais de 30 dias exige confirmação antes de restauração e pode ser descartado com segurança.

## 14. Evidências obrigatórias

- testes unitários de cálculo de ritmo e cronômetro;
- testes dos filtros/configurações de GPS;
- testes de serialização/restauração do rascunho;
- teste de isolamento por usuário/perfil;
- teste de logout em dispositivo compartilhado;
- teste de compatibilidade após mudança do plano;
- teste de conflito entre dois dispositivos/duas versões;
- teste de retenção de 30 dias;
- teste de refresh durante treino;
- teste offline e erro de finalização;
- teste de clique duplo/idempotência por `draftId`;
- teste da migration em cópia/ambiente isolado;
- consultas antes/depois comprovando preservação de histórico;
- revisão mobile do E e F;
- validação manual dos vídeos e alternativas;
- revisão adversarial aprovada antes da implementação.

## 15. Regra permanente do produto

> Nenhuma informação digitada pelo usuário durante um treino poderá ser perdida por atualização da página, fechamento acidental da aplicação ou perda temporária de conexão.
