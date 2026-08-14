# HANDOFF DOCUMENT — Plataforma Imposto & Obra (v2 — Fullstack)

**Para:** agente Codex (ChatGPT) encarregado de reconstruir a plataforma do zero.
**De:** transferência do sistema atual (site GitHub Pages + CRM em Google Sheets) para arquitetura profissional fullstack.
**Última atualização:** 2026-08-14.

**Esta versão substitui a v1** (que era só Next.js estático). Agora o escopo é uma **plataforma completa**: site público + CRM + admin, tudo com backend Postgres via Supabase, autenticação Google, editor de artigos, painel de leads/clientes/contratos.

---

## 1. Contexto do negócio

**Imposto & Obra Consultoria** é uma consultoria jurídico-tributária especializada em **regularização de INSS de obras de construção civil** perante a Receita Federal. Ajuda PF e PJ a reduzir legalmente o INSS cobrado na aferição indireta (Sero), com base na IN RFB nº 2.021/2021.

- **CNPJ:** 63.382.260/0001-99
- **Sede:** Brasília/DF
- **Sócio fundador / responsável técnico:** Paulo Ricardo (OAB-DF 72.326)
- **Consultor parceiro tributarista:** Wenderson Siqueira (OAB-DF 57.162, Siqueira Borges Sociedade Individual de Advocacia)
- **WhatsApp comercial:** +55 61 9398-2653 (E.164: `5561993982653`)
- **Domínio canônico:** `https://impostoeobra.com.br` (DNS no Cloudflare)

---

## 2. Escopo desta versão

**Migrar / reconstruir tudo abaixo em uma plataforma única:**

### Site público (indexado no Google)

- Home + calculadora interativa (4 etapas)
- Página pilar "Guia INSS de Obra"
- Blog de artigos (10 já publicados) — agora **dinâmico** (tabela `artigos`)
- Página institucional Sobre
- Página Contato
- Página Aviso de Privacidade (LGPD)
- Sitemap, robots.txt, favicons, OG images

### Admin / CRM (protegido, login Google)

- Dashboard (KPIs de leads, conversão, faturamento)
- **Leads** (kanban + tabela + detalhe com informações complementares)
- **Clientes** (leads convertidos)
- **Contratos**
- **Atividades / timeline**
- **Editor de artigos** (rich text, publicar/despublicar)
- **Gerenciador de cases de sucesso**
- **Gerenciador de FAQ**
- **Editor de tabela VAU** (por UF/destinação)
- **Gerenciamento de usuários** (só perfil `admin`)
- **Configurações do sistema**

### O que continua fora da plataforma

- **GA4** (`G-8CYR5J0Z3L`) e **Google Ads** — configurações mantidas
- **Search Console** — propriedade mantida
- **Cloudflare DNS** — mantido

### O que é descontinuado

- **Google Sheets do CRM** — migrar dados pro Postgres e depois arquivar
- **Apps Script webhook de leads** — substituir por endpoint interno `/api/leads`
- **Apps Script do CRM** — substituir por API interna
- **CRM SPA estático** (`crm/`) — substituir pelo admin da plataforma nova

---

## 3. Stack alvo

| Camada           | Escolha                                             | Motivo                                                       |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| Framework        | **Next.js 14+** (App Router)                        | SSR/SSG/ISR, ecossistema maduro, ótimo SEO                   |
| Linguagem        | **TypeScript**                                      | Segurança de tipos, obrigatório pra escala                   |
| Estilização      | **Tailwind CSS** + **shadcn/ui**                    | Padrão moderno, componentes acessíveis                       |
| Editor rich text | **Tiptap** ou **Novel**                             | Editor WYSIWYG para artigos                                  |
| Banco / Backend  | **Supabase** (Postgres + Auth + Storage + Realtime) | Um stack pra tudo, RLS nativo                                |
| Auth             | **Supabase Auth** com provider **Google OAuth**     | Login SSO, gestão em tabela `users`                          |
| Deploy           | **Vercel**                                          | Preview automático, integração com GitHub, ótimo pra Next.js |
| DNS              | **Cloudflare** (mantido)                            | CDN + SSL + proxy                                            |
| Analytics        | **GA4** (mantido) + Vercel Analytics (opcional)     | GA4 é essencial (Ads depende)                                |
| Monitoring       | **Sentry** (opcional)                               | Erros em produção                                            |
| Node             | **20 LTS+**                                         |                                                              |
| Package manager  | **pnpm**                                            | Mais rápido, workspaces                                      |

**Padrões:**

- Server Components por padrão; Client Components só para interatividade (calculadora, editor, formulários admin)
- Uso de **Server Actions** para mutations no admin
- **Route Handlers** (`app/api/`) para endpoints públicos (`/api/leads`, `/api/vau`)
- **Middleware** protegendo `/admin/*`
- Tipagem gerada do schema Supabase via `supabase gen types typescript`

---

## 4. Arquitetura geral

```
┌───────────────────────────────────────────────────────────────┐
│                        VERCEL (Next.js)                       │
│                                                               │
│  ┌─────────────────────────┐   ┌─────────────────────────┐   │
│  │  Site público (SSG/ISR) │   │  Admin/CRM (SSR + Auth) │   │
│  │  /, /artigos, /guia,    │   │  /admin/*               │   │
│  │  /sobre, /contato       │   │  Server Actions         │   │
│  │  Calculadora (client)   │   │  Editor Tiptap          │   │
│  └───────────┬─────────────┘   └─────────────┬───────────┘   │
│              │                                │               │
│              │   API Routes (públicas)        │               │
│              │   /api/leads   /api/vau        │               │
│              └────────────────┬───────────────┘               │
└───────────────────────────────┼───────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │       SUPABASE        │
                    │                       │
                    │  Postgres (RLS)       │
                    │  Auth (Google OAuth)  │
                    │  Storage (OG images)  │
                    │  Realtime (opcional)  │
                    └───────────────────────┘

Integrações externas:
  → GA4 (evento simulacao_concluida)
  → WhatsApp (link canônico api.whatsapp.com/send)
  → Google Ads (via conversão importada do GA4)
```

