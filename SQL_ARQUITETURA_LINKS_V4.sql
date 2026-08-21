-- Aplicado no Supabase em 21/08/2026.
alter table public.artigos add column if not exists cluster text;

update public.artigos set cluster = case
  when slug in ('artigo-regularizar-inss-obra','documentos-regularizacao-obra','consultar-pendencias-obra') then 'Regularização'
  when slug in ('artigo-notificacao-inss-obra','cobranca-inss-obra-alta','afericao-indireta-receita') then 'Cobranças'
  when slug in ('erro-cno-receita','erro-sero','erros-aumentam-inss-obra') then 'Erros'
  when slug = 'custo-regularizar-inss-obra' then 'Custos'
  when slug = 'manual-do-sero-2026' then 'Sistemas RFB'
  else cluster
end
where slug in ('artigo-regularizar-inss-obra','documentos-regularizacao-obra','consultar-pendencias-obra','artigo-notificacao-inss-obra','cobranca-inss-obra-alta','afericao-indireta-receita','erro-cno-receita','erro-sero','erros-aumentam-inss-obra','custo-regularizar-inss-obra','manual-do-sero-2026');

comment on column public.artigos.cluster is
  'Cluster temático para arquitetura de links internos: Regularização, Cobranças, Erros, Custos ou Sistemas RFB.';
