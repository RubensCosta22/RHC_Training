# Auditoria AppSec — RHC Training

Data: 2026-07-24

## Resumo executivo

A aplicação possui boa base de segurança para o stack React/Vite + Supabase + Vercel: RLS, bucket privado, signed URLs, validação de imagem por assinatura binária, CSP/HSTS, CI de segurança, Dependabot e logging sanitizado. Esta revisão encontrou lacunas residuais principalmente em validação de entradas de autenticação/RPC, importação de backup, expiração por inatividade e configuração externa de MFA/redirects/WAF.

As correções deste PR são aditivas e não alteram tabelas nem apagam dados. Treinos offline pendentes passam a ser preservados no logout para que a nova expiração por inatividade não provoque perda de dados.

## Matriz de auditoria

| Item | Status atual | Risco | Ação tomada |
|---|---|---|---|
| SQL parametrizado / sem concatenação de input em SQL | Protegido | Baixo | Cliente usa Supabase query builder/RPC. Schema revisado não constrói SQL a partir de input do usuário. Manter revisão obrigatória para novas RPCs/dynamic SQL. |
| Validação/sanitização de inputs | Melhorado | Médio -> Baixo | Adicionados `normalizeEmail`, `validateUuid`, `Number.isFinite`, limites de email/senha e validação antes de Auth/RPCs familiares. |
| Escape XSS em HTML | Protegido | Baixo | React escapa texto por padrão; não foi encontrado uso de `dangerouslySetInnerHTML`, `innerHTML` ou `document.write`. Sanitização existente permanece como defesa adicional. |
| CSP | Melhorado | Baixo | CSP já existia. Adicionados `script-src-attr 'none'`, `frame-src 'none'` e política explícita de mídia. |
| HTTPS / HSTS | Protegido | Baixo | HSTS configurado no `vercel.json`; Vercel fornece HTTPS/TLS. |
| Hash de senhas | Protegido pelo provedor | Baixo | Senhas são gerenciadas pelo Supabase Auth, não pelo app. Não existe armazenamento de senha no repositório. |
| Secrets / `.env` | Protegido com ação operacional | Médio residual | `.env` ignorado; frontend usa somente URL + chave pública/anon. Rotacionar qualquer secret com histórico de exposição e nunca versionar `service_role`. |
| Buckets/endpoints/backups públicos | Protegido | Baixo | `progress-photos` é privado, com RLS e signed URLs. Import/export de backup exige sessão/perfil via RPC/RLS. |
| Rate limiting de login | Protegido pelo provedor, configuração externa | Médio residual | Supabase Auth possui rate limits; confirmar valores no Dashboard. Não confiar em throttling apenas no browser. |
| Rate limiting de uploads | Protegido | Baixo | Edge Function chama `enforce_security_rate_limit`. |
| Timeout / Slowloris | Proteção de plataforma | Baixo | App é estático na Vercel e Edge Functions ficam no Supabase; mitigação de conexões lentas é responsabilidade das plataformas. |
| Limites/tipo de upload | Protegido | Baixo | Limites de bytes, dimensões/pixels e inspeção real de JPEG/PNG/WebP antes do armazenamento. |
| ReDoS | Sem padrão perigoso encontrado | Baixo | Regex atuais são curtas/ancoradas e sem combinações conhecidas de backtracking catastrófico. |
| CDN / DDoS / WAF | Parcialmente protegido | Médio residual | Vercel fornece CDN/firewall/DDoS. Configurar WAF custom rule/Attack Challenge conforme necessidade. |
| Cookies HttpOnly/Secure/SameSite | Não aplicável ao modelo atual | Médio residual | SPA Supabase usa sessão JS/Web Storage, não cookie de sessão próprio. CSP/XSS é especialmente importante. Migrar para BFF/SSR com cookie HttpOnly apenas se o modelo de ameaça exigir. |
| CSRF | Baixo / não aplicável ao bearer token | Baixo | Chamadas autenticadas usam JWT no cliente, não cookie ambiente. `form-action 'self'` e Same-Origin ajudam. Reavaliar se futuramente usar cookies de sessão. |
| MFA | Disponível, não comprovadamente exigido | Alto para admin | Supabase suporta TOTP. Habilitar/enforçar MFA para administrador no Supabase e, idealmente, policies/RPCs administrativas exigindo AAL2. |
| Expiração por inatividade | Corrigido | Médio -> Baixo | `ProtectedRoute` encerra a sessão após 60 minutos sem atividade. |
| Logout / troca de senha | Melhorado | Médio -> Baixo | Logout invalida sessão e limpa preferências; agora preserva treinos offline pendentes vinculados ao `ownerUserId`. |
| Dependências / CVEs | Automatizado | Médio residual | Security CI executa testes, build e `npm audit --omit=dev --audit-level=high`; Dependabot monitora dependências. |
| DNS/subdomain takeover | Não verificável só pelo código | Alto se houver host órfão | Remover redirects/domínios antigos. O README menciona `rhc-training.onrender.com`; não deixar esse host autorizado no Supabase se não estiver ativo e sob controle. |
| Execução de scripts via upload | Protegido | Baixo | Upload aceita apenas imagem validada por assinatura binária e gera extensão própria; não usa nome/extensão fornecidos pelo usuário. |
| Importação de backup | Melhorado | Médio -> Baixo | MIME/extensão JSON validados, limite 10 MB preservado, profundidade limitada e chaves de prototype pollution rejeitadas. |
| Cache de telas de autenticação | Melhorado | Baixo | `/login`, `/reset-password` e `index.html` recebem `Cache-Control: no-store`. |
| Indexação por buscadores | Melhorado | Baixo | Adicionado `X-Robots-Tag: noindex, nofollow, noarchive`, adequado ao app privado. |

