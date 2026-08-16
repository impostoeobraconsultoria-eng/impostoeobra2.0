-- Restringe o soft delete/restauração a administradores sem impedir que
-- consultores editem normalmente clientes e contratos ativos.

drop policy if exists clientes_update_active on public.clientes;
create policy clientes_update_active on public.clientes
  for update to authenticated
  using (
    (select public.is_active_user())
    and (deleted_at is null or (select public.is_admin()))
  )
  with check (
    (select public.is_active_user())
    and (deleted_at is null or (select public.is_admin()))
  );

drop policy if exists contratos_update_active on public.contratos;
create policy contratos_update_active on public.contratos
  for update to authenticated
  using (
    (select public.is_active_user())
    and (deleted_at is null or (select public.is_admin()))
  )
  with check (
    (select public.is_active_user())
    and (deleted_at is null or (select public.is_admin()))
  );
