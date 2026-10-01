-- Role somente leitura do MCP "postgres" (df-qa e df-debug).
-- Ver docs/adr/013-readonly-database-mcp.md.
--
-- Não é migration: rode UMA vez, à mão, no SQL Editor do Neon (que conecta como
-- neondb_owner). Crie o role por SQL, não pelo console do Neon: roles criados
-- pelo console entram em neon_superuser e ganham permissão de escrita.
--
-- Antes de rodar, troque <SENHA> por uma senha aleatória longa (o Neon exige
-- pelo menos 60 bits de entropia em roles criados por SQL). Ex. no PowerShell:
--   -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 32 | % {[char]$_})

CREATE ROLE df_readonly WITH LOGIN PASSWORD '<SENHA>' CONNECTION LIMIT 3;

-- Defesa extra. Não é a barreira principal: uma sessão pode desligar
-- default_transaction_read_only com SET. Quem barra escrita é o GRANT abaixo.
ALTER ROLE df_readonly SET default_transaction_read_only = on;
ALTER ROLE df_readonly SET statement_timeout = '15s';

GRANT CONNECT ON DATABASE neondb TO df_readonly;
GRANT USAGE ON SCHEMA public TO df_readonly;

-- Só leitura, em todas as tabelas de domínio...
GRANT SELECT ON ALL TABLES IN SCHEMA public TO df_readonly;

-- ...menos as do Better Auth que guardam hash de senha e tokens. Nenhum
-- cenário de teste precisa delas, e o que o agente lê vai para relatório.
REVOKE ALL ON public.account, public.session, public.verification FROM df_readonly;

-- Tabelas criadas por migrations futuras (rodadas como neondb_owner) já nascem
-- legíveis pelo role. Se surgir nova tabela sensível, revogue aqui também.
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO df_readonly;

-- Conferência (deve listar só SELECT, e nenhuma linha de account/session/verification):
-- SELECT table_name, privilege_type FROM information_schema.role_table_grants
--   WHERE grantee = 'df_readonly' ORDER BY table_name;

-- Para desfazer:
-- DROP OWNED BY df_readonly; DROP ROLE df_readonly;
