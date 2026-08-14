# Checklist SEO — Pré e Pós Cutover

Este documento é para você marcar item por item **antes de trocar o DNS** e depois nas **primeiras 2 semanas** pós-cutover. Cada item foi construído com base no que hoje sustenta o ranking do site atual.

**Regra de ouro:** se qualquer item marcado como 🔴 crítico falhar no staging, **NÃO troque o DNS**. Corrija primeiro.

---

## 📌 Antes do cutover — Baseline (backup do estado atual)

Documentar o estado atual do site (que já ranqueia) para poder comparar depois.

- [ ] 🔴 **Screenshot do Search Console → Performance** (últimos 28 dias): total de cliques, impressões, CTR médio, posição média
- [ ] 🔴 **Screenshot das 20 Queries top** do Search Console (clicks descendente)
- [ ] 🔴 **Screenshot das 20 páginas top** (clicks descendente)
- [ ] **Screenshot do GA4** → Aquisição → Canais (últimos 30 dias)
- [ ] **Screenshot do GA4** → Eventos → `simulacao_concluida` (últimos 30 dias, valor total)
- [ ] **Screenshot do Google Ads** → Conversões (últimos 30 dias)
- [ ] Salvar tudo em uma pasta `_baseline_pre_cutover/` no seu computador

---

## 🧪 Antes do cutover — Validação em staging (`impostoeobra-site.vercel.app`)

### URLs e estrutura

- [ ] 🔴 **Todas as 13 URLs canônicas retornam 200:**
  - [ ] `/`
  - [ ] `/guia-inss-de-obra`
  - [ ] `/artigos`
  - [ ] `/artigos/artigo-notificacao-inss-obra` (ou com `.html`, conforme escolhido)
  - [ ] `/artigos/artigo-regularizar-inss-obra`
  - [ ] `/artigos/custo-regularizar-inss-obra`
  - [ ] `/artigos/afericao-indireta-receita`
  - [ ] `/artigos/cobranca-inss-obra-alta`
  - [ ] `/artigos/erro-cno-receita`
  - [ ] `/artigos/erro-sero`
  - [ ] `/artigos/erros-aumentam-inss-obra`
  - [ ] `/artigos/documentos-regularizacao-obra`
  - [ ] `/artigos/consultar-pendencias-obra`
- [ ] 🔴 **Redirects 301** funcionam para URLs antigas com `.html`:
  - [ ] `/artigos/artigo-notificacao-inss-obra.html` → 301 → `/artigos/artigo-notificacao-inss-obra`
  - [ ] Amostra de 3-5 artigos, verificar código 301 (não 302, não 307)
- [ ] **Nenhuma redirect chain** (301 → 301 → 200 é ruim; deve ser 301 → 200 direto)
- [ ] **Nenhuma URL nova** que não estava no sitemap antigo aparece indexável — se aparecer, garantir que está no sitemap novo

### Sitemap

- [ ] 🔴 `https://.../sitemap.xml` retorna XML válido
- [ ] 🔴 Contém pelo menos as 13 URLs canônicas + eventual `/sobre`, `/contato`, `/politica/aviso-de-privacidade`
- [ ] Todas com URL absoluta `https://impostoeobra.com.br/...` (não `.vercel.app`, não relativa)
- [ ] `lastmod` presente em cada URL
- [ ] `priority` bate com a tabela do handoff (0.7 a 1.0)
- [ ] `changefreq` presente e razoável

### robots.txt

- [ ] `https://.../robots.txt` acessível
- [ ] Contém `Sitemap: https://impostoeobra.com.br/sitemap.xml`
- [ ] Bloqueia `/admin/`, `/api/`, `/auth/`
- [ ] **NÃO** contém `Disallow: /` (bloquearia tudo — cuidado!)

### Meta tags — verificar em pelo menos 5 páginas (Home, Guia, Índice artigos, 1 artigo, 1 institucional)

