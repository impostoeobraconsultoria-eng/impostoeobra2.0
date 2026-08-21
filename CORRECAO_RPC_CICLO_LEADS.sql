-- RPCs transacionais do ciclo de vida de leads (V4.1).
-- SECURITY INVOKER: todas as operações continuam sujeitas às RLS do usuário.

create or replace function public.inativar_lead(
  p_lead_id uuid,
  p_motivo_id uuid,
  p_detalhamento text,
  p_contato_futuro boolean,
  p_data_contato_futuro date
) returns void
language plpgsql
security invoker
volatile
set search_path = public, pg_temp as $$
declare
  v_user_id uuid := public.current_active_user_id();
  v_lead public.leads%rowtype;
  v_motivo public.motivos_inativacao%rowtype;
  v_evento_id uuid;
  v_horario text;
  v_inicio timestamptz;
  v_descricao text;
begin
  if v_user_id is null then raise exception 'Usuário não autorizado.'; end if;
  if length(coalesce(p_detalhamento, '')) > 500 then
    raise exception 'O detalhamento deve ter no máximo 500 caracteres.';
  end if;
  if coalesce(p_contato_futuro, false) and
     (p_data_contato_futuro is null or p_data_contato_futuro <= current_date) then
    raise exception 'A próxima tentativa deve ser a partir de amanhã.';
  end if;

  select * into v_lead from public.leads
   where id = p_lead_id and deleted_at is null and convertido_em is null
   for update;
  if not found then raise exception 'Lead não encontrado ou já convertido.'; end if;

  select * into v_motivo from public.motivos_inativacao
   where id = p_motivo_id and ativo = true;
  if not found then raise exception 'Motivo de inativação inválido ou inativo.'; end if;

  update public.leads set
    status_ativacao = 'inativo',
    motivo_inativacao_id = v_motivo.id,
    detalhamento_inativacao = nullif(btrim(p_detalhamento), ''),
    inativado_em = now(),
    inativado_por = v_user_id,
    contato_futuro = coalesce(p_contato_futuro, false),
    data_contato_futuro = case when p_contato_futuro then p_data_contato_futuro else null end,
    ultima_etapa_kanban = v_lead.status,
    updated_by = v_user_id
  where id = p_lead_id;

  v_descricao := 'Motivo original da inativação: ' || v_motivo.rotulo ||
    '. Detalhamento: ' || coalesce(nullif(btrim(p_detalhamento), ''), 'não informado') ||
    '. Última etapa: ' || coalesce(v_lead.status, 'não informada') || '.';

  select id into v_evento_id from public.eventos_agenda
   where ref_tipo = 'lead' and ref_id = p_lead_id and tipo = 'follow_up'
     and deleted_at is null and status = 'agendado'
   order by criado_em desc limit 1 for update;

  if coalesce(p_contato_futuro, false) then
    select valor into v_horario from public.config
     where chave = 'inativacao_reativar_horario_padrao';
    if v_horario is null or v_horario !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      v_horario := '09:00';
    end if;
    v_inicio := (p_data_contato_futuro::text || ' ' || v_horario || ' America/Sao_Paulo')::timestamptz;
    if v_evento_id is null then
      insert into public.eventos_agenda (
        titulo, descricao, tipo, data_hora_inicio, dia_inteiro,
        lembrete_minutos, ref_tipo, ref_id, criado_por, responsavel_id, status
      ) values (
        'Retomar contato — ' || v_lead.nome, v_descricao, 'follow_up', v_inicio, false,
        1440, 'lead', p_lead_id, v_user_id, coalesce(v_lead.responsavel_id, v_user_id), 'agendado'
      );
    else
      update public.eventos_agenda set
        titulo = 'Retomar contato — ' || v_lead.nome,
        descricao = v_descricao,
        data_hora_inicio = v_inicio,
        lembrete_minutos = 1440,
        responsavel_id = coalesce(v_lead.responsavel_id, v_user_id)
      where id = v_evento_id;
    end if;
  elsif v_evento_id is not null then
    update public.eventos_agenda set status = 'cancelado' where id = v_evento_id;
  end if;

  insert into public.atividades (ref_tipo, ref_id, tipo, descricao, metadata_json, autor_id)
  values ('lead', p_lead_id, 'lead_inativado',
    'Inativado — motivo: ' || v_motivo.rotulo,
    jsonb_build_object(
      'motivo_id', v_motivo.id,
      'detalhamento', nullif(btrim(p_detalhamento), ''),
      'contato_futuro', coalesce(p_contato_futuro, false),
      'data_contato_futuro', case when p_contato_futuro then p_data_contato_futuro else null end
    ), v_user_id);
end;
$$;

create or replace function public.atualizar_contato_futuro_lead(
  p_lead_id uuid,
  p_contato_futuro boolean,
  p_data_contato_futuro date
) returns void
language plpgsql
security invoker
volatile
set search_path = public, pg_temp as $$
declare
  v_user_id uuid := public.current_active_user_id();
  v_lead public.leads%rowtype;
  v_motivo text;
  v_evento_id uuid;
  v_horario text;
  v_inicio timestamptz;
