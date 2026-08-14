# Plano de migração — Plataforma Imposto & Obra (v2 — Fullstack)

**Objetivo:** substituir o site estático (GitHub Pages) + CRM em Google Sheets por uma plataforma unificada em **Next.js + Supabase + Vercel**, com autenticação Google, painel admin completo, editor de artigos, e todos os dados históricos migrados. **Sem perder ranking Google, conversões do GA4/Ads, nem quebrar a captura de leads**.

**Duração estimada:** 3-6 semanas (dependendo do tempo com o Codex e da migração de dados).

**Riscos principais:**

1. Perda de ranking se URLs quebrarem
2. Quebra da captura de leads durante a transição (webhook)
3. Perda de conversões no Google Ads
4. Dados do CRM antigo não migrarem corretamente
5. Curva de aprendizado do novo admin para o consultor

Cada passo abaixo tem verificações que reduzem esses riscos.

---

## Passo 0 — Pré-requisitos (você, agora)

- [ ] Ter conta no **Supabase** (`supabase.com`) — grátis até certo limite
- [ ] Ter conta no **Vercel** (`vercel.com`) com login pelo GitHub
- [ ] Ter conta no **Google Cloud Console** para configurar OAuth Client
- [ ] Ter o **Codex do ChatGPT** aberto
- [ ] Ter em mãos os 4 arquivos deste projeto (`HANDOFF_CODEX.md`, `SCHEMA_SUPABASE.sql`, `PLANO_MIGRACAO_CODEX.md`, `CHECKLIST_SEO_CUTOVER.md`)

Nada precisa ser instalado localmente.

---

## Passo 1 — Criar projeto Supabase

