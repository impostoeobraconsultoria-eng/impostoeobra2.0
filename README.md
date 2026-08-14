# Plataforma Imposto & Obra

Plataforma fullstack da Imposto & Obra Consultoria, construída com Next.js 14,
TypeScript, Tailwind CSS, shadcn/ui e Supabase.

## Requisitos

- Node.js 20 ou superior
- pnpm 11.19.0

## Desenvolvimento

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

As credenciais reais nunca devem ser commitadas. A chave
`SUPABASE_SERVICE_ROLE_KEY` é exclusiva do servidor e não pode receber o prefixo
`NEXT_PUBLIC_`.

## Verificações

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

O domínio canônico é `https://impostoeobra.com.br`. As regras completas de
negócio, SEO e migração estão nos documentos de handoff presentes na raiz.
