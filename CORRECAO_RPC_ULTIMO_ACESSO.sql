-- =============================================================================
-- RPC registrar_ultimo_acesso — rodar UMA vez no SQL Editor do Supabase
--
-- Contexto: a policy geral de UPDATE em public.users é restrita a admin
-- (perfil = 'admin'). Isso impede que um consultor comum atualize a coluna
-- ultimo_acesso do próprio usuário no login.
--
-- Solução: função SECURITY DEFINER sem parâmetros que:
--   - identifica o usuário pelo JWT (auth.jwt()->>'email')
--   - atualiza SÓ a linha desse usuário (impossível mexer em outros)
--   - atualiza SÓ a coluna ultimo_acesso (não perfil, ativo, email, etc)
--   - só executa se o usuário estiver ativo (evita ressuscitar conta desativada)
-- =============================================================================

create or replace function public.registrar_ultimo_acesso() returns void as $$
begin
  update public.users
     set ultimo_acesso = now()
   where email = auth.jwt()->>'email'
     and ativo = true;
end;
$$ language plpgsql
   security definer
   volatile
   set search_path = public, pg_temp;

-- EXECUTE restrito a usuários autenticados
revoke execute on function public.registrar_ultimo_acesso() from public;
grant execute on function public.registrar_ultimo_acesso() to authenticated;
