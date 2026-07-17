# Meu Treino

App web mobile-first para treino A/B/C de Henrique e Nicole, com progresso salvo na nuvem, Supabase Auth, PostgreSQL com RLS, fotos privadas de evolução via Supabase Storage, gráficos com Recharts e PWA.


## Atualização aplicada nesta versão

Esta versão parte do projeto GPT, mas incorpora ideias visuais do Gemini e corrige os pontos fracos encontrados na comparação:

- Tema visual ajustado para verde/emerald, com cards mais destacados, header fixo, badge de status Online/Offline e indicador de segurança.
- Dashboard com botões diretos para Treino A, Treino B, Treino C, Histórico, Evolução, Medidas e Fotos.
- Alternativas de exercícios agora são botões funcionais: ao escolher uma alternativa, o treino salva o exercício substituto e o botão “Ver execução” abre o YouTube com o nome escolhido.
- Tela de treino ganhou campo “Reps feitas”, usado para uma progressão automática mais precisa.
- Progressão automática agora considera se a pessoa bateu o topo da faixa de repetições antes de sugerir aumento de carga.
- Histórico, CSV e JSON agora carregam também as reps feitas.
- PWA recebeu ícones PNG 192x192 e 512x512, além do SVG.
- `npm run build` foi testado com sucesso.

## Stack

- React + Vite
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage privado
- Recharts
- lucide-react
- Vite PWA Plugin
- Deploy preparado para Vercel

## Segurança do projeto

Este projeto foi montado com segurança como requisito principal:

- Não existe `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- O frontend usa apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- `.env` está no `.gitignore`.
- `.env.example` não contém chaves reais.
- Todas as tabelas têm RLS ativo.
- As políticas RLS separam `SELECT`, `INSERT`, `UPDATE` e `DELETE`.
- Cada usuário só acessa linhas em que `auth.uid() = user_id`.
- Tabelas relacionadas validam ownership de `profile_id` ou `session_id`.
- O bucket `progress-photos` é privado.
- Fotos usam path obrigatório `user_id/profile_id/data/tipo-foto.jpg`.
- O app usa signed URLs temporárias para exibir fotos privadas.
- Rotas internas usam `ProtectedRoute`.
- Campos de texto são sanitizados no frontend e têm checks básicos no banco.
- O frontend mostra erros amigáveis, sem stack trace ou SQL bruto.

## 1. Criar projeto Supabase

1. Acesse Supabase e crie um projeto.
2. Vá em **SQL Editor**.
3. Copie e execute o arquivo:

```bash
supabase/schema.sql
```

Esse SQL cria tabelas, índices, RLS, políticas e o bucket privado `progress-photos`.

Para um banco que ja possui perfis e progresso, nao execute novamente o schema
completo. Execute somente as migrations novas, em ordem. A migration atual e:

```text
supabase/migrations/20260717190000_v1_data_safety.sql
supabase/migrations/20260717210000_archived_items_restore.sql
```

Elas preservam todos os registros existentes e adicionam o salvamento transacional,
a importacao idempotente de backup, a estrutura de telemetria e o arquivamento
reversivel de treinos, medidas e fotos.

## 2. Configurar Auth no Supabase

Em **Authentication > Providers**:

1. Ative **Email**.
2. Ative **Google** se quiser login social.
3. Configure o OAuth do Google com o Client ID e Client Secret.

Em **Authentication > URL Configuration**:

Durante desenvolvimento:

```text
Site URL: http://localhost:5173
Redirect URLs: http://localhost:5173/**
```

Em produção, depois do deploy:

```text
Site URL: https://sua-url.vercel.app
Redirect URLs: https://sua-url.vercel.app/**
```

Use apenas a URL final do Vercel em produção.

## 3. Variáveis de ambiente

Copie o exemplo:

```bash
cp .env.example .env
```

Preencha somente com as chaves públicas do Supabase:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no `.env` do frontend.

## 4. Rodar localmente

```bash
npm install
npm run dev
```

Acesse:

```text
http://localhost:5173
```

## 5. Build

```bash
npm run build
```

## 6. Subir no GitHub

```bash
git init
git add .
git commit -m "Meu Treino TotalPass"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/meu-treino-totalpass.git
git push -u origin main
```

Se o repositório já existir:

```bash
git remote -v
git add .
git commit -m "Atualiza app Meu Treino TotalPass"
git push
```

## 7. Publicar no Vercel

1. Acesse a Vercel.
2. Clique em **Add New Project**.
3. Importe o repositório do GitHub.
4. Configure as variáveis:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

5. Framework: **Vite**.
6. Build command:

```bash
npm run build
```

7. Output directory:

```bash
dist
```

8. Faça o deploy.
9. Volte no Supabase e ajuste as URLs de Auth para o domínio final da Vercel.

## Publicar no Render

O arquivo `render.yaml` inclui o rewrite `/*` para `/index.html`, necessario para
que atualizar ou abrir diretamente uma rota do React nao retorne 404.

Se o site ja foi criado manualmente no painel do Render, adicione em
**Redirects/Rewrites** uma regra com:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

## 8. Como o progresso é mantido em outro celular

O progresso fica salvo no Supabase, vinculado ao usuário autenticado. Ao entrar com a mesma conta em outro celular, o app carrega perfis, treinos, cargas, medidas e fotos do banco.

O modo offline salva treinos temporariamente no `localStorage`. Quando a internet volta, o app tenta sincronizar com o Supabase.

## 9. Estrutura de pastas

```bash
src/
├── components/
│   ├── BottomNav.jsx
│   ├── DashboardCard.jsx
│   ├── ExerciseCard.jsx
│   ├── ProfileCard.jsx
│   ├── RestTimer.jsx
│   ├── TopBar.jsx
│   └── ProtectedRoute.jsx
├── data/
│   └── workouts.js
├── lib/
│   └── supabaseClient.js
├── pages/
│   ├── Login.jsx
│   ├── Profiles.jsx
│   ├── Dashboard.jsx
│   ├── Workout.jsx
│   ├── History.jsx
│   ├── Progress.jsx
│   ├── Measurements.jsx
│   ├── Photos.jsx
│   └── Settings.jsx
├── services/
│   ├── workoutService.js
│   ├── profileService.js
│   ├── measurementService.js
│   ├── photoService.js
│   └── backupService.js
├── utils/
│   ├── progression.js
│   ├── storage.js
│   ├── csvExport.js
│   ├── validation.js
│   └── youtube.js
├── App.jsx
└── main.jsx
```

## 10. Checklist antes de publicar

- [ ] SQL executado no Supabase.
- [ ] RLS ativado em todas as tabelas.
- [ ] Bucket `progress-photos` privado.
- [ ] Google Auth configurado, se for usar Google.
- [ ] `.env` local preenchido e nunca commitado.
- [ ] Variáveis configuradas na Vercel.
- [ ] URL final da Vercel configurada no Supabase Auth.
- [ ] Testado login em outro navegador/celular.
- [ ] Testado upload de foto e signed URL.
- [ ] Testado finalizar treino offline e sincronizar ao voltar internet.
- [ ] Conferido se `workout_exercises.actual_reps` existe no banco caso você esteja atualizando uma instalação antiga.