---

## 5. Estrutura de rotas

### Site público (indexado)

| Rota                             | Renderização                    | Origem do conteúdo                                    |
| -------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `/`                              | SSG                             | Home + calculadora (client)                           |
| `/guia-inss-de-obra`             | SSG                             | Fixo no repo (MDX ou React)                           |
| `/artigos`                       | ISR (revalidar 1h)              | `select * from artigos where publicado = true`        |
| `/artigos/[slug]`                | ISR (revalidar 1h)              | `select * from artigos where slug = $1 and publicado` |
| `/sobre`                         | SSG                             | Fixo                                                  |
| `/contato`                       | SSG                             | Fixo                                                  |
| `/politica/aviso-de-privacidade` | SSG                             | Fixo                                                  |
| `/sitemap.xml`                   | Server route (`app/sitemap.ts`) | Dinâmico (site fixo + artigos publicados)             |
| `/robots.txt`                    | Server route (`app/robots.ts`)  | Fixo                                                  |

### API pública

| Endpoint     | Método | Descrição                                                                      |
| ------------ | ------ | ------------------------------------------------------------------------------ |
| `/api/leads` | POST   | Recebe payload da calculadora, insere em `leads` (RLS: `anon` INSERT liberado) |
| `/api/vau`   | GET    | Retorna tabela VAU atual (cache 30 min)                                        |

### Admin (protegido, `/admin/*`)

| Rota                    | Descrição                   |
| ----------------------- | --------------------------- |
| `/login`                | Botão "Entrar com Google"   |
| `/admin`                | Dashboard (KPIs)            |
| `/admin/leads`          | Kanban + tabela             |
| `/admin/leads/[id]`     | Detalhe do lead (edição)    |
| `/admin/clientes`       | Lista de clientes           |
| `/admin/clientes/[id]`  | Detalhe do cliente          |
| `/admin/contratos`      | Lista de contratos          |
| `/admin/contratos/[id]` | Detalhe do contrato         |
| `/admin/artigos`        | Lista de artigos            |
| `/admin/artigos/novo`   | Editor de novo artigo       |
| `/admin/artigos/[id]`   | Editor de artigo existente  |
| `/admin/cases`          | Gerenciar cases de sucesso  |
| `/admin/faq`            | Gerenciar FAQ               |
| `/admin/vau`            | Editor da tabela VAU        |
| `/admin/usuarios`       | Gerenciar equipe (só admin) |
| `/admin/config`         | Configurações               |

### Rotas de sistema

- `/auth/callback` — callback do OAuth do Supabase
- `/api/auth/signout` — logout

---

## 6. URLs canônicas (SEO — não pode quebrar!)

O site atual tem 13 URLs indexadas com rank no Google. Estas URLs **precisam permanecer válidas** no novo site:

| URL canônica                                                             | Prioridade | O que é                       |
| ------------------------------------------------------------------------ | ---------- | ----------------------------- |
| `https://impostoeobra.com.br/`                                           | 1.0        | Home + calculadora            |
| `https://impostoeobra.com.br/guia-inss-de-obra/`                         | 0.95       | Guia pilar                    |
| `https://impostoeobra.com.br/artigos/`                                   | 0.9        | Índice de artigos             |
| `https://impostoeobra.com.br/artigos/artigo-notificacao-inss-obra.html`  | 0.9        | Artigo (2.114 palavras + FAQ) |
| `https://impostoeobra.com.br/artigos/artigo-regularizar-inss-obra.html`  | 0.9        | Artigo                        |
| `https://impostoeobra.com.br/artigos/custo-regularizar-inss-obra.html`   | 0.9        | Artigo                        |
| `https://impostoeobra.com.br/artigos/afericao-indireta-receita.html`     | 0.8        | Artigo                        |
| `https://impostoeobra.com.br/artigos/cobranca-inss-obra-alta.html`       | 0.8        | Artigo                        |
| `https://impostoeobra.com.br/artigos/erro-cno-receita.html`              | 0.8        | Artigo                        |
| `https://impostoeobra.com.br/artigos/erro-sero.html`                     | 0.8        | Artigo                        |
| `https://impostoeobra.com.br/artigos/erros-aumentam-inss-obra.html`      | 0.8        | Artigo                        |
| `https://impostoeobra.com.br/artigos/documentos-regularizacao-obra.html` | 0.7        | Artigo                        |
| `https://impostoeobra.com.br/artigos/consultar-pendencias-obra.html`     | 0.7        | Artigo                        |

**Sobre `.html` no final dos artigos:** o Next.js/App Router não gera `.html`. Duas opções:

- **Opção A (recomendada):** aceitar as URLs com `.html` como slug (matcher `/artigos/[slug]` recebe slug com `.html` e o resolve). Requer que o slug no banco tenha `.html` no fim ou lógica no route handler.
- **Opção B:** slug limpo (sem `.html`) + **301 permanente** de cada URL antiga com `.html` para nova sem. Configurar em `next.config.js` → `redirects()`. **Nunca** 302 (temporário) nem soft 404.

Escolher a opção B (mais limpa arquiteturalmente, resolve com redirects). Sitemap novo emite URLs sem `.html`; redirects garantem que os links externos antigos não quebrem.

