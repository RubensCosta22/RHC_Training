# RHCT-TRAIN-001 — Adversarial Review

## Resultado

- **Status:** RETURN TO REVIEW
- **Blocker:** 0
- **Major:** 3
- **Minor:** 2

## Major 1 — Persistência apenas local pode conflitar entre dispositivos

A Spec define cópia local para sobreviver a refresh/offline, mas não define claramente o comportamento quando o mesmo treino é aberto em dois dispositivos.

### Risco

- dispositivo A possui rascunho antigo;
- dispositivo B finaliza o treino;
- dispositivo A reabre e oferece restaurar conteúdo já concluído;
- nova finalização pode duplicar sessão ou sobrescrever intenção do usuário.

### Correção exigida

- cada rascunho deve possuir `draftId`, `updatedAt`, `userId`, `profileId`, `workoutType` e identificador/versionamento do plano;
- antes de finalizar, verificar se já existe sessão equivalente criada pelo mesmo `draftId` ou chave idempotente;
- rascunho local antigo deve ser invalidado quando a sessão correspondente já tiver sido concluída;
- conflitos entre dispositivos devem ser apresentados ao usuário, nunca resolvidos silenciosamente.

## Major 2 — Limpeza no logout está ambígua

A frase “quando a política de segurança exigir” não define o comportamento real.

### Risco

Em dispositivo compartilhado, outro membro da família pode entrar e encontrar o rascunho anterior no armazenamento local.

### Correção exigida

- o rascunho deve ser criptograficamente/logicamentе separado pelo `auth.user.id`;
- logout deve remover da memória todos os rascunhos carregados;
- rascunhos locais do usuário anterior não podem ser enumerados/restaurados por outro usuário;
- definir retenção local e ação explícita “descartar rascunho neste dispositivo”.

## Major 3 — Compatibilidade parcial precisa de regra determinística

A Spec permite restauração parcial quando o plano muda, mas não define como mapear exercícios.

### Risco

Mapeamento apenas por nome pode aplicar carga/repetições ao exercício errado, principalmente após troca de alternativa ou alteração de seed.

### Correção exigida

A restauração deve seguir esta prioridade:

1. `programExerciseId`, quando existir;
2. identificador estável do exercício original;
3. combinação controlada de exercício original + alternativa selecionada;
4. caso contrário, não restaurar aquele exercício automaticamente.

Itens não aplicados devem ser listados ao usuário. Nunca mapear por posição no array.

## Minor 1 — Retenção não definida

Definir retenção padrão do rascunho, recomendação inicial: 7 dias após a última alteração. Depois disso, solicitar confirmação antes de restaurar ou remover automaticamente conforme decisão de produto.

## Minor 2 — GPS deve ter critério mínimo explícito

Definir limites configuráveis para:

- `accuracy` máxima aceita;
- intervalo mínimo entre pontos;
- velocidade máxima plausível;
- distância mínima para reduzir ruído;
- descarte automático de pontos antigos após finalizar/cancelar.

Os valores devem ser tratados como configuração testável, não números espalhados pela UI.

## Conclusão

A direção da Feature é válida e compatível com R2, mas a Spec não deve sair de Draft até incorporar:

- idempotência por rascunho e conflito entre dispositivos;
- isolamento e limpeza de sessão local;
- regra determinística de compatibilidade de exercícios;
- retenção e critérios mínimos de GPS.
