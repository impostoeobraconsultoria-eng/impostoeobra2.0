# Cron de lembretes da Agenda

O endpoint da Fase 1 é `GET /api/cron/agenda-lembretes` e exige o header
`Authorization: Bearer <AGENDA_CRON_SECRET>`.

## 1. Gerar o segredo

No PowerShell:

```powershell
$bytes = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$secret = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
$secret | Set-Clipboard
```

Cadastre o valor como `AGENDA_CRON_SECRET` na Vercel para Production, Preview
e Development. Faça redeploy sem cache.

## 2. Configurar Vault e Supabase Cron

Depois do deploy em produção, execute o bloco V11.4 de
`SQL_REFINAMENTO_V11.sql`, usando a URL
`https://impostoeobra.com.br/api/cron/agenda-lembretes` e o mesmo segredo.
O agendamento usa `net.http_get` a cada cinco minutos.

## 3. Validar

Confirme o job em `cron.job`, as execuções em `cron.job_run_details` e o HTTP
200 em `net._http_response`. Para um teste manual:

```powershell
Invoke-RestMethod -Method Get `
  -Uri "https://impostoeobra.com.br/api/cron/agenda-lembretes" `
  -Headers @{ Authorization = "Bearer $secret" }
```

Nunca grave o segredo em arquivo versionado ou em variável `NEXT_PUBLIC_*`.
