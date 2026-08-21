-- Conversão atômica de lead em cliente.
-- SECURITY INVOKER: todas as operações continuam submetidas às policies RLS
-- da sessão autenticada que chamou a função.

update public.leads
   set convertido_em = coalesce(updated_at, data_hora, now())
 where cliente_id is not null
   and convertido_em is null;

create or replace function public.converter_lead_em_cliente(p_lead_id uuid)
returns uuid
language plpgsql
security invoker
volatile
set search_path = public, pg_temp
as $$
declare
  v_cliente_id uuid;
  v_autor_id uuid;
begin
  if not public.is_active_user() then
    raise exception 'Usuário não autorizado';
  end if;

  select id into v_autor_id
    from public.users
   where email = auth.jwt()->>'email'
     and ativo = true;

  if exists (
    select 1 from public.leads
     where id = p_lead_id
       and deleted_at is null
       and cliente_id is not null
  ) then
    raise exception 'Lead já convertido';
  end if;

  insert into public.clientes (
    lead_id_origem, nome, ddd, telefone, telefone_normalizado, email,
    obra_end_cidade, obra_end_uf, obra_tipo, criado_por
  )
  select
    id, nome, ddd, whatsapp, telefone_normalizado, email,
    cidade, uf, tipo, v_autor_id
  from public.leads
  where id = p_lead_id
    and deleted_at is null
    and cliente_id is null
  returning id into v_cliente_id;

  if v_cliente_id is null then
    raise exception 'Lead não encontrado ou já convertido';
  end if;

  update public.leads
     set cliente_id = v_cliente_id,
         convertido_em = now(),
         status = 'Fechado — ganho',
         updated_by = v_autor_id
   where id = p_lead_id;

  insert into public.atividades (
    ref_tipo, ref_id, tipo, descricao, autor_id, metadata_json
  ) values (
    'lead', p_lead_id, 'conversao_cliente',
    'Lead convertido em cliente', v_autor_id,
    jsonb_build_object('cliente_id', v_cliente_id, 'lead_id', p_lead_id)
  );

  insert into public.atividades (
    ref_tipo, ref_id, tipo, descricao, autor_id, metadata_json
  ) values (
    'cliente', v_cliente_id, 'criacao',
    'Cliente criado a partir de lead', v_autor_id,
    jsonb_build_object('lead_id', p_lead_id, 'cliente_id', v_cliente_id)
  );

  return v_cliente_id;
end;
$$;

revoke execute on function public.converter_lead_em_cliente(uuid) from public;
revoke execute on function public.converter_lead_em_cliente(uuid) from anon;
grant execute on function public.converter_lead_em_cliente(uuid) to authenticated;
