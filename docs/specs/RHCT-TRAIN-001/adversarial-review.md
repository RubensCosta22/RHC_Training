# RHCT-TRAIN-001 — Adversarial Review

## Resultado

- **Status:** APPROVE
- **Blocker:** 0
- **Major:** 0
- **Minor:** 0
- **Spec revisada:** v1.1

## Findings anteriores e resolução

### Major 1 — Conflito entre dispositivos

**Resolvido.**

A Spec agora exige:

- `draftId` estável e chave idempotente de finalização;
- `updatedAt`, usuário, perfil, treino, enrollment e versão do plano;
- detecção de versão remota mais recente;
- opções explícitas ao usuário;
- proibição de resolução silenciosa por last-write-wins;
- invalidação do rascunho local quando o mesmo `draftId` já tiver sido concluído.

### Major 2 — Isolamento e logout

**Resolvido.**

A Spec agora exige:

- isolamento lógico por `auth.user.id` + perfil + treino + enrollment;
- remoção do rascunho carregado da memória no logout;
- impossibilidade de enumeração/restauração por outro usuário no mesmo dispositivo;
- ação explícita para descarte no dispositivo;
- teste obrigatório de aparelho compartilhado.

### Major 3 — Compatibilidade após mudança de plano

**Resolvido.**

A restauração passa a usar ordem determinística:

1. `programExerciseId`;
2. identificador estável do exercício original;
3. combinação controlada de exercício original e alternativa;
4. nenhum mapeamento automático quando não houver correspondência segura.

A Spec proíbe mapeamento por posição e exige informar itens não aplicados.

### Minor 1 — Retenção

**Resolvido.**

Retenção definida em 30 dias após `updatedAt`. Rascunhos antigos não são restaurados automaticamente e exigem confirmação do usuário.

### Minor 2 — Critérios de GPS

**Resolvido.**

A Spec exige configuração central testável para precisão, intervalo, distância mínima, velocidade plausível, saltos incompatíveis e expiração de pontos. Coordenadas permanecem somente em memória e são descartadas ao finalizar ou cancelar.

## Revisão da decisão final de Auto Save

A decisão do owner foi incorporada corretamente:

- persistência local imediata protege qualquer edição relevante contra refresh/offline;
- sincronização remota não ocorre por tecla;
- Auto Save remoto acontece apenas em eventos importantes, com destaque para conclusão de exercício, troca de alternativa, observações confirmadas e eventos de corrida;
- Auto Save atualiza somente o rascunho e nunca cria sessão concluída;
- finalização permanece idempotente por `draftId`.

Essa divisão reduz gravações desnecessárias sem enfraquecer a garantia de recuperação.

## Riscos residuais aceitos

- GPS em navegador pode apresentar precisão inferior a aplicativo nativo e pode sofrer limitação em segundo plano. O modo manual continua obrigatório e GPS pode permanecer experimental conforme evidência mobile.
- Sincronização entre dispositivos adiciona complexidade, mas os critérios de conflito e idempotência estão definidos e são testáveis.

## Veredito

A Spec v1.1 define comportamento, segurança, preservação de dados, UX, conflitos, retenção, idempotência e evidências suficientes para uma Feature R2.

**APPROVE — Ready for Implementation Plan.**
