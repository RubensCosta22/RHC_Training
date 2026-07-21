# Auditoria final de segurança — RHC Training

## Escopo

Este documento encerra a etapa de hardening do RHC Training após as correções de autorização, sessão, estado local, headers, backups operacionais e controles de navegador consolidados até o PR #31.

O PR #32 adiciona controles operacionais contínuos: CI, auditoria de dependências, Dependabot e procedimentos formais para configuração segura do Supabase, backup/restauração, rotação de secrets, MFA administrativo e resposta a incidentes.

## Matriz OWASP Top 10 — avaliação final

| Categoria | Situação final | Controles principais | Risco residual |
|---|---|---|---|
| A01 Broken Access Control | Mitigado com risco residual | RLS, isolamento por perfil/usuário, controles administrativos e revisão de policies | Erro futuro de policy ou migration pode reintroduzir acesso indevido |
| A02 Cryptographic Failures | Mitigado no escopo da aplicação | TLS gerenciado pela plataforma, secrets fora do frontend, procedimentos de rotação | Dependência da configuração correta dos provedores e armazenamento de backups |
| A03 Injection | Baixo | Cliente Supabase parametrizado, ausência de construção manual insegura de SQL no frontend, revisão de funções | Novas RPCs/SQL dinâmico devem ser revisados antes de merge |
| A04 Insecure Design | Mitigado | Separação usuário/admin, menor privilégio, fluxos privados por perfil, documentação operacional | Mudanças de produto podem introduzir novos trust boundaries |
| A05 Security Misconfiguration | Mitigado com ação manual pendente | Headers, checklist Supabase, redirects restritos, revisão Auth/OAuth/MFA | Configurações do painel Supabase não são garantidas pelo código |
| A06 Vulnerable and Outdated Components | Monitorado | GitHub Actions com `npm audit`, Dependabot npm e GitHub Actions | Vulnerabilidades sem correção disponível ou transitivas podem permanecer temporariamente |
| A07 Identification and Authentication Failures | Mitigado com ação manual pendente | Supabase Auth, sessão endurecida, confirmação de e-mail/OAuth documentados, MFA admin requerido | MFA e políticas de Auth precisam ser confirmados manualmente no painel |
| A08 Software and Data Integrity Failures | Mitigado | lockfile, `npm ci`, CI reproduzível, revisão por PR | Actions de terceiros continuam sendo dependência de cadeia de suprimentos |
| A09 Security Logging and Monitoring Failures | Parcialmente mitigado | Procedimento de incidentes e revisão de logs | Não há SIEM/alerta dedicado; monitoramento depende das plataformas usadas |
| A10 Server-Side Request Forgery | Baixo/no escopo atual | Aplicação cliente sem função genérica de fetch server-side controlada pelo usuário | Reavaliar caso sejam adicionadas Edge Functions/proxies que busquem URLs externas |

## Controles automatizados pelo PR #32

- CI em PRs e pushes para `Rcosta22`.
- Instalação reproduzível via `npm ci`.
- Execução de testes automatizados.
- Build de produção.
- `npm audit --omit=dev --audit-level=high` como bloqueio para vulnerabilidades altas/críticas em dependências de produção.
- Dependabot semanal para npm.
- Dependabot mensal para GitHub Actions.

## Controles manuais obrigatórios após merge

1. Revisar `Site URL` e `Redirect URLs` no Supabase Auth.
2. Remover redirects genéricos ou ambientes antigos de produção.
3. Validar confirmação de e-mail conforme o fluxo definitivo.
4. Revisar provedores OAuth e callbacks.
5. Habilitar MFA na conta administrativa.
6. Validar política de backup disponível no plano atual e executar teste de restauração em ambiente isolado.
7. Revisar secrets de produção e registrar uma rotação inicial se houver qualquer dúvida sobre histórico de exposição.

## Riscos residuais

- Configurações externas do Supabase/Auth não podem ser impostas pelo repositório.
- O plano contratado do Supabase determina recursos de backup/PITR disponíveis.
- Dependências podem receber vulnerabilidades entre duas execuções do CI/Dependabot.
- Mudanças futuras em RLS, RPCs, funções privilegiadas ou regras administrativas exigem nova revisão de autorização.
- A aplicação ainda depende da segurança operacional das contas GitHub, Supabase e do provedor de hospedagem.

## Nota de segurança

**Classificação final: 8,8/10 — boa postura de segurança para o escopo atual, condicionada à conclusão do checklist manual pós-merge.**

A nota não representa certificação de segurança nem ausência de vulnerabilidades. Ela reflete a maturidade dos controles observados no escopo da auditoria e deve ser revista quando houver mudanças relevantes de arquitetura, autenticação, infraestrutura ou modelo de autorização.

## Critério de encerramento

A auditoria é considerada encerrada quando:
- o CI do PR #32 estiver verde;
- o PR #32 estiver mergeado;
- o checklist manual do Supabase/Auth/MFA tiver sido executado;
- existir ao menos um teste documentado de restauração ou uma limitação explícita do plano atual;
- não houver vulnerabilidade alta/crítica conhecida e explorável sem plano de mitigação.