Pasta é sempre `artigos/` (plural), nunca `artigo/`.

---

## 7. Schema do banco (Supabase Postgres)

Arquivo separado `SCHEMA_SUPABASE.sql` tem o DDL completo executável. Resumo:

### Tabelas principais

**`users`** — equipe interna

- `id uuid pk`, `email text unique`, `nome text`, `perfil text` (`admin`/`consultor`), `ativo bool`, `criado_em`, `ultimo_acesso`
- Sincroniza com Supabase Auth via trigger

**`leads`** — leads da calculadora

- 40+ colunas: dados pessoais, inputs da obra, resultados calculados, informações complementares, sistema
- FK opcional `cliente_id` (leads convertidos)
- FK `responsavel_id` (consultor que atende)
- Timestamps + soft delete (`deleted_at`)

**`clientes`** — leads convertidos em cliente

- Dados pessoais completos (CPF/CNPJ, RG, endereços, banco/PIX)
- FK `lead_id_origem`
- Timestamps + soft delete

**`contratos`** — contratos assinados

- FK `cliente_id`
- Número, valor, forma de pagamento, parcelas, datas
- Status (em vigor, concluído, cancelado)
- Soft delete

**`atividades`** — timeline unificada

- `ref_tipo` (`lead`, `cliente`, `contrato`), `ref_id`
- `tipo` (criação, edição, contato, nota, etc), `descricao`, `metadata_json`
- `data_hora`, `autor_id`

**`config`** — chave/valor de configurações

- `chave text pk`, `valor text`, `descricao text`

**`vau`** — tabela VAU por UF

- `uf text pk`, 7 colunas de valores por destinação, `vigencia text`

**`artigos`** — conteúdo do blog

- `id uuid pk`, `slug text unique`, `titulo`, `subtitulo`, `meta_description`, `og_image_url`
- `conteudo_mdx text` (corpo do artigo em MDX)
- `faq jsonb` (array de `{pergunta, resposta}` para FAQPage Schema)
- `schema_type text` (`Article`, `HowTo`, etc)
- `prioridade_seo numeric` (para sitemap)
- `publicado bool`, `data_publicacao`, `categoria`, `tags text[]`
- Timestamps + `autor_id`

**`cases`** — casos de sucesso

- `id`, `cliente_display`, `tipo_obra`, `economia_valor`, `economia_pct`, `descricao`, `publicado`, timestamps

**`faq`** — FAQ geral do site

- `id`, `pergunta`, `resposta`, `ordem`, `categoria`, `publicado`

### RLS Policies (segurança em nível de linha)

**Regra geral:**

- Tabelas de conteúdo público (`artigos`, `cases`, `faq`): SELECT liberado para `anon` WHERE `publicado = true`
- Tabela `vau`: SELECT liberado para `anon`
- Tabela `leads`: INSERT liberado para `anon` (webhook público); SELECT/UPDATE/DELETE só para `authenticated` que esteja em `users` com `ativo=true`
- Todas as outras tabelas: sem acesso para `anon`; para `authenticated`, condicionar às regras de perfil
- Perfil `admin` pode tudo; perfil `consultor` pode CRUD em leads/clientes/contratos/atividades mas não em `users`, `config`, `vau` (esses só admin)

Ver `SCHEMA_SUPABASE.sql` para SQL completo das policies.

---

## 8. Autenticação

**Provider:** Google OAuth via Supabase Auth.

**Fluxo:**

1. Usuário clica em "Entrar com Google" em `/login`
2. Supabase redireciona para Google
3. Google devolve token para `/auth/callback`
4. Middleware verifica se o email do usuário está em `public.users` com `ativo=true`
5. Se estiver, atualiza `ultimo_acesso` e redireciona pra `/admin`
6. Se NÃO estiver, faz logout e mostra "Acesso não autorizado. Contate o administrador."

**Gestão de usuários:**

- Admin adiciona novo usuário em `/admin/usuarios` (email + nome + perfil)
- Sistema envia email de convite (opcional) ou usuário simplesmente faz login pela primeira vez

**Middleware (`middleware.ts`):**

- Aplica-se a todas as rotas `/admin/*`
- Redireciona pra `/login` se não autenticado
- Verifica perfil e nega acesso se não estiver em `users.ativo=true`
- Rotas `/admin/usuarios`, `/admin/config`, `/admin/vau` requerem perfil `admin`

**Variáveis de ambiente:**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   (server-only, jamais expor)
```

---

## 9. Regras de negócio da calculadora — IN RFB nº 2.021/2021

**Este é o CORAÇÃO do sistema. Nada aqui pode divergir do que já está em produção.** A calculadora roda 100% no cliente (Client Component) — depende só das constantes e da fórmula abaixo, mais a tabela VAU (buscada de `/api/vau` com fallback hardcoded).

### 9.1 Fluxo do cálculo

```
1. Coleta inputs: Responsável (PF/PJ), Destinação, Tipo de obra, Categoria,
   Concreto usinado (Sim/Não), Pré-fabricado (Sim/Não), UF, Áreas.
2. VAU = tabela[UF][destinação]  (art. 25 §4 + Anexo I)
3. Área equivalente principal = área_principal × % equivalência(destinação, área)  (art. 25 §6)
4. Área para cálculo = área_eq_principal + (piscina_coberta × 0.50)
                                          + (piscina_descoberta × 0.25)  (art. 25 §9)
5. COD = VAU × área_para_cálculo  (art. 25 §5)
6. RMT_base = COD × CMO(tipo, destinação)  (art. 25 §16)
7. RMT = RMT_base × %_categoria  (art. 26 §4)
      × 0.80 se Edifício de Garagens  (art. 26 §6)
      × %_fator_social se PF  (art. 26 §1)
