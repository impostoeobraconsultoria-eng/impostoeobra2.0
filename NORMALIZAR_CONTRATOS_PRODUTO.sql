-- Normaliza somente modalidades legadas que podem ser identificadas com segurança.
-- Outros valores permanecem intactos para correção manual no admin.
update public.contratos
set produto = 'obra_andamento'
where produto ilike '%andamento%'
  and produto <> 'obra_andamento';

update public.contratos
set produto = 'obra_finalizada'
where (produto ilike '%finaliz%' or produto ilike '%concluid%')
  and produto <> 'obra_finalizada';