- [ ] 🔴 **`<title>` único e descritivo** (50-60 caracteres) em cada página
- [ ] 🔴 **`<meta name="description">`** único (150-160 caracteres) em cada página
- [ ] 🔴 **`<link rel="canonical" href="URL absoluta">`** em cada página
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` presente
- [ ] `<html lang="pt-BR">` — não esquecer o `lang`
- [ ] **NÃO** tem `<meta name="robots" content="noindex">` acidental

### Open Graph

- [ ] `og:type` (article para artigos, website para institucional)
- [ ] `og:title` (pode reaproveitar o `<title>`)
- [ ] `og:description`
- [ ] `og:url` (URL absoluta canônica)
- [ ] `og:image` (1200×630 pixels) — deve retornar HTTP 200 e ser image/png ou image/jpeg
- [ ] `og:locale` = `pt_BR`
- [ ] `og:site_name` = `Imposto & Obra Consultoria`

**Validador:** colar cada URL em [opengraph.xyz](https://www.opengraph.xyz/) ou [Facebook Debugger](https://developers.facebook.com/tools/debug/) — deve renderizar corretamente com título + descrição + imagem.

### Twitter Cards

- [ ] `<meta name="twitter:card" content="summary_large_image">`
- [ ] `<meta name="twitter:title">`, `twitter:description`, `twitter:image`

### Schema.org (JSON-LD)

- [ ] 🔴 **Home** tem `ProfessionalService` — testar em [Rich Results Test](https://search.google.com/test/rich-results)
- [ ] 🔴 **`/artigos` (índice)** tem `CollectionPage`
- [ ] 🔴 **Cada artigo** tem `Article` — testar amostra de 3 artigos no Rich Results Test
- [ ] 🔴 **Artigo `artigo-notificacao-inss-obra`** tem AMBOS `Article` + `FAQPage` (o FAQ do accordion deve estar em JSON-LD)
- [ ] Guia INSS de Obra tem `Article` ou `WebPage`

**Como validar rápido:**

1. Ir em [search.google.com/test/rich-results](https://search.google.com/test/rich-results)
2. Colar URL do staging
3. Clicar em Test URL
4. Deve mostrar tipos detectados (Article, FAQPage, etc) sem erros
5. Se detectar warnings, revisar (não bloqueia mas piora)

### Favicons

- [ ] `favicon.ico` na raiz
- [ ] `apple-touch-icon.png` (180×180)
- [ ] `favicon-32x32.png`
- [ ] `favicon-16x16.png`
- [ ] `android-chrome-192x192.png`
- [ ] `android-chrome-512x512.png`
- [ ] `site.webmanifest`
- [ ] Testar em `https://.../favicon.ico` → deve retornar imagem

### Performance / Core Web Vitals