8. RMT_pos_prefab = RMT × (1 - 0.70 se pré-fab=Sim e tipo=Alvenaria, senão 0)  (art. 26 §2)
9. Dedução concreto usinado = 0.05 × COD × %_uso × %_abatimento_cat, se declarado  (art. 32 §3)
10. Base final = max(0, RMT_pos_prefab − dedução_concreto)
11. INSS_direto = RMT × alíquota  (art. 19)              → card "SEM redução"
12. INSS_reduzido = Base_final × alíquota                → card "COM redução legal"
13. Economia = INSS_direto − INSS_reduzido
```

### 9.2 Constantes (TypeScript)

```typescript
// Percentual de equivalência por destinação (art. 25 §6º)
export function percEquivalencia(
  destinacao: string,
  areaPrincipal: number,
): number {
  switch (destinacao) {
    case "Residencial Unifamiliar":
      return areaPrincipal <= 1000 ? 89 : 85;
    case "Residencial Multifamiliar":
      return areaPrincipal <= 1000 ? 90 : 86;
    case "Comercial Salas/Lojas":
      return areaPrincipal <= 3000 ? 86 : 83;
    case "Edifício de Garagens":
      return areaPrincipal <= 3000 ? 86 : 83;
    case "Galpão Ind.":
      return 95;
    case "Casa Popular":
      return 98;
    case "Conj. Hab. Popular":
      return 98;
    default:
      return 100;
  }
}

// CMO (art. 25 §16)
export const CMO = {
  padrao: { Alvenaria: 20, Mista: 15, Madeira: 15 },
  popular: { Alvenaria: 12, Mista: 7, Madeira: 7 },
} as const;

// Categoria (art. 26 §4)
export const PCT_CATEGORIA = {
  "Obra Nova": 100,
  Acréscimo: 100,
  Reforma: 35,
  Demolição: 10,
} as const;

// Fator Social — só PF (art. 26 §1)
export function fatorSocial(areaTotal: number): number {
  if (areaTotal <= 100) return 20;
  if (areaTotal <= 200) return 40;
  if (areaTotal <= 300) return 55;
  if (areaTotal <= 400) return 70;
  return 90;
}

// Alíquotas (art. 19)
export const ALIQUOTA_PF = 30.75;
export const ALIQUOTA_PJ = 33.125;

// Pré-fabricado (art. 26 §2)
export const RED_PRE_FAB = 70;

// Concreto usinado (art. 32 §3) — valores médios por destinação (Anexo I)
export const PCT_USO_USINADO: Record<string, number> = {
  "Residencial Unifamiliar": 40,
  "Residencial Multifamiliar": 55,
  "Casa Popular": 30,
  "Comercial Salas/Lojas": 60,
  "Conj. Hab. Popular": 35,
  "Galpão Ind.": 70,
  "Edifício de Garagens": 55,
};

export const PCT_ABAT_USINADO_CATEGORIA = {
  "Obra Nova": 100,
  Acréscimo: 100,
  Reforma: 35,
  Demolição: 0,
} as const;
```

### 9.3 Tabela VAU (Maio/2026)

Colunas: `[casa_pop, comercial, conj_pop, galpao, res_multi, res_uni, garagens]`.

```typescript
export const VAU_PERIODO = "Maio/2026";
export const VAU_HARDCODED: Record<string, number[]> = {
  AC: [2086.46, 3865.27, 2086.46, 1786.91, 3490.36, 4129.57, 3865.27],
  AL: [1326.26, 2400.63, 1326.26, 1121.31, 2146.17, 2490.35, 2400.63],
  AM: [2086.46, 3865.27, 2086.46, 1786.91, 3490.36, 4129.57, 3865.27],
  AP: [1851.74, 3296.17, 1851.74, 1566.69, 2903.45, 3287.4, 3296.17],
  BA: [1448.29, 2572.22, 1448.29, 1167.02, 2245.86, 2679.67, 2572.22],
  CE: [1650.76, 2769.59, 1650.76, 1312.04, 2433.2, 2801.99, 2769.59],
  DF: [1546.41, 2803.27, 1546.41, 1253.78, 2449.56, 2826.93, 2803.27],
  ES: [1865.69, 3140.88, 1865.69, 1423.27, 2818.57, 3312.94, 3140.88],
  GO: [1477.94, 2633.19, 1477.94, 1230.56, 2312.98, 2770.41, 2633.19],
  MA: [1277.75, 2233.21, 1277.75, 1065.62, 2186.92, 2286.3, 2233.21],
  MG: [1680.14, 2912.2, 1680.14, 1281.12, 2593.71, 2989.71, 2912.2],
  MS: [1258.32, 2283.21, 1258.32, 1029.23, 1836.95, 2193.11, 2283.21],
  MT: [2163.37, 3852.54, 2163.37, 1694.16, 3390.3, 3901.07, 3852.54],
  PA: [1611.44, 2793.12, 1611.44, 1320.85, 2480.8, 2839.89, 2793.12],
  PB: [1105.26, 2034.41, 1105.26, 935.03, 1809.84, 2042.34, 2034.41],
  PE: [1511.88, 2586.33, 1511.88, 1183.59, 2278.99, 2725.06, 2586.33],
  PI: [1277.75, 2233.21, 1277.75, 1065.62, 1971.74, 2286.3, 2233.21],
  PR: [1778.84, 3166.84, 1778.84, 1419.42, 2769.46, 3251.41, 3166.84],
  RJ: [1685.83, 2955.88, 1685.83, 1342.15, 2598.8, 3018.81, 2955.88],
  RN: [1490.31, 2465.68, 1490.31, 1185.36, 2215.72, 2580.83, 2465.68],
  RO: [1692.9, 2964.04, 1692.9, 1321.58, 2620.71, 2880.01, 2964.04],
  RR: [1862.65, 3500.38, 1862.65, 1677.86, 3072.41, 3584.71, 3500.38],
  RS: [1805.49, 3543.36, 1805.49, 1374.9, 2987.99, 3375.12, 3543.36],
  SC: [1942.0, 3320.29, 1942.0, 1535.94, 2889.5, 3405.28, 3320.29],
  SE: [1359.52, 2516.85, 1359.52, 1157.2, 2247.24, 2480.88, 2516.85],
  SP: [1476.87, 2614.71, 1476.87, 1231.83, 2296.89, 2633.5, 2614.71],
  TO: [1477.94, 2633.19, 1477.94, 1230.56, 2312.98, 2770.41, 2633.19],
};

