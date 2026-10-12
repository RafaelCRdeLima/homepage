/**
 * O contador de visitas, em /api/visitas.
 *
 * É uma Pages Function: vive em `functions/`, e o `wrangler pages deploy` a
 * publica junto com `site/`, no mesmo endereço. Sem servidor, sem CORS.
 *
 *   POST  soma uma visita. Quem chama é `/visita.js`, em cada página, com
 *         { p: caminho, n: 1 se é a primeira vez deste navegador,
 *                       h: 1 se é a primeira vez dele hoje }.
 *   GET   devolve os totais para `/visitas.html`. A página é pública, e
 *         isto também.
 *
 * O QUE NÃO SE GUARDA: IP, navegador, horário, de que site a pessoa veio. O
 * lugar sai de `request.cf`, que a Cloudflare preenche na borda a partir do
 * IP — o IP em si nunca chega ao banco. E nem há uma linha por visita para
 * guardar alguma coisa: cada visita só soma 1 em três contadores
 * (ver `schema.sql`).
 */

// Robôs que rodam JavaScript e chegariam a chamar o contador. Os que não
// rodam já ficam de fora sozinhos, porque a contagem sai do navegador.
const ROBO = /bot\b|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|embedly/i;

// O caminho é a única coisa que vem do visitante e vira chave no banco. Só
// passa o formato das páginas do site — sem isso, qualquer um encheria a
// tabela de páginas inventadas.
//
// A forma guardada é a que o Cloudflare Pages serve: ele redireciona
// `/pesquisa.html` para `/pesquisa` e `/farol/index.html` para `/farol/`, e
// é isso que o navegador vê em `location.pathname`. As duas grafias são
// aceitas e viram a mesma chave.
const PAGINA = /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]*$/;
const canonica = (p) => p.replace(/\.html$/, '').replace(/(^|\/)index$/, '$1');

const FUSO = 'America/Sao_Paulo';
const DIAS_NO_GRAFICO = 30;

function hoje() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const v = (tipo) => partes.find((p) => p.type === tipo).value;
  return `${v('year')}-${v('month')}-${v('day')}`;
}

function somaDias(dia, n) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Duas casas são ~1 km: a cidade, não a rua.
function coordenada(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export async function onRequestPost({ request, env }) {
  const origem = request.headers.get('origin');
  if (origem !== null && origem !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }
  if (ROBO.test(request.headers.get('user-agent') || '')) {
    return new Response(null, { status: 204 });
  }

  let corpo;
  try {
    const texto = await request.text();
    if (texto.length > 400) throw new Error('grande demais');
    corpo = JSON.parse(texto);
  } catch {
    return new Response('json inválido', { status: 400 });
  }

  const pagina = canonica(String(corpo?.p ?? ''));
  if (pagina.length > 80 || !PAGINA.test(pagina)) {
    return new Response('página inválida', { status: 400 });
  }
  const nova = corpo.n === 1 ? 1 : 0;
  const visitante = nova || corpo.h === 1 ? 1 : 0;

  const cf = request.cf || {};
  const pais = /^[A-Z][A-Z0-9]$/.test(cf.country || '') ? cf.country : 'XX';
  const regiao = String(cf.region || '').slice(0, 80);
  const cidade = String(cf.city || '').slice(0, 80);
  const dia = hoje();
  const db = env.VISITAS;

  try {
    await db.batch([
      db.prepare(
        `INSERT INTO dias (dia, vistas, visitantes, pessoas) VALUES (?1, 1, ?2, ?3)
         ON CONFLICT (dia) DO UPDATE SET
           vistas = vistas + 1,
           visitantes = visitantes + excluded.visitantes,
           pessoas = pessoas + excluded.pessoas`,
      ).bind(dia, visitante, nova),
      db.prepare(
        `INSERT INTO paginas (pagina, vistas) VALUES (?1, 1)
         ON CONFLICT (pagina) DO UPDATE SET vistas = vistas + 1`,
      ).bind(pagina),
      // As coordenadas da Cloudflare variam um pouco entre IPs da mesma
      // cidade; fica a primeira que apareceu, para o ponto não passear.
      db.prepare(
        `INSERT INTO lugares (pais, regiao, cidade, lat, lon, vistas, pessoas)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)
         ON CONFLICT (pais, regiao, cidade) DO UPDATE SET
           vistas = vistas + 1,
           pessoas = pessoas + excluded.pessoas,
           lat = COALESCE(lat, excluded.lat),
           lon = COALESCE(lon, excluded.lon)`,
      ).bind(pais, regiao, cidade, coordenada(cf.latitude), coordenada(cf.longitude), nova),
    ]);
  } catch {
    return new Response('falha ao gravar', { status: 500 });
  }

  return new Response(null, { status: 204 });
}

export async function onRequestGet({ env }) {
  const dia = hoje();
  const db = env.VISITAS;

  let resultados;
  try {
    resultados = await db.batch([
      db.prepare(
        `SELECT MIN(dia) AS desde,
                COALESCE(SUM(vistas), 0) AS vistas,
                COALESCE(SUM(pessoas), 0) AS pessoas
         FROM dias`,
      ),
      db.prepare(
        `SELECT dia, vistas, visitantes, pessoas FROM dias
         WHERE dia > ?1 ORDER BY dia`,
      ).bind(somaDias(dia, -DIAS_NO_GRAFICO)),
      db.prepare('SELECT pagina, vistas FROM paginas ORDER BY vistas DESC LIMIT 40'),
      db.prepare(
        `SELECT pais, regiao, cidade, lat, lon, vistas, pessoas FROM lugares
         WHERE pessoas > 0 ORDER BY pessoas DESC, vistas DESC LIMIT 3000`,
      ),
    ]);
  } catch {
    return Response.json({ erro: 'falha ao ler' }, { status: 500 });
  }

  const [total, dias, paginas, lugares] = resultados.map((r) => r.results);
  return Response.json(
    {
      hoje: dia,
      fuso: FUSO,
      desde: total[0].desde,
      pessoas: total[0].pessoas,
      vistas: total[0].vistas,
      dias,
      paginas,
      lugares,
    },
    { headers: { 'cache-control': 'public, max-age=60' } },
  );
}
