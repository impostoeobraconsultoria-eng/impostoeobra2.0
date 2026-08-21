# Scripts de migração

Os dois scripts operam em **dry-run por padrão**. A flag `--commit` é obrigatória
para gravar no Supabase. Execute primeiro o dry-run, confira contagens e amostras,
faça um backup do destino e só então execute o commit.

## Artigos do repositório antigo

```powershell
pnpm migrate:artigos
pnpm migrate:artigos --commit
pnpm migrate:artigos --commit --overwrite
```

O script lê os dez HTMLs públicos do repositório antigo, sanitiza o conteúdo,
converte links internos para URLs canônicas, extrai FAQs e preserva metadados.
Por padrão, registros existentes não são sobrescritos. `--overwrite` deve ser
usado somente após revisão explícita do plano.

Variáveis opcionais: `ARTICLES_SOURCE_REPOSITORY`, `ARTICLES_SOURCE_BRANCH` e
`MIGRATION_AUTHOR_EMAIL`.

## CRM do Google Sheets

Compartilhe a planilha com o `client_email` da service account e forneça a chave
somente no ambiente local:

```powershell
$env:GOOGLE_SHEETS_SA_KEY='<JSON ou JSON em base64>'
pnpm migrate:crm
pnpm migrate:crm --commit
```

O acesso ao Google usa apenas o escopo de leitura. IDs determinísticos mantêm as
relações entre leads, clientes, contratos e atividades e tornam novas execuções
idempotentes.

## Variáveis para gravação

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

A service role é usada exclusivamente pelos scripts Node locais e jamais deve ser
exposta em código cliente ou commitada. Os scripts não alteram schema nem RLS.