export const CAT_IDX = {
  "Casa Popular": 0,
  "Comercial Salas/Lojas": 1,
  "Conj. Hab. Popular": 2,
  "Galpão Ind.": 3,
  "Residencial Multifamiliar": 4,
  "Residencial Unifamiliar": 5,
  "Edifício de Garagens": 6,
};
```

A calculadora primeiro chama `GET /api/vau` (que retorna do banco Supabase); se falhar ou não responder em 2s, usa `VAU_HARDCODED`.

---

## 10. UX da calculadora pública

### 10.1 4 etapas

**Etapa 1 — Informações da obra** (7 selects):
Responsável (PF/PJ), Destinação (7 opções), Tipo (Alvenaria/Mista/Madeira), Categoria (Obra Nova/Acréscimo/Reforma/Demolição), Concreto usinado (Sim/Não), Pré-fabricado (Não/Sim), UF (27 estados).

**Etapa 2 — Áreas** (5 inputs numéricos): Construção/ampliação, Reforma, Demolição, Piscina coberta, Piscina descoberta. Mostra em tempo real: Área total (bruta) e Área equivalente (após aplicar %).

**Etapa 3 — Seus dados**: Nome, DDD (2 dígitos), WhatsApp (8-9 dígitos), Email (opcional). Botão "Calcular agora".

**Etapa 4 — Resultado**: 2 cards (INSS sem/com deduções), caixa Economia, aviso amarelo condicional (se economia=0), linhas de detalhe, botão WhatsApp.

### 10.2 Hints educativos (críticos para conversão)

Abaixo do select "Concreto usinado?":

> 💡 95% das obras urbanas usam concreto usinado pelo menos na fundação ou laje. Na dúvida, marque **Sim** — nossa equipe valida com as notas fiscais.

Abaixo do select "Pré-fabricado":

> 💡 Inclui lajes pré-moldadas, estruturas pré-fabricadas e paredes/painéis prontos. Se o fornecedor emite NF separada desses materiais, marque **Sim**.

### 10.3 Cards de resultado

| Card     | Título                        | Sub                           |
| -------- | ----------------------------- | ----------------------------- |
| Vermelho | ❌ INSS sem deduções          | Valor cheio pelo cálculo SERO |
| Verde    | ✅ INSS estimado com deduções | Com aproveitamentos típicos   |

### 10.4 Aviso educativo (economia = R$ 0)

Bloco amarelo entre "Economia estimada" e as linhas de detalhe:

> **Sua simulação mostrou R$ 0 de economia direta.**
> Isso acontece porque você declarou que não há concreto usinado nem pré-fabricado na obra — esses são os mecanismos automáticos previstos no **art. 32 §3º** e no **art. 26 §2º** da IN RFB nº 2.021/2021.
> Mas a norma prevê **outras deduções** que dependem de análise documental — aproveitamento de remunerações declaradas (arts. 31 e 32), reenquadramento técnico da obra, deduções específicas por material. Identificamos essas oportunidades em praticamente **todos os contratos** que assumimos.
> **Fale com a nossa equipe** para uma análise gratuita do seu caso.

### 10.5 Envio do lead

Após renderizar o resultado, dispara `POST /api/leads` (fire-and-forget) com todo o payload. Se falhar, log no console mas não bloqueia o UX. O usuário sempre consegue clicar no WhatsApp.

### 10.6 Link do WhatsApp (mensagem contextual)

Ver seção 12.4 — mensagem varia conforme economia > 0 ou = 0.

---

## 11. UX do admin/CRM

### 11.1 Layout

Sidebar fixa à esquerda com nav (Dashboard, Leads, Clientes, Contratos, Artigos, Cases, FAQ, VAU, Usuários*, Config*). Topbar com nome do usuário logado + botão logout. \*Itens marcados só aparecem para perfil `admin`.

### 11.2 Dashboard (`/admin`)

- **KPIs em cards no topo:** leads este mês, taxa de conversão, valor total de contratos assinados, ticket médio
- **Gráfico:** leads por dia (últimos 30 dias)
- **Tabela:** últimos 10 leads recebidos
- **Card:** meta do mês vs. realizado (configurado em `config`)

### 11.3 Leads (`/admin/leads`)

- **Visualização Kanban** (default): colunas = status (Novo Lead, Contato iniciado, Em negociação, Proposta enviada, Aguardando resposta, Fechado — ganho, Fechado — perdido, Sem retorno). Drag & drop entre colunas.
- **Visualização Tabela** (alternativa): filtros por UF, status, período, responsável
- Botão "Novo lead" (criação manual)
- Clique no card → `/admin/leads/[id]`

### 11.4 Detalhe do Lead (`/admin/leads/[id]`)

4 cards na tela + timeline lateral:

**Card 1: Dados do Lead** — nome, email, DDD, WhatsApp, UF/cidade, status, produto, valor potencial, responsável, observações. Todos editáveis.

**Card 2: Dados da Obra (do simulador)** — responsável, destinação, tipo, categoria, concreto, pré-fab, todas as áreas. Editáveis (admin pode ajustar se cliente errou).

**Card 3: Cálculos do Simulador** — VAU, COD, RMT, CMO, categoria, FS, alíquota, red. pré-fab, dedução concreto, INSS direto/reduzido, economia. Editáveis.

**Card 4: Informações complementares (Fase 2B — preenchido pelo consultor)**

- Folha mensal estimada (R$)
- Meses de obra com folha
- NF de concreto usinado (R$)
- NF de pré-fabricado (R$)

**Card 5: Fundamentação do cálculo** — texto explicativo com base normativa + 2 linhas de 3 cards:

- Linha 1: cards do simulador (SEM redução / COM redução / Economia %)
- Linha 2: cards complementares (recalculados com base nos 4 campos do Card 4). Ficam opacos se nenhum campo estiver preenchido.

**Ações:** Salvar, WhatsApp (link contextual), Material de Apoio, Proposta Comercial, Converter em Cliente.

**Timeline lateral:** atividades do lead em ordem cronológica (criação, edições, notas, mudanças de status).

### 11.5 Cálculo complementar (frontend)

```typescript
function calcularComplementar(l: Lead): ComplementarResult {
  const folha = l.cmpl_folha_mensal || 0;
  const meses = l.cmpl_meses_folha || 0;
  const nfConc = l.cmpl_nf_concreto_usinado || 0;
  const nfPfab = l.cmpl_nf_prefabricado || 0;

  const co = l.co || 0;
  const rmt = l.rmt || 0;
  const aliq = l.aliquota_pct || 0;

  // Aproveitamento (art. 31)
  const aproveitamento = folha * meses;

  // Pré-fabricado real (art. 26 §2)
  const aplicaPfab = co > 0 && nfPfab >= co * 0.4;
  const redPfabPct = aplicaPfab ? 70 : 0;
  const rmtPosPfab = rmt * (1 - redPfabPct / 100);

  // Concreto usinado real (art. 32 §3 com NF)
  const dedConcreto = nfConc * 0.05;

  const baseComplementar = Math.max(
    0,
    rmtPosPfab - dedConcreto - aproveitamento,
  );
  const inssDir = rmt * (aliq / 100);
  const inssRed = baseComplementar * (aliq / 100);
  const economia = Math.max(0, inssDir - inssRed);
  const economiaPct = inssDir > 0 ? Math.round((economia / inssDir) * 100) : 0;

  return {
    aproveitamento,
    dedConcreto,
    redPfabPct,
    base: baseComplementar,
    inssDir,
    inssRed,
    economia,
    economiaPct,
    preenchido: folha > 0 || nfConc > 0 || nfPfab > 0,
  };
}
```

### 11.6 Editor de Artigos (`/admin/artigos/[id]`)

- Campos: título, subtítulo, slug (readonly após criar), meta description, OG image (upload → Supabase Storage), categoria, tags (multiselect), prioridade SEO
- Editor rich text (Tiptap ou Novel) para o corpo (`conteudo_mdx`)
- Seção "FAQ" (adicionar pares pergunta/resposta) — grava em `artigos.faq jsonb`
- Toggle "Publicado"
- Botão "Preview" (renderiza como o público vê)
- Botão "Salvar"
- Ao publicar, revalidar o cache do índice `/artigos` e da URL `/artigos/[slug]` (via `revalidatePath`)

### 11.7 Editor de VAU (`/admin/vau`)

- Tabela com 27 linhas × 7 colunas (uma por destinação)
- Edição inline
- Botão "Salvar tudo"
- Campo "Vigência" (ex: "Junho/2026")
- Ao salvar, dispara `revalidateTag("vau")` para a home puxar novo valor

---

## 12. Integrações

### 12.1 Endpoint público `/api/leads`

Substitui o webhook Apps Script atual. Recebe o payload da calculadora e insere direto em `leads`.

**Método:** `POST`
**Content-Type:** `application/json`
**CORS:** liberar `impostoeobra.com.br` (o mesmo domínio, então default do Next.js já resolve)
**RLS:** policy `INSERT` liberada para `role=anon` em `leads`

**Payload esperado:**

```typescript
type LeadPayload = {
  // Dados do lead
  nome: string;
  ddd: string;
  whatsapp: string;
  email: string;
  // Inputs
  resp: "Pessoa Física" | "Pessoa Jurídica";
  dest: string;
  tipo: "Alvenaria" | "Mista" | "Madeira";
  categoria: "Obra Nova" | "Acréscimo" | "Reforma" | "Demolição";
  concreto: "Sim" | "Não";
  prefab: "Sim" | "Não";
  uf: string;
  a_construcao: number;
  a_reforma: number;
  a_demolicao: number;
  a_pcoberta: number;
  a_pdescoberta: number;
  // Cálculos
  area_total: number;
  area_total_calculo: number;
  area_principal_bruta: number;
  area_principal_equiv: number;
  pct_equivalencia: number;
  vau: number;
  co: number;
  rmt: number;
  cmo_pct: number;
  pct_categoria: number;
  fator_social_pct: number | null;
  aliquota_pct: number;
  reducao_pre_fab_pct: number;
  ded_concreto_usinado: number;
  pct_uso_usinado: number;
  pct_abat_usinado_cat: number;
  inss_direto: number;
  inss_reduzido: number;
  economia: number;
};
```

O handler:

- Valida payload com Zod
- Insere na tabela `leads` com `status='Novo Lead'`, `origem='simulador'`, `valor_potencial=economia`
- Cria uma entrada em `atividades` com tipo `criacao`
- Retorna `{ ok: true, id }` ou `{ ok: false, error }`

Cliente deve fazer `fetch` fire-and-forget com `mode: 'no-cors'` NÃO é necessário aqui — é mesmo domínio.

### 12.2 Endpoint público `/api/vau`

```typescript
GET /api/vau
Response: { ok: true, data: Record<UF, number[]>, vigencia: string }
```

Cache: `Cache-Control: public, max-age=1800, s-maxage=1800` (30 min).

### 12.3 Google Analytics 4

**ID:** `G-8CYR5J0Z3L` (NÃO mudar).

Snippet como primeiro filho da `<head>`, uma vez por página. No App Router, usar `next/script`:

```tsx
// app/layout.tsx
import Script from "next/script";

