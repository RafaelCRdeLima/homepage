-- O contador de visitas. Três tabelas de totais e nenhuma linha por visita:
-- cada visita só soma 1 em três contadores. Não há registro de quem veio, nem
-- de quando exatamente — só quantos por dia, por página e por cidade.
--
-- Isso é de propósito, e não só por privacidade: a página de visitas é pública
-- e lê estas tabelas a cada abertura. Com uma linha por visita, a leitura
-- varreria a tabela inteira toda vez e, em um ano, estouraria a cota gratuita
-- de leituras do D1. Totais prontos custam poucas centenas de linhas.
--
-- Criar e aplicar:
--   wrangler d1 create homepage-visitas
--   wrangler d1 execute homepage-visitas --remote --file functions/schema.sql
--
-- Ver os números sem a página:
--   wrangler d1 execute homepage-visitas --remote \
--     --command "SELECT * FROM lugares ORDER BY pessoas DESC"

-- Um contador por dia, na hora de Brasília.
--   vistas      páginas abertas
--   visitantes  navegadores diferentes naquele dia
--   pessoas     navegadores que vieram pela primeira vez na vida
CREATE TABLE IF NOT EXISTS dias (
  dia         TEXT PRIMARY KEY,           -- AAAA-MM-DD
  vistas      INTEGER NOT NULL DEFAULT 0,
  visitantes  INTEGER NOT NULL DEFAULT 0,
  pessoas     INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS paginas (
  pagina  TEXT PRIMARY KEY,               -- caminho: /, /pesquisa.html, /farol/
  vistas  INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;

-- O lugar vem da Cloudflare (request.cf), no nível da cidade. Cada pessoa é
-- contada uma vez, no lugar da primeira visita — por isso a soma de `pessoas`
-- aqui bate com a soma em `dias`.
CREATE TABLE IF NOT EXISTS lugares (
  pais     TEXT NOT NULL,                 -- ISO 3166-1 alfa-2; XX desconhecido, T1 Tor
  regiao   TEXT NOT NULL,                 -- '' quando a Cloudflare não sabe
  cidade   TEXT NOT NULL,                 -- idem
  lat      REAL,                          -- da cidade, com duas casas
  lon      REAL,
  vistas   INTEGER NOT NULL DEFAULT 0,
  pessoas  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pais, regiao, cidade)
) WITHOUT ROWID;
