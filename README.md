# Barbearia Renato Carriço

Interface de agendamento responsiva, com agenda administrativa, dados em tempo real e backend Supabase protegido por RLS.

Abra `SETUP_NUVEM.md` para configurar o banco e publicar. Para uma prévia visual sem banco, abra `index.html`; o rodapé indicará que está no modo de demonstração e não permitirá criar reservas reais.

Arquivos principais:

- `index.html`, `style.css`, `app.js`: interface e comportamento.
- `schema.sql`: banco, regras de acesso, funções de reserva e Realtime.
- `supabase-config.js`: URL e chave pública do projeto Supabase.
