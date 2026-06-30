// /api/jooble.js
// Proxy serverless de Vercel: oculta la API key de Jooble y evita el
// error "Failed to fetch" que daba el proxy allorigins (no soporta POST)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || '9a26ed6d-5b55-40aa-807f-e5ea117782ca';
  const { keywords, location } = req.body || {};

  if (!keywords) {
    return res.status(400).json({ error: 'Falta el parámetro keywords' });
  }

  // Normalizamos la ubicación (saca tildes) porque Jooble devuelve
  // totalCount:0 si no reconoce el texto exacto de la ciudad
  const locationLimpia = (location || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  async function consultarJooble(conUbicacion) {
    const body = {
      keywords,
      page: 1,
      resultsOnPage: 20
    };
    if (conUbicacion && locationLimpia) body.location = locationLimpia;

    const r = await fetch(`https://jooble.org/api/${JOOBLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const texto = await r.text().catch(() => '');
      throw new Error(`Jooble respondió ${r.status}: ${texto.substring(0, 200)}`);
    }
    return r.json();
  }

  try {
    // 1er intento: con ubicación normalizada
    let data = await consultarJooble(true);

    // 2do intento: si no trajo nada, reintentamos sin location
    // (a veces Jooble no reconoce la ciudad/zona exacta)
    if ((!data.jobs || data.jobs.length === 0) && locationLimpia) {
      data = await consultarJooble(false);
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message, jobs: [], totalCount: 0 });
  }
}
