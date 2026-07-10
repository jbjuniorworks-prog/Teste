# Financeiro

App de controle financeiro pessoal (React + Supabase), mobile-first — funciona como um app de celular também quando aberto no navegador desktop (coluna centralizada, sem virar dashboard largo).

## Stack

- React 19 + Create React App (react-scripts 5)
- React Router v7 (rotas + `Outlet` context pra compartilhar dados entre Dashboard/Transações/Objetivos)
- Supabase (Postgres com Row Level Security, Auth, Edge Functions)
- Pluggy (conexão bancária, via Supabase Edge Functions)

## Setup

1. Instale as dependências:
   ```
   npm install
   ```
2. Copie `.env.example` para `.env.development.local` e preencha com as credenciais do seu projeto Supabase:
   ```
   REACT_APP_SUPABASE_URL=
   REACT_APP_SUPABASE_ANON_KEY=
   ```
3. Rode o app:
   ```
   npm start
   ```

## Scripts

- `npm start` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm test` — suíte de testes

## Estrutura

```
src/
  app/            # rotas, layouts (DashboardLayout = shell mobile + bottom tab bar), providers (Auth, Toast)
  features/       # auth, dashboard, transacoes, objetivos, onboarding, perfil — cada um com pages/components/services
  components/     # componentes compartilhados (PageHeader, ConfirmDialog, Toast)
  lib/            # cliente Supabase, config de env
  styles/         # globals.css (mobile-first), tokens, temas
supabase/
  functions/      # Edge Functions (pluggy-token, pluggy-accounts) — precisam de PLUGGY_CLIENT_ID/PLUGGY_CLIENT_SECRET
                  # configurados via `supabase secrets set` no projeto remoto
```

## Deploy

Configurado para Vercel (`vercel.json` já tem o rewrite de SPA necessário pro React Router funcionar em produção). As Edge Functions do Supabase são publicadas separadamente via Supabase CLI (`supabase functions deploy <nome>`), não fazem parte do build do Vercel.
