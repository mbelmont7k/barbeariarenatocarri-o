# Publicação e banco de dados

Este projeto é um site estático com Supabase como backend. Não existe senha de administrador salva no navegador, nem tabela de agendamentos aberta ao público.

## 1. Criar o banco

1. Crie um projeto em [Supabase](https://supabase.com/dashboard).
2. Abra **SQL Editor → New query**.
3. Cole todo o conteúdo de `schema.sql` e clique em **Run** uma única vez.
4. Em **Authentication → Users**, crie o usuário que vai entrar no painel (e-mail e senha). Guarde o UUID mostrado na lista de usuários.
5. No SQL Editor, promova esse usuário, trocando o UUID:

```sql
insert into public.profiles (id, display_name, role)
values ('UUID-DO-USUARIO', 'Renato Carriço', 'owner');
```

O passo 5 é intencional: criar um usuário do Auth não dá acesso à agenda automaticamente.

## 2. Conectar o site

Em **Project Settings → API**, copie somente:

- Project URL
- anon public key

Cole os dois valores em `supabase-config.js`. A chave `anon` pode ficar no site: as políticas do banco limitam o que ela pode fazer. **Nunca** use ou publique a `service_role key`.

## 3. Teste mínimo

1. Abra o site em uma janela anônima e faça um agendamento.
2. Abra **Área do barbeiro** e entre com o usuário criado no passo 4.
3. Confira se o atendimento aparece na agenda.
4. Abra o mesmo site em outro dispositivo: o atendimento deverá aparecer sem recarregar, graças ao Realtime.
5. Tente reservar exatamente o mesmo horário em duas abas. Apenas uma deve ser aceita; a outra recebe uma mensagem para escolher outro horário.

## 4. Publicar na Vercel

Envie todos os arquivos desta pasta para o repositório e importe-o na Vercel como projeto estático. Não é necessário instalar dependências nem configurar variáveis de servidor. `vercel.json` contém somente regras de cabeçalho e SPA.

## O que o backend protege

- Dados pessoais dos clientes só podem ser lidos por contas com perfil `staff` ou `owner`.
- A reserva pública ocorre por uma função SQL transacional, que valida serviço, data, expediente, pausa e conflito.
- Um índice de exclusão no PostgreSQL impede sobreposição mesmo se duas pessoas confirmarem ao mesmo tempo.
- Cancelamentos, alterações de serviços e dados públicos exigem sessão autenticada e passam pelas policies RLS.
- As principais ações administrativas deixam registro em `audit_logs`.

Para backup, use o recurso de backups do próprio Supabase ou exporte as tabelas pelo Dashboard. Não exporte a tabela `auth.users` para um local público.
