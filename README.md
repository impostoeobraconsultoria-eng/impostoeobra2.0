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

## Tráfego interno no GA4

Cada integrante da equipe deve abrir o admin no navegador usado no trabalho e
clicar em **Marcar navegador como interno**, no rodapé da barra lateral. O cookie
é válido por um ano e faz o GA4 receber `traffic_type=internal`.

No GA4, configure uma regra de tráfego interno para `traffic_type equals
internal` e um Data Filter do tipo **Exclude**. Primeiro valide em modo de teste;
depois ative o filtro para excluir acessos da equipe das métricas oficiais.
