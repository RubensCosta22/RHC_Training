# RHCT-AI-001 — Assistente de treino com Gemini

## Escopo inicial

- API Route autenticada `POST /api/ai/training`.
- Intenções: `suggest_workout` e `analyze_progress`.
- Leitura do perfil e histórico usando o JWT do usuário e as políticas RLS existentes.
- Resposta estruturada e somente consultiva; nenhuma gravação automática em planos ou histórico.

## Segurança e privacidade

- `GEMINI_API_KEY` existe apenas no ambiente do servidor.
- O Free Tier do Gemini pode usar entradas e saídas para melhoria de produtos; por isso o modelo não recebe dados pessoais ou sensíveis.
- O modelo não recebe nome, e-mail, UUID, nascimento, idade, gênero, peso corporal, medidas, anotações livres ou datas exatas.
- O contexto é limitado a objetivo, dias relativos, frequência, volume, conclusão, exercícios e planos disponíveis.
- O token do Supabase é validado com `auth.getUser()`; as consultas usam o mesmo JWT e respeitam RLS.
- Respostas não são cacheadas e não são persistidas nesta fase.

## Contenção do nível gratuito

- Modelo padrão: `gemini-2.5-flash`, configurável por `GEMINI_MODEL`.
- Até 30 sessões e 6 planos por solicitação.
- Saída limitada a 1.800 tokens e timeout de 15 segundos.
- Limite de aplicação: 10 solicitações por usuário/hora por instância. Uma cota distribuída exigirá armazenamento compartilhado em fase posterior.

## Critérios de aceite

- Requisições sem JWT retornam 401.
- Um usuário não consegue consultar perfil fora do alcance das políticas RLS.
- Chave Gemini nunca é enviada ao navegador.
- A resposta segue o schema definido e diferencia evidências de inferências.
- Falhas de cota e indisponibilidade apresentam mensagens seguras, sem vazar payloads ou segredos.