1. Login em `supabase.com` → **New Project**
2. Nome: `impostoeobra` · Region: `sa-east-1` (São Paulo) · Password: gerar e guardar bem
3. Aguardar provisionamento (2-3 min)
4. Ir em **Settings → API** e anotar:
   - `Project URL` (será a `NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public key` (será a `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role secret` (será a `SUPABASE_SERVICE_ROLE_KEY` — **jamais** exponha no cliente)

---

## Passo 2 — Executar o schema

1. No dashboard Supabase, ir em **SQL Editor** → **New query**
2. Copiar TODO o conteúdo de `SCHEMA_SUPABASE.sql`
3. **Antes de executar**, trocar o email do usuário admin inicial na seção 15 se necessário
4. Rodar. Se der erro, corrigir e rodar de novo (o script é idempotente com `on conflict do nothing`)
5. Verificar em **Table Editor** que apareceram 10 tabelas: `users`, `vau`, `config`, `leads`, `clientes`, `contratos`, `atividades`, `artigos`, `cases`, `faq`

---

## Passo 3 — Configurar Google OAuth

### 3.1 — Google Cloud Console

1. Ir em `console.cloud.google.com` → criar novo projeto ou usar existente (o mesmo do GA4 pode ser reaproveitado)
2. Ir em **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Imposto & Obra Admin`
5. **Authorized JavaScript origins:**
   - `https://impostoeobra.com.br`
   - `https://xxx.supabase.co` (substituir pelo Project URL do Supabase)
   - `http://localhost:3000` (desenvolvimento)
6. **Authorized redirect URIs:**
   - `https://xxx.supabase.co/auth/v1/callback`
7. Criar. Anotar **Client ID** e **Client Secret**.

### 3.2 — Supabase

1. Dashboard Supabase → **Authentication → Providers → Google**
2. Toggle **Enable**
3. Colar Client ID e Client Secret
4. **Save**

### 3.3 — Site URL

1. **Authentication → URL Configuration**
2. **Site URL:** `https://impostoeobra.com.br`
3. **Redirect URLs (whitelist):**
   - `https://impostoeobra.com.br/auth/callback`
   - `https://impostoeobra-site.vercel.app/auth/callback` (o preview da Vercel)
   - `http://localhost:3000/auth/callback` (dev)

---

## Passo 4 — Storage bucket para imagens

1. Dashboard Supabase → **Storage → New bucket**
2. Nome: `og-images` · Public: **Sim** · File size limit: 5 MB
3. Ir em **Policies** e criar as 4 policies comentadas no fim do `SCHEMA_SUPABASE.sql` (leitura pública, escrita autenticada)

---

## Passo 5 — Criar o repositório novo

1. No GitHub, criar `impostoeobraconsultoria-eng/impostoeobra-site` — **Público**, sem README
2. Não clonar, não inicializar. Deixar vazio.

---

## Passo 6 — Handoff ao Codex

### 6.1 — Preparação

Anexe ao Codex os 4 arquivos:

- `HANDOFF_CODEX.md` (o cérebro)
- `SCHEMA_SUPABASE.sql` (referência do schema)
- `PLANO_MIGRACAO_CODEX.md` (este arquivo)
- `CHECKLIST_SEO_CUTOVER.md`

### 6.2 — Prompt inicial

Cole no Codex:

> Você vai construir a **Plataforma Imposto & Obra** do zero em **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase + Vercel**.
>
> Os 4 arquivos anexos são a **única fonte da verdade**:
>
> - `HANDOFF_CODEX.md` — contexto do negócio, arquitetura, regras da IN RFB 2021, UX detalhado, integrações, SEO
> - `SCHEMA_SUPABASE.sql` — schema executável do banco (já rodado no Supabase)
> - `PLANO_MIGRACAO_CODEX.md` — este documento
> - `CHECKLIST_SEO_CUTOVER.md` — checklist final antes do DNS
>
> **Restrições absolutas:**
>
> - Não altere URLs sem 301 permanente (`next.config.js`)
> - Não mude ID do GA4 (`G-8CYR5J0Z3L`) nem nome do evento `simulacao_concluida`
> - Toda página HTML tem gtag como primeiro filho da `<head>`
> - Zero uso de `localStorage` em server components
> - Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente
> - Zero `disable RLS` em qualquer tabela
> - Calculadora reproduz exatamente os 6 cenários da seção 16 do handoff
>
> **Ordem sugerida de trabalho:**
>
> 1. Scaffold do projeto (Next 14 App Router + TS + Tailwind + shadcn/ui + Supabase client)
> 2. Setup Auth: middleware protegendo `/admin/*`, callback OAuth, tela `/login`
> 3. Layout base público (Header, Footer, GA4)
> 4. Layout base admin (Sidebar, Topbar)
> 5. **Home + calculadora** (a peça mais complexa — reserve tempo)
> 6. Endpoint `POST /api/leads` (público) e `GET /api/vau` (público)
> 7. Sitemap dinâmico, robots.txt, redirects `.html`
> 8. Páginas Sobre, Contato, Política (estáticas)
> 9. Guia INSS de Obra (estático ou MDX)
> 10. `/artigos` (índice) e `/artigos/[slug]` (dinâmico do banco)
> 11. Admin: Leads (kanban + tabela + detalhe), Clientes, Contratos, Atividades
> 12. Admin: Artigos (editor Tiptap), Cases, FAQ, VAU, Usuários, Config
> 13. Scripts de migração de dados (`scripts/migrate-*.ts`)
> 14. Testes: 6 cenários da seção 16 + fluxo end-to-end de auth
>
> **Antes de escrever qualquer código, resuma sua compreensão do handoff em 15 linhas e me pergunte o que estiver ambíguo.**

### 6.3 — Enquanto o Codex trabalha

- Se ele contradisser o handoff, cite a seção específica e mande refazer
- Se ele propuser algo que não está no handoff (mudança de UX, nova biblioteca), pare e discuta
- Peça que ele **commite em branches temáticas**: `feat/auth`, `feat/calculadora`, `feat/admin-leads`, etc — facilita revisão

---

## Passo 7 — Conectar Vercel

Quando o Codex tiver pelo menos o scaffold + layout público pronto:

1. `vercel.com` → **Import Project** → `impostoeobra-site`
2. Framework Preset: **Next.js** (auto-detecta)
3. **Environment Variables:**

| Variável                        | Escopo                           | Valor                             |
| ------------------------------- | -------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Production, Preview, Development | (do Passo 1)                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | (do Passo 1)                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Production, Preview              | (do Passo 1) — jamais Development |
| `NEXT_PUBLIC_GA4_ID`            | Production, Preview              | `G-8CYR5J0Z3L`                    |
| `NEXT_PUBLIC_WHATSAPP_PHONE`    | Production, Preview, Development | `5561993982653`                   |
| `NEXT_PUBLIC_SITE_URL`          | Production, Preview              | `https://impostoeobra.com.br`     |

4. Deploy inicial. A Vercel te dá `impostoeobra-site.vercel.app`.

---

## Passo 8 — Migração de dados

Rodar os scripts de migração criados pelo Codex, na ordem:

### 8.1 — Migrar artigos (do repo antigo → tabela `artigos`)

```bash
# Localmente ou em uma Vercel Function
pnpm tsx scripts/migrate-artigos.ts
```

Verificações:

- 10 artigos importados
- Slugs corretos (sem `.html`)
- Conteúdo MDX preservado
- FAQ do artigo `artigo-notificacao-inss-obra` no campo `faq jsonb`
- Todos com `publicado = true`

### 8.2 — Migrar CRM (Google Sheets → Supabase)

Pré-requisito: gerar Service Account no Google Cloud, dar acesso à planilha CRM.

Ordem das tabelas (respeita FKs):

1. `Usuarios` → `users` (já tem seed, comparar e complementar)
2. `Config` → `config`
3. `TabelaVAU` → `vau`
4. `Leads` → `leads`
5. `Clientes` → `clientes` (setar `lead_id_origem` cruzando `nome`)
6. `Contratos` → `contratos`
7. `Atividades` → `atividades`

Todos os registros ficam com `legacy_id` preenchido para rastrear.

Verificações:

- Contagem de registros bate: `select count(*) from leads` = contagem da planilha
- Amostragem manual de 5 leads: campos batem
- FKs válidos (`select count(*) from leads where cliente_id is not null and cliente_id not in (select id from clientes)` = 0)

### 8.3 — Manter Google Sheets como backup

Não deletar a planilha. Marcar no header do arquivo: **"BACKUP — não editar mais. Fonte da verdade: plataforma nova."**

---

## Passo 9 — Validação em staging (`impostoeobra-site.vercel.app`)

Antes de trocar o DNS. Ver `CHECKLIST_SEO_CUTOVER.md` para lista completa de 30+ itens. Resumo:

### 9.1 — Calculadora (crítico)

- [ ] Rodar os 6 cenários da seção 16 do handoff
- [ ] Divergência ≤ R$ 0,01
- [ ] Aviso amarelo aparece só no cenário E
- [ ] WhatsApp com mensagens contextuais corretas
- [ ] Lead cai na tabela `leads` do Supabase (visível em `/admin/leads` e no dashboard Supabase)

### 9.2 — Auth

- [ ] Login com Google funciona
- [ ] Usuário fora de `users` é bloqueado com mensagem clara
- [ ] Admin acessa tudo; consultor tem restrições

### 9.3 — Admin

- [ ] Kanban de leads: drag & drop persiste
- [ ] Editor de artigo: publicar → aparece em `/artigos` público em ≤ 1 min (revalidação ISR)
- [ ] Editor de VAU: alterar valor → home puxa novo em ≤ 1 min
- [ ] Cálculo complementar da tela do lead bate com os cenários

### 9.4 — SEO

- [ ] Todas as 13 URLs canônicas retornam 200
- [ ] Redirects `.html` → sem `.html` funcionam com 301
- [ ] Sitemap XML válido com 13+ URLs
- [ ] Rich Results Test passa para `ProfessionalService`, `Article`, `FAQPage`
- [ ] Lighthouse SEO ≥ 95, Performance ≥ 85

### 9.5 — Integrações

- [ ] GA4 tempo real registra visita
- [ ] Evento `simulacao_concluida` dispara
- [ ] Link WhatsApp abre com número certo

Se algum falhar, **não avançar**. Voltar ao Codex.

---

## Passo 10 — Backup + Cutover DNS

### 10.1 — Backup do estado atual

Antes de trocar o DNS:

- [ ] Screenshot do Search Console (queries top, cliques, impressões dos últimos 28 dias)
- [ ] Screenshot do GA4 (usuários últimos 30 dias)
- [ ] Screenshot do Google Ads (conversões últimos 30 dias)
- [ ] Anotar registros DNS atuais do Cloudflare (para rollback)

### 10.2 — Registros DNS antigos (GitHub Pages — fallback)

```
A     @        185.199.108.153
A     @        185.199.109.153
A     @        185.199.110.153
A     @        185.199.111.153
CNAME www      impostoeobraconsultoria-eng.github.io.
```

### 10.3 — Cutover

**Na Vercel:**

1. Project Settings → Domains → **Add** `impostoeobra.com.br` e `www.impostoeobra.com.br`
2. Vercel mostra os registros DNS necessários (`A 76.76.21.21` e `CNAME cname.vercel-dns.com`)

**No Cloudflare:** 3. DNS → Records → substituir registros antigos pelos da Vercel 4. **Manter proxy ligado (nuvem laranja)** — Vercel funciona atrás do Cloudflare 5. Aguardar propagação (5-30 min)

### 10.4 — Verificação pós-cutover

- [ ] `https://impostoeobra.com.br/` carrega o site NOVO
- [ ] `https://impostoeobra.com.br/artigos/artigo-notificacao-inss-obra.html` redireciona 301 para `/artigos/artigo-notificacao-inss-obra` (Passo 6 da versão Next.js) OU carrega direto o novo (se optou por Opção A)
- [ ] Simulação real cria lead no Supabase
- [ ] GA4 tempo real mostra visitas vindas de `impostoeobra.com.br`
- [ ] Evento `simulacao_concluida` dispara

---

## Passo 11 — Search Console pós-cutover

1. `search.google.com/search-console`
2. Propriedade `impostoeobra.com.br` (já existe)
3. Sitemaps → **remover** o antigo (se listado) → submeter `https://impostoeobra.com.br/sitemap.xml`
4. Inspeção de URL → testar 3-5 URLs importantes → **Solicitar indexação**
5. Cobertura → monitorar 7-14 dias. Esperar oscilação, mas voltar ao patamar em 3 semanas.

---

## Passo 12 — Comunicar mudança à equipe

- [ ] Enviar link do admin novo para consultores (`impostoeobra.com.br/admin`)
- [ ] Fazer sessão de treinamento (30 min): login, kanban, criar/editar lead, publicar artigo
- [ ] Documentar diferenças em relação ao Google Sheets (link para dashboard novo)
- [ ] Combinar: **não editar mais o Google Sheets antigo**. Se a equipe precisar, buscar no admin.

---

## Passo 13 — Monitoramento (2 semanas pós-cutover)

Diariamente:

- **GA4** — sessões, evento `simulacao_concluida`
- **Google Ads** — conversões
- **Vercel Analytics** (se habilitado) — erros 5xx, tempo de resposta

Semanalmente:

- **Search Console** — cliques, impressões, cobertura, erros de rastreamento
- **Supabase Dashboard** — quantidade de rows, tamanho do DB, erros de query
- **Feedback da equipe** — o admin novo está OK?

**Regra de rollback:**

- Se cair >30% em conversões por 5 dias e não achar causa, reverter DNS pros registros antigos (Passo 10.2). Volta pro GitHub Pages em minutos. Investigar com calma depois.

---

## Passo 14 — Descomissionamento (60 dias pós-cutover)

Após 2 meses sem incidentes:

- [ ] Arquivar repo antigo (`impostoeobra`) — GitHub → Settings → Archive
- [ ] Renomear planilha CRM antiga para `[ARQUIVADO] CRM Imposto & Obra`
- [ ] Desativar webhook Apps Script antigo (deixar deploy ativo mas parar de configurar em qualquer lugar)
- [ ] Documentar aprendizados no README do repo novo

---

## Anexo: comandos úteis

```bash
# Testar todas URLs canônicas
for url in "/" "/guia-inss-de-obra" "/artigos" "/sitemap.xml" "/robots.txt" \
           "/artigos/artigo-notificacao-inss-obra" "/artigos/artigo-regularizar-inss-obra" \
           "/artigos/custo-regularizar-inss-obra" "/artigos/afericao-indireta-receita" \
           "/artigos/cobranca-inss-obra-alta" "/artigos/erro-cno-receita" \
           "/artigos/erro-sero" "/artigos/erros-aumentam-inss-obra" \
           "/artigos/documentos-regularizacao-obra" "/artigos/consultar-pendencias-obra" \
           "/sobre" "/contato" "/politica/aviso-de-privacidade"; do
  code=$(curl -sI "https://impostoeobra.com.br$url" | head -1)
  echo "$code $url"
done

# Testar redirects .html
for slug in "artigo-notificacao-inss-obra" "custo-regularizar-inss-obra"; do
  code=$(curl -sI "https://impostoeobra.com.br/artigos/$slug.html" | head -1)
  echo "$code /artigos/$slug.html"
done
```

Todos os primeiros devem ser `HTTP/2 200`. Os redirects devem ser `HTTP/2 301`.

---

**FIM.** Migração é longa mas cada passo é verificável. Se travar em algo, voltar aqui com o problema específico.
