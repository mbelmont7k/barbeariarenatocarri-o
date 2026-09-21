-- Atualiza a marca no projeto Supabase que já está em produção.
-- Execute uma vez no SQL Editor.
update public.business_profile
set shop_name = 'Barbearia Carriço',
    headline = 'Cada detalhe faz o estilo.',
    description = 'Corte, barba e uma pausa bem-feita. Escolha seu horário em poucos passos.'
where id = true;