begin
  if v_user_id is null then raise exception 'Usuário não autorizado.'; end if;
  if coalesce(p_contato_futuro, false) and
     (p_data_contato_futuro is null or p_data_contato_futuro <= current_date) then
    raise exception 'A próxima tentativa deve ser a partir de amanhã.';
  end if;
  select * into v_lead from public.leads
   where id = p_lead_id and deleted_at is null and convertido_em is null
     and status_ativacao = 'inativo' for update;
  if not found then raise exception 'Lead inativo não encontrado.'; end if;
  select rotulo into v_motivo from public.motivos_inativacao where id = v_lead.motivo_inativacao_id;

  update public.leads set
    contato_futuro = coalesce(p_contato_futuro, false),
    data_contato_futuro = case when p_contato_futuro then p_data_contato_futuro else null end,
    updated_by = v_user_id
  where id = p_lead_id;

  select id into v_evento_id from public.eventos_agenda
   where ref_tipo='lead' and ref_id=p_lead_id and tipo='follow_up'
     and deleted_at is null and status='agendado'
   order by criado_em desc limit 1 for update;
  if coalesce(p_contato_futuro, false) then
    select valor into v_horario from public.config where chave='inativacao_reativar_horario_padrao';
    if v_horario is null or v_horario !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then v_horario := '09:00'; end if;
    v_inicio := (p_data_contato_futuro::text || ' ' || v_horario || ' America/Sao_Paulo')::timestamptz;
    if v_evento_id is null then
      insert into public.eventos_agenda (
        titulo,descricao,tipo,data_hora_inicio,dia_inteiro,lembrete_minutos,
        ref_tipo,ref_id,criado_por,responsavel_id,status
      ) values (
        'Retomar contato — ' || v_lead.nome,
        'Motivo original da inativação: ' || coalesce(v_motivo,'não informado') ||
          '. Detalhamento: ' || coalesce(v_lead.detalhamento_inativacao,'não informado') ||
          '. Última etapa: ' || coalesce(v_lead.ultima_etapa_kanban,'não informada') || '.',
        'follow_up',v_inicio,false,1440,'lead',p_lead_id,v_user_id,
        coalesce(v_lead.responsavel_id,v_user_id),'agendado'
      );
    else
      update public.eventos_agenda set data_hora_inicio=v_inicio, lembrete_minutos=1440
       where id=v_evento_id;
    end if;
  elsif v_evento_id is not null then
    update public.eventos_agenda set status='cancelado' where id=v_evento_id;
  end if;
  insert into public.atividades (ref_tipo,ref_id,tipo,descricao,metadata_json,autor_id)
  values ('lead',p_lead_id,'edicao_contato_futuro','Próxima tentativa de contato atualizada',
    jsonb_build_object('contato_futuro',coalesce(p_contato_futuro,false),'data_contato_futuro',p_data_contato_futuro),v_user_id);
end;
$$;

create or replace function public.reativar_lead(p_lead_id uuid, p_etapa text) returns void
language plpgsql
security invoker
volatile
set search_path = public, pg_temp as $$
declare
  v_user_id uuid := public.current_active_user_id();
  v_lead public.leads%rowtype;
  v_motivo text;
begin
  if v_user_id is null then raise exception 'Usuário não autorizado.'; end if;
  if not exists (select 1 from public.funil_etapas where nome=p_etapa) then
    raise exception 'Etapa do funil inválida.';
  end if;
  select * into v_lead from public.leads
   where id=p_lead_id and deleted_at is null and convertido_em is null
     and status_ativacao='inativo' for update;
  if not found then raise exception 'Lead inativo não encontrado.'; end if;
  select rotulo into v_motivo from public.motivos_inativacao where id=v_lead.motivo_inativacao_id;

  update public.leads set
    status_ativacao='ativo', status=p_etapa, motivo_inativacao_id=null,
    detalhamento_inativacao=null, inativado_em=null, inativado_por=null,
    contato_futuro=null, data_contato_futuro=null, updated_by=v_user_id
  where id=p_lead_id;
  update public.eventos_agenda set status='cancelado'
   where ref_tipo='lead' and ref_id=p_lead_id and tipo='follow_up'
     and deleted_at is null and status='agendado';
  insert into public.atividades (ref_tipo,ref_id,tipo,descricao,metadata_json,autor_id)
  values ('lead',p_lead_id,'lead_reativado',
    'Reativado como ' || p_etapa || '. Motivo original: ' || coalesce(v_motivo,'não informado'),
    jsonb_build_object('etapa',p_etapa,'motivo_original',v_motivo),v_user_id);
end;
$$;

revoke execute on function public.inativar_lead(uuid,uuid,text,boolean,date) from public, anon;
revoke execute on function public.atualizar_contato_futuro_lead(uuid,boolean,date) from public, anon;
revoke execute on function public.reativar_lead(uuid,text) from public, anon;
grant execute on function public.inativar_lead(uuid,uuid,text,boolean,date) to authenticated;
grant execute on function public.atualizar_contato_futuro_lead(uuid,boolean,date) to authenticated;
grant execute on function public.reativar_lead(uuid,text) to authenticated;
