# NUVEM — fazer valer em todos os celulares (5 min, grátis)

Por que sumia? O app salvava em `localStorage` (só naquele aparelho).
Agora salva local + Supabase. Configure 1 vez:

1. Crie conta em https://supabase.com > New Project (Free)
2. No painel: SQL Editor > cole todo o `schema.sql` > Run
3. Settings > API > copie `Project URL` e `anon public key`
4. Opção A (recomendada): abra `supabase-config.js`, cole URL e KEY, suba pro Git/Vercel de novo
   Opção B: abra o site > Acesso admin > 8. Segurança > final ☁️ Nuvem > cole URL/KEY > Salvar e sincronizar
5. Pronto. Teste: agende no PC, abra no celular — aparece. Rodapé mostra `nuvem ok`.

Troubleshooting:
- `nuvem falha` = URL/key errada ou schema.sql não rodado
- RLS: o schema.sql já cria policies públicas. Sem elas dá 401.
- Imagens base64 grandes ficam no doc principal (limite 20 fotos galeria).
- Antigo local não some: no primeiro sync ele sobe o que já tinha.
