# Segurança operacional — RHC Training

## 1. Checklist seguro do Supabase

Executar e registrar evidência após cada mudança relevante de ambiente.

### Auth
- Confirmar `Site URL` apontando apenas para o domínio oficial da aplicação.
- Manter em `Redirect URLs` somente URLs necessárias e conhecidas; remover curingas amplos em produção.
- Habilitar confirmação de e-mail para novos cadastros quando o fluxo de produto permitir.
- Revisar provedores OAuth ativos e manter somente os realmente utilizados.
- Validar, em cada provedor OAuth, os callback/redirect URIs exatos do projeto.
- Habilitar MFA para a conta administrativa e exigir MFA para qualquer novo administrador.
- Revisar periodicamente usuários administrativos e revogar acessos não utilizados.

### Database e RLS
- Manter RLS habilitado em tabelas expostas ao cliente.
- Revisar policies após qualquer migration de autorização.
- Nunca usar `service_role` no frontend.
- Confirmar que funções `SECURITY DEFINER` possuem `search_path` controlado e grants mínimos.

### Storage
- Manter buckets privados quando o conteúdo não for público por definição.
- Validar policies de upload, leitura, atualização e exclusão por identidade/perfil.
- Evitar caminhos previsíveis que permitam enumeração entre usuários.

### Chaves e ambiente
- Publicar no frontend somente a URL do projeto e a chave pública/anon apropriada.
- Nunca versionar `service_role`, senhas, tokens pessoais ou credenciais de provedores.
- Manter secrets somente no provedor de hospedagem/Supabase/GitHub Secrets conforme a finalidade.

## 2. Backup e restauração

### Backup
1. Antes de migrations de alto risco, gerar backup/export lógico compatível com o plano do Supabase.
2. Registrar data, responsável, ambiente, versão do schema e migration alvo.
3. Armazenar a cópia em local restrito, fora do repositório Git.
4. Proteger o arquivo com controle de acesso e, quando possível, criptografia em repouso.
5. Definir retenção mínima operacional e excluir backups antigos de forma controlada.

### Teste de restauração
1. Nunca testar restauração diretamente em produção.
2. Criar ambiente isolado de teste.
3. Restaurar schema e dados do backup selecionado.
4. Executar smoke tests: autenticação, leitura do perfil, treino, histórico e operações administrativas.
5. Conferir RLS/policies após a restauração.
6. Registrar resultado, duração, falhas e ações corretivas.

### Antes de uma restauração real
- Congelar alterações de schema.
- Confirmar ponto de recuperação desejado.
- Criar um backup adicional do estado atual sempre que possível.
- Documentar impacto esperado e janela operacional.

## 3. Rotação de secrets

Aplicar imediatamente em caso de exposição suspeita e periodicamente para credenciais administrativas.

1. Identificar o secret e todos os consumidores.
2. Gerar nova credencial antes de revogar a anterior, quando o provedor permitir rotação sem indisponibilidade.
3. Atualizar o secret no provedor correto (hospedagem, Supabase, GitHub ou OAuth).
4. Fazer deploy e validar autenticação/integrações.
5. Revogar a credencial antiga.
6. Revisar logs em busca de uso após a revogação.
7. Registrar data, motivo e responsável sem registrar o valor do secret.

Se `service_role` ou credencial com alto privilégio for exposta, tratar como incidente de severidade alta.

## 4. Validação de OAuth, redirects e e-mail

Após configuração manual:
- login por senha funciona somente nos fluxos previstos;
- confirmação de e-mail, se habilitada, impede uso prematuro da conta;
- links de confirmação/reset retornam exclusivamente ao domínio permitido;
- OAuth não aceita redirect arbitrário;
- logout invalida a sessão local esperada;
- conta administrativa usa MFA;
- provedores desnecessários permanecem desativados.

## 5. Resposta a incidentes

### Detecção e classificação
Classificar rapidamente o incidente:
- **Crítico:** vazamento de `service_role`, acesso administrativo indevido, exposição ampla de dados.
- **Alto:** bypass de autorização/RLS, takeover de conta, secret de produção comprometido.
- **Médio:** exposição limitada sem privilégio elevado, falha de configuração com mitigação imediata.
- **Baixo:** evento sem impacto confirmado ou vulnerabilidade sem exploração conhecida.

### Contenção
- Revogar sessões, tokens ou secrets comprometidos.
- Desabilitar temporariamente integração/fluxo vulnerável quando necessário.
- Preservar logs e evidências.
- Evitar alterações destrutivas antes de capturar evidência mínima.

### Erradicação e recuperação
- Corrigir causa raiz.
- Rotacionar credenciais relacionadas.
- Revisar permissões, RLS e usuários administrativos.
- Restaurar dados somente quando necessário e após validação.
- Monitorar comportamento anômalo após a correção.

### Pós-incidente
Registrar linha do tempo, impacto, causa raiz, controles que falharam, correções aplicadas e ações preventivas. Nunca incluir secrets no relatório.
