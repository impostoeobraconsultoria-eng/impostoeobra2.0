-- =============================================================================
-- SQL de suporte ao pacote de refinamento V10 (Analytics + SEO técnico)
-- Rodar UMA vez no SQL Editor do Supabase antes de iniciar a branch v10/1.
-- Idempotente (on conflict do nothing).
--
-- V10 é majoritariamente frontend (metadata, eventos, schema). O único papel
-- do banco é armazenar valores padrão editáveis via /admin/config, pra evitar
-- deploy toda vez que quiser refinar copy institucional / imagem OG.
--
-- Contém apenas:
--   V10.1 — Chaves em config (metadata padrão, dados de contato pra Schema.org,
--           URL do og-image, nomes/rótulos do sitemap)
-- =============================================================================

insert into public.config (chave, valor, descricao) values

  -- ------------------------------------------------------------------
  -- Meta tags padrão (fallback quando página não tem específica)
  -- ------------------------------------------------------------------
  ('seo_titulo_padrao',
   'Imposto & Obra Consultoria — Regularização de INSS de Obra',
   'Título default do site (<title>) quando página não define um específico. Idealmente 50-60 chars.'),

  ('seo_description_padrao',
   'Diagnóstico preliminar gratuito de redução do INSS da sua obra. Consultoria especializada em regularização previdenciária de obras de construção civil.',
   'Meta description default (<meta name="description">). Ideal 150-160 chars. Aparece na SERP do Google.'),

  ('seo_og_image_padrao',
   '/images/og-default.jpg',
   'Imagem padrão para Open Graph (og:image). Deve existir em public/images/. Recomendado 1200x630px, PNG ou JPG, <300KB.'),

  ('seo_twitter_handle',
   '',
   'Handle Twitter/X da empresa (com @). Se vazio, twitter:site não é renderizado.'),

  -- ------------------------------------------------------------------
  -- Schema.org LocalBusiness — home page
  -- ------------------------------------------------------------------
  ('seo_org_nome',
   'Imposto & Obra Consultoria',
   'Razão social exibida no Schema.org (LocalBusiness → name).'),

  ('seo_org_telefone',
   '+55-61-99398-2653',
   'Telefone no formato E.164 usado em Schema.org (telephone).'),

  ('seo_org_email',
   'impostoeobraconsultoria@gmail.com',
   'Email de contato usado em Schema.org (email) e no rodapé.'),

  ('seo_org_endereco_cidade',
   'Brasília',
   'Cidade da sede — Schema.org address.addressLocality.'),

  ('seo_org_endereco_uf',
   'DF',
   'UF da sede — Schema.org address.addressRegion.'),

  ('seo_org_endereco_pais',
   'BR',
   'País da sede — Schema.org address.addressCountry (ISO 3166-1 alpha-2).'),

  ('seo_org_horario_atendimento',
   'Mo-Fr 09:00-19:00',
   'Horário de atendimento no formato Schema.org (openingHours). Padrão: segunda a sexta, 9h às 19h.'),

  ('seo_org_area_atendimento',
   'Brasil',
   'Área geográfica de atendimento — Schema.org areaServed. Ex: "Brasil" ou lista de UFs.'),

  ('seo_org_descricao',
   'Consultoria jurídico-tributária especializada em regularização previdenciária de obras de construção civil, com atuação nacional 100% remota.',
   'Descrição institucional usada em Schema.org (description) e outros metadados.'),

  -- ------------------------------------------------------------------
  -- Sitemap
  -- ------------------------------------------------------------------
  ('seo_sitemap_habilitado',
   'true',
   'Habilita geração dinâmica do /sitemap.xml. Se false, retorna 404 (útil pra ambientes de staging).'),

  ('seo_sitemap_changefreq_home',
   'weekly',
   'Frequência de atualização declarada no sitemap para a home. weekly / daily / monthly.'),

  ('seo_sitemap_changefreq_artigos',
   'monthly',
   'Frequência de atualização declarada no sitemap para artigos.'),

  -- ------------------------------------------------------------------
  -- GA4 — nomes dos novos eventos (padrão, mas editáveis)
  -- ------------------------------------------------------------------
  ('ga4_event_click_whatsapp',
   'click_whatsapp',
   'Nome do evento GA4 disparado ao clicar em qualquer botão/link de WhatsApp do site público.'),

  ('ga4_event_click_telefone',
   'click_telefone',
   'Nome do evento GA4 disparado ao clicar em qualquer link tel: do site público.'),

  ('ga4_event_click_email',
   'click_email',
   'Nome do evento GA4 disparado ao clicar em qualquer link mailto: do site público.'),

  ('ga4_event_download_diagnostico',
   'download_diagnostico',
   'Nome do evento GA4 disparado quando o cliente baixa o PDF do Diagnóstico Preliminar (V9).')

on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
-- select chave, valor from public.config where chave like 'seo_%' order by chave;
-- select chave, valor from public.config where chave like 'ga4_event_%' order by chave;