## Correções implementadas neste PR

1. **Entradas de autenticação e RPC**
   - Normalização de e-mail (`trim`, lowercase, tamanho máximo e formato).
   - Validação de UUID antes de RPC sensível de associação de perfil.
   - Senha de cadastro passa a exigir a mesma política de 8+ caracteres, maiúscula, minúscula e número usada na troca de senha.
   - Campos numéricos rejeitam `Infinity` e outros números não finitos.

2. **Importação de backup**
   - Mantido limite de 10 MB e 5.000 registros por coleção.
   - Exigido arquivo JSON compatível.
   - Rejeitadas chaves `__proto__`, `prototype` e `constructor`.
   - Estruturas com profundidade excessiva são rejeitadas antes da RPC.

3. **Sessão**
   - Logout automático após 60 minutos sem interação.
   - Falhas no encerramento são registradas sem expor dados sensíveis.
   - Treinos offline pendentes não são apagados no logout; continuam vinculados ao `ownerUserId` e a sincronização já rejeita owner divergente.

4. **Headers de navegador**
   - CSP endurecida contra event handlers inline e iframes.
   - `X-Robots-Tag` para impedir indexação do app privado.
   - `Cache-Control: no-store` explícito em login e recuperação de senha.

## Itens externos obrigatórios

Estes pontos não podem ser confirmados ou impostos apenas pelo repositório:

- Supabase Auth: revisar rate limits, confirmação de e-mail, Site URL e Redirect URLs.
- Supabase: habilitar MFA/TOTP na conta administrativa e exigir AAL2 em operações administrativas sensíveis quando possível.
- Vercel: revisar Firewall/WAF e configurar custom rules para tráfego abusivo/credential stuffing se necessário.
- DNS: listar todos os domínios/subdomínios e remover CNAME/A/AAAA de serviços desativados.
- Remover `rhc-training.onrender.com` de redirects autorizados caso o serviço antigo não esteja ativo e sob controle.
- Secrets: revisar GitHub/Vercel/Supabase e rotacionar qualquer credencial cuja exposição histórica seja incerta.

## Ferramentas complementares recomendadas

- **GitHub Dependabot**: já presente; manter ativo.
- **npm audit**: já executado no Security CI para vulnerabilidades altas/críticas em produção.
- **CodeQL**: adicionar análise estática JavaScript/TypeScript ao GitHub Actions.
- **Semgrep**: rulesets OWASP/React/JavaScript para detectar sinks XSS, secrets e padrões inseguros.
- **Gitleaks**: escanear commits e PRs em busca de secrets acidentalmente versionados.
- **OWASP ZAP Baseline**: executar contra ambiente de preview/produção controlado para headers, XSS refletido e misconfigurações HTTP.
- **Vercel Firewall/WAF**: monitorar credential stuffing e habilitar Challenge Mode em ataque.
- **Supabase Security Advisor**: revisar RLS/functions/grants após migrations.

## Risco residual

A maior lacuna residual é operacional: **MFA administrativo/AAL2 e redirects externos precisam ser confirmados no Supabase**, e **DNS/subdomínios precisam ser verificados na conta do provedor de DNS**. O código não consegue provar sozinho que essas configurações estão corretas em produção.