- [ ] 🔴 **Lighthouse** na Home: SEO ≥ 95, Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90
- [ ] 🔴 **Lighthouse** em um artigo: mesmos limites
- [ ] **PageSpeed Insights** ([pagespeed.web.dev](https://pagespeed.web.dev/)) — colar URL do staging
  - [ ] LCP (Largest Contentful Paint) < 2.5s
  - [ ] CLS (Cumulative Layout Shift) < 0.1
  - [ ] INP (Interaction to Next Paint) < 200ms
- [ ] Imagens usam `next/image` (webp automático, lazy loading)
- [ ] Nenhum arquivo JS > 250 KB por rota

### Internal linking

- [ ] Home linka para artigos principais e guia
- [ ] Guia linka para artigos relacionados
- [ ] Cada artigo tem pelo menos 2-3 links internos (para outros artigos ou para a home)
- [ ] Footer linka para política, sobre, contato
- [ ] Nenhum link interno quebrado (404)

**Como validar rápido:** rodar `https://www.brokenlinkcheck.com/` na URL de staging.

### GA4 e conversões

- [ ] 🔴 Snippet gtag é o **primeiro filho** da `<head>` (View Source e conferir)
- [ ] 🔴 ID é `G-8CYR5J0Z3L` (não trocar)
- [ ] 🔴 GA4 tempo real detecta visita ao staging
- [ ] 🔴 Evento `simulacao_concluida` dispara após completar uma simulação — visível em Tempo Real → Eventos
- [ ] Valor do evento é o `economia` (não zero por padrão)
- [ ] Sem tags GTM duplicadas na página

### WhatsApp

- [ ] Todo CTA "Fale conosco" abre `api.whatsapp.com/send?phone=5561993982653&text=...`
- [ ] **NÃO** usa `wa.me/...`
- [ ] Botão do resultado da calculadora tem mensagem contextual (com economia se > 0, sem se = 0)

### Conteúdo dos artigos

- [ ] 🔴 Artigo `artigo-notificacao-inss-obra` mantém as **2.114 palavras + FAQ accordion + FAQPage Schema** — Codex pode ter "resumido"
- [ ] Outros 9 artigos mantêm o conteúdo integral (não truncado)
- [ ] H1 único por página (o título)
- [ ] Hierarquia H2 → H3 respeitada
- [ ] Nenhum `<h1>` duplicado na mesma página

---

## 🚀 Durante o cutover

- [ ] Anotar registros DNS antigos do Cloudflare (para rollback):
  ```
  A     @        185.199.108.153
  A     @        185.199.109.153
  A     @        185.199.110.153
  A     @        185.199.111.153
  CNAME www      impostoeobraconsultoria-eng.github.io.
  ```
- [ ] Adicionar `impostoeobra.com.br` e `www.impostoeobra.com.br` na Vercel
- [ ] Trocar registros no Cloudflare conforme instrução da Vercel
- [ ] Manter proxy Cloudflare ligado (nuvem laranja)
- [ ] Aguardar propagação (10-30 min) — testar em [dnschecker.org](https://dnschecker.org/)

---

## ✅ Imediatamente pós-cutover (primeiras 2 horas)

- [ ] 🔴 `https://impostoeobra.com.br/` carrega **o site novo** (aba anônima)
- [ ] 🔴 SSL válido (cadeado verde no navegador)
- [ ] 🔴 Rodar simulação real → lead aparece no dashboard Supabase e em `/admin/leads`
- [ ] 🔴 GA4 tempo real mostra visitas vindas de `impostoeobra.com.br`
- [ ] 🔴 Evento `simulacao_concluida` dispara
- [ ] `www.impostoeobra.com.br` redireciona para `impostoeobra.com.br` (ou vice-versa, um dos dois é canônico)
- [ ] Testar 5 URLs canônicas da tabela — todas retornam 200
- [ ] Testar 3 redirects `.html` — todos retornam 301

---

## 🎯 Search Console (primeira semana)

- [ ] Propriedade `impostoeobra.com.br` (já verificada via GA4) segue OK
- [ ] Sitemaps → remover antigo (se estiver listado) → submeter `https://impostoeobra.com.br/sitemap.xml`
- [ ] Enviar ping do sitemap:
  ```
  https://www.google.com/ping?sitemap=https://impostoeobra.com.br/sitemap.xml
  ```
- [ ] Inspeção de URL → testar 5-8 URLs principais → **Solicitar indexação** (uma a uma, respeitando quota diária)
- [ ] Ver aba **Cobertura** — nenhum erro crítico novo
- [ ] Ver aba **Experiência da página** (Core Web Vitals) — sem regressão

---

## 📊 Monitoramento — 2 primeiras semanas

Fazer diariamente:

### Dia 1-3

- [ ] GA4 usuários e evento `simulacao_concluida` — comparar com baseline (esperar oscilação pequena, ± 20%)
- [ ] Google Ads — conversões vindas do evento seguem chegando
- [ ] Search Console → Cobertura — checar novos erros

### Dia 4-7

- [ ] GA4 e Ads devem se estabilizar
- [ ] Search Console → Queries top — muitas queries devem reaparecer (Google reindexando)
- [ ] Se posição média cair muito (mais de 5 posições em queries importantes), investigar (redirects? canonical? noindex acidental?)

### Dia 8-14

- [ ] Posição no Google deve voltar ao patamar do baseline (± 2 posições)
- [ ] Se não voltar em 21 dias, algo estrutural quebrou — checar:
  - Todas URLs antigas retornam 301, não 404
  - Canonical aponta para HTTPS, não HTTP
  - Sitemap não tem URLs de staging (`.vercel.app`)
  - Google não pegou versão de staging por engano

---

## 🚨 Sinais de alerta (reagir imediatamente)

Reverter DNS pros registros antigos (Passo 10.2 do plano) se:

- [ ] Site novo cair (5xx) por mais de 30 min sem conseguir arrumar
- [ ] Lead não estiver sendo capturado por mais de 1 hora
- [ ] GA4 parar de receber `simulacao_concluida` por mais de 2 horas
- [ ] Google Ads reportar conversões zeradas por 24h e não conseguir identificar causa
- [ ] Search Console mostrar > 50% das URLs indexadas caindo em erro crítico em 48h

Reverter é rápido — só trocar registros DNS no Cloudflare. Volta pro GitHub Pages em 5-15 min.

---

## 🔍 Ferramentas úteis (bookmarks)

- [Google Search Console](https://search.google.com/search-console)
- [Rich Results Test](https://search.google.com/test/rich-results) — validar Schema.org
- [PageSpeed Insights](https://pagespeed.web.dev/) — Core Web Vitals
- [Facebook Debugger](https://developers.facebook.com/tools/debug/) — Open Graph
- [opengraph.xyz](https://www.opengraph.xyz/) — Open Graph preview
- [Broken Link Checker](https://www.brokenlinkcheck.com/) — links quebrados
- [DNS Checker](https://dnschecker.org/) — propagação DNS
- [SSL Labs](https://www.ssllabs.com/ssltest/) — nota SSL
- [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) — crawler completo (gratuito até 500 URLs)

---

**FIM.** Marque cada item conforme for validando. Não pule os 🔴 críticos.
