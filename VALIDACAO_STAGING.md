# Validação de staging

Data: 14 de agosto de 2026  
Ambiente: `https://impostoeobra2-0.vercel.app`

## Resultado

- Build Vercel com Next.js 14.2.35: aprovado.
- 13 URLs canônicas prioritárias: HTTP 200.
- Redirects antigos `.html`: HTTP 301 direto para a URL canônica.
- Sitemap: 16 URLs absolutas, com `lastmod`, `changefreq` e `priority`.
- Robots: sitemap correto e bloqueio de `/admin/`, `/api/`, `/auth/` e `/login`.
- Home: canonical absoluto, H1 único e schema `ProfessionalService`.
- Artigo de notificação: H1 único, 7 FAQs, 9 links internos e schemas
  `Article` + `FAQPage`; conteúdo preservado em relação ao site atual.
- Header responsivo: aprovado em 390 px, 820 px e 1440 px, sem overflow.
- WhatsApp: todos os CTAs usam `api.whatsapp.com` e o número canônico.
- Calculadora: seis cenários numéricos aprovados; lead sintético persistido no
  Supabase e exibido no dashboard; mensagem contextual do WhatsApp aprovada.
- VAU: resposta pública aprovada e vigência exibida como `Maio/2026`.
- Auth: visitante redirecionado ao login; admin autorizado acessou dashboard e
  `/admin/usuarios`; `ultimo_acesso` atualizado; console sem erros.

## Lighthouse

| Página                | Performance | Acessibilidade | Boas práticas | SEO |   LCP | CLS |
| --------------------- | ----------: | -------------: | ------------: | --: | ----: | --: |
| Home                  |          99 |             96 |           100 | 100 | 1,8 s |   0 |
| Artigo de notificação |          92 |             96 |           100 | 100 | 1,6 s |   0 |

## Exceção aprovada: ordem do GA4

O `next/script` do GA4 permanece como primeiro filho explicitamente declarado do
`<head>` no layout raiz, com `strategy="afterInteractive"`, ID
`G-8CYR5J0Z3L` e evento `simulacao_concluida` inalterados.

No HTML inicial, o Next.js 14 posiciona automaticamente `meta charset` e viewport
antes dos elementos declarados e injeta scripts `afterInteractive` no cliente.
Logo, a ordem literal `gtag` antes de `meta charset` não é compatível com essa
estratégia no App Router. A manutenção da estratégia oficial e dessa ordem gerada
pelo framework foi aprovada pelo responsável do projeto em 14 de agosto de 2026.

## Infraestrutura

- Projeto Vercel: `ie-o/impostoeobra2-0`.
- Variáveis obrigatórias configuradas para Preview e Production.
- Proteção SSO dos deployments desativada com autorização para permitir os
  testes públicos.
- Nenhum domínio personalizado ou registro DNS foi alterado.
- GitHub conectado a `impostoeobraconsultoria-eng/impostoeobra2.0`, com `main`
  configurada como Production Branch para deploys automáticos.
