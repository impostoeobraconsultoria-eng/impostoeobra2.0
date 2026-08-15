-- Ajusta o lembrete padrão para a execução diária do cron às 08h de Brasília.
-- Preserva qualquer escolha já personalizada diferente do antigo default de 60 minutos.
insert into public.config (chave, valor, descricao)
values (
  'agenda_lembrete_default_min',
  '1440',
  'Minutos antes do evento para lembrete padrão'
)
on conflict (chave) do update
set valor = case
  when public.config.valor = '60' then excluded.valor
  else public.config.valor
end,
descricao = excluded.descricao;