<html>
  <head>
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=G-8CYR5J0Z3L`}
      strategy="afterInteractive"
    />
    <Script id="gtag-init" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-8CYR5J0Z3L');
      `}
    </Script>
  </head>
  ...
</html>;
```

**Evento de conversão** (após cálculo com sucesso):

```javascript
gtag("event", "simulacao_concluida", {
  event_category: "lead",
  event_label: "calculadora_inss_obra",
  value: economia || 0,
});
```

Esse evento **já é conversão no GA4 e importado no Google Ads (conta 168-777-2472)**. Não renomear.

### 12.4 WhatsApp

Link canônico dos CTAs genéricos:

```
https://api.whatsapp.com/send?phone=5561993982653&text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20como%20regularizar%20minha%20obra%20perante%20a%20Receita%20Federal%20com%20economia
```

Botão "Falar no WhatsApp" no resultado da calculadora (mensagem contextual):

- Se `economia > 0`:

  > Olá, me chamo [NOME]!
  > Simulei o INSS da minha obra no site.
  > INSS sem deduções: [R$ X]
  > INSS estimado com deduções: [R$ Y]
  > Economia potencial: [R$ Z]
  > Gostaria de um orçamento para regularizar a obra.

- Se `economia == 0`:
  > Olá, me chamo [NOME]!
  > Simulei o INSS da minha obra no site.
  > Valor estimado pela norma: [R$ X]
  > Não declarei concreto usinado nem pré-fabricado na simulação, mas gostaria de saber se há outros benefícios fiscais aplicáveis ao meu caso. Pode me ajudar?

---

## 13. SEO

### 13.1 Sitemap dinâmico

`app/sitemap.ts`:

```typescript
import { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();
  const { data: artigos } = await supabase
    .from("artigos")
    .select("slug, updated_at, prioridade_seo")
    .eq("publicado", true);

  const base = "https://impostoeobra.com.br";
  const staticUrls = [
    { url: `${base}/`, priority: 1.0, changeFrequency: "weekly" as const },
    {
      url: `${base}/guia-inss-de-obra`,
      priority: 0.95,
      changeFrequency: "monthly" as const,
    },
    {
      url: `${base}/artigos`,
      priority: 0.9,
      changeFrequency: "weekly" as const,
    },
    { url: `${base}/sobre`, priority: 0.5, changeFrequency: "yearly" as const },
    {
      url: `${base}/contato`,
      priority: 0.5,
      changeFrequency: "yearly" as const,
    },
    {
      url: `${base}/politica/aviso-de-privacidade`,
      priority: 0.3,
      changeFrequency: "yearly" as const,
    },
  ];

  const artigoUrls = (artigos || []).map((a) => ({
    url: `${base}/artigos/${a.slug}`,
    lastModified: new Date(a.updated_at),
    priority: a.prioridade_seo,
    changeFrequency: "monthly" as const,
  }));

  return [...staticUrls, ...artigoUrls];
}
```

### 13.2 Robots

`app/robots.ts`:

```typescript
export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/auth/"] },
    ],
    sitemap: "https://impostoeobra.com.br/sitemap.xml",
  };
}
```

### 13.3 Redirects dos artigos com `.html`

`next.config.js`:

```javascript
module.exports = {
  async redirects() {
    return [
      {
        source: "/artigos/:slug.html",
        destination: "/artigos/:slug",
        permanent: true,
      },
    ];
  },
};
```

### 13.4 Metadata

Cada página usa `generateMetadata()` com título único, description, canonical, OG completo. Ver seção 13 do handoff v1 para detalhes.

### 13.5 Schema.org (JSON-LD)

- Home: `ProfessionalService`
- Índice `/artigos`: `CollectionPage`
- Cada artigo: `Article` (+ `FAQPage` se tem FAQ)
- Guia: `Article`

Emitir via `<script type="application/ld+json">` no `<head>` de cada página.

---

## 14. Migração de dados

### 14.1 Artigos (10 HTMLs → tabela `artigos`)

Script `scripts/migrate-artigos.ts`:

- Lê cada HTML de `github.com/impostoeobraconsultoria-eng/impostoeobra/artigos/*.html`
- Extrai título (H1), meta description, OG image
- Converte corpo (após remover header/footer/scripts) para MDX
- Detecta FAQ accordion no artigo `artigo-notificacao-inss-obra.html` e grava em `artigos.faq jsonb`
- Insere na tabela com `slug` = nome do arquivo sem `.html`, `publicado = true`

### 14.2 Leads (Google Sheets → tabela `leads`)

Script `scripts/migrate-leads.ts`:

- Autentica no Google Sheets via service account
- Lê a aba `Leads` da planilha `1HloRJ753r2iD5UTP7W34T8F9fC0sF2aXa1gT9ui68N8`
- Mapeia cada linha para o schema Supabase (colunas já batem)
- INSERT em batch (chunks de 500)
- Grava id original em campo `legacy_id` (para rastreabilidade)

### 14.3 Clientes, Contratos, Atividades

Mesmo padrão do 14.2 para cada aba.

### 14.4 Config e VAU

- `Config` → tabela `config`
- `TabelaVAU` → tabela `vau`

### 14.5 Usuários

- Criar manualmente (via `/admin/usuarios`) os 2-3 usuários iniciais (Paulo, Wenderson)
- Primeiro usuário admin é criado direto no SQL (seed inicial)

---

## 15. Convenções obrigatórias

- [ ] Toda página HTML tem GA4 como primeiro filho do `<head>`
- [ ] Todo CTA de WhatsApp usa a URL canônica
- [ ] Rodapé linka para `/politica/aviso-de-privacidade`
- [ ] Pasta `artigos/` (plural)
- [ ] Meta canonical em URL absoluta
- [ ] Nenhuma URL do sitemap antigo retorna 404 (via redirect 301)
- [ ] Evento `simulacao_concluida` dispara com nome exato
- [ ] Endpoint `/api/leads` recebe todos os campos da seção 12.1
- [ ] Zero uso de `localStorage` em server components
- [ ] Todos os cenários da seção 16 batem número-a-número
- [ ] Admin protegido por middleware + RLS
- [ ] Rich text do editor sanitiza HTML (usar `sanitize-html` ou equivalente)
- [ ] Upload de imagens do editor vai pro Supabase Storage (bucket `og-images`)

---

## 16. Checklist de aceitação — cenários numéricos

Antes de trocar o DNS, rodar estas 6 simulações no site novo:

| #   | Inputs                                                                        | INSS sem ded. | INSS com ded. | Economia                |
| --- | ----------------------------------------------------------------------------- | ------------- | ------------- | ----------------------- |
| A   | Casa 200m², PF, Alvenaria, Obra Nova, DF, concreto=Sim, prefab=Não            | R$ 12.378,56  | R$ 9.283,92   | R$ 3.094,64             |
| B   | Casa 500m², PF, Alvenaria, Obra Nova, DF, concreto=Sim, prefab=Não            | R$ 69.629,41  | R$ 61.892,81  | R$ 7.736,60             |
| C   | Multifamiliar 2.500m², PJ, Alvenaria, Obra Nova, SP, concreto=Sim, prefab=Não | R$ 327.163,27 | R$ 282.178,32 | R$ 44.984,95            |
| D   | Comercial 800m², PJ, Alvenaria, Obra Nova, SP, concreto=Sim, prefab=Sim       | R$ 119.178,48 | R$ 17.876,77  | R$ 101.301,71           |
| E   | Casa 200m², PF, Alvenaria, Obra Nova, DF, concreto=Não, prefab=Não            | R$ 12.378,56  | R$ 12.378,56  | R$ 0,00 (aviso amarelo) |
| F   | Reforma 150m², PJ, Multifamiliar, Mista, SP, concreto=Sim, prefab=Não         | R$ 5.392,49   | R$ 4.403,86   | R$ 988,62               |

Diferenças de até R$ 0,01 são aceitáveis (arredondamento).

**Testes adicionais do admin:**

- [ ] Login com Google funcional
- [ ] Usuário fora da tabela `users` é bloqueado
- [ ] Criar/editar lead, cliente, contrato, artigo
- [ ] Publicar artigo → aparece em `/artigos` público
- [ ] Editar tabela VAU → home puxa novo valor
- [ ] Kanban de leads: drag & drop entre colunas persiste no banco
- [ ] Cálculo complementar da tela de lead bate com os cenários

---

## 17. O que NÃO fazer

- ❌ Não usar `wa.me/...` — usar `api.whatsapp.com/send?...`
- ❌ Não criar pasta `artigo/` (singular)
- ❌ Não mudar ID do GA4
- ❌ Não renomear evento `simulacao_concluida`
- ❌ Não mudar URLs canônicas sem 301 permanente
- ❌ Não pedir dados sensíveis (folha, empregados) na calculadora pública — só no admin
- ❌ Não incluir "Imposto & Obra Consultoria" como parte em contratos advocatícios
- ❌ Não duplicar Google Tag
- ❌ Não usar `localStorage` em server components
- ❌ Não expor `SUPABASE_SERVICE_ROLE_KEY` no client
- ❌ Não desabilitar RLS em nenhuma tabela
- ❌ Não deletar a planilha CRM antiga antes de 60 dias pós-cutover

---

## 18. Referências (código atual)

- **Repo público atual:** `github.com/impostoeobraconsultoria-eng/impostoeobra`
- Estrutura:
  - `novo-site/index.html` — home + calculadora (JS ~linha 970 tem a fórmula)
  - `novo-site/artigos/*.html` — 10 artigos
  - `novo-site/guia-inss-de-obra/index.html` — página pilar
  - `novo-site/politica/aviso-de-privacidade.html`
  - `novo-site/sobre/`, `novo-site/contato/`
  - `novo-site/sitemap.xml`, `novo-site/robots.txt`
  - `CRM/apps-script/Codigo.gs` — backend do CRM atual (referência do schema)
  - `CRM/crm/assets/app.js` — SPA do CRM atual (referência do UX)

---

**FIM DO HANDOFF v2.** Se algo estiver ambíguo, o Codex deve parar e perguntar antes de assumir. Cada regra aqui tem meses de teste em produção por trás.
