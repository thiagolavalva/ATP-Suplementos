const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kmbkkzhyzyyrjdphamru.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bVgYzhkQd-ke4w5OvvlLhw_dfcUVqRV';

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function getBaseUrl(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) throw new Error('No se pudo determinar la URL de la tienda.');
  return `${protocol}://${host}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Método no permitido.' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return send(res, 500, { error: 'Falta configurar MP_ACCESS_TOKEN en Vercel.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length || rawItems.length > 50) {
      return send(res, 400, { error: 'El carrito está vacío o no es válido.' });
    }

    const quantities = new Map();
    for (const item of rawItems) {
      const id = String(item && item.id || '').trim();
      const quantity = Number(item && item.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return send(res, 400, { error: 'Hay un producto o cantidad inválida.' });
      }
      quantities.set(id, Math.min(20, (quantities.get(id) || 0) + quantity));
    }

    const ids = [...quantities.keys()];
    const inFilter = `(${ids.map(id => `"${id.replaceAll('"', '')}"`).join(',')})`;
    const productsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/atp_products?select=id,name,brand,price,stock,active&id=in.${encodeURIComponent(inFilter)}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );

    if (!productsResponse.ok) {
      throw new Error(`Supabase respondió ${productsResponse.status}.`);
    }

    const products = await productsResponse.json();
    const byId = new Map(products.map(product => [String(product.id), product]));
    const preferenceItems = [];

    for (const [id, quantity] of quantities.entries()) {
      const product = byId.get(id);
      if (!product || product.active === false) {
        return send(res, 409, { error: 'Uno de los productos ya no está disponible. Actualizá la página.' });
      }
      const price = Number(product.price);
      const stock = Number(product.stock);
      if (!Number.isFinite(price) || price <= 0) {
        return send(res, 409, { error: `El precio de ${product.name || 'un producto'} no es válido.` });
      }
      if (!Number.isFinite(stock) || stock < quantity) {
        return send(res, 409, { error: `No hay stock suficiente de ${product.name || 'un producto'}.` });
      }
      preferenceItems.push({
        id,
        title: String(product.name || 'Producto ATP').slice(0, 120),
        description: String(product.brand || 'ATP Suplementos').slice(0, 256),
        quantity,
        currency_id: 'ARS',
        unit_price: Math.round(price * 100) / 100
      });
    }

    const baseUrl = getBaseUrl(req);
    const externalReference = `ATP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const preference = {
      items: preferenceItems,
      external_reference: externalReference,
      back_urls: {
        success: `${baseUrl}/pago-exitoso.html`,
        failure: `${baseUrl}/pago-error.html`,
        pending: `${baseUrl}/pago-pendiente.html`
      },
      auto_return: 'approved',
      statement_descriptor: 'ATP SUPLEMENTOS',
      metadata: { store: 'ATP Suplementos' }
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalReference
      },
      body: JSON.stringify(preference)
    });
    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpData);
      return send(res, 502, { error: mpData.message || 'Mercado Pago no pudo crear el pago.' });
    }

    const checkoutUrl = mpData.sandbox_init_point || mpData.init_point;
    if (!checkoutUrl) throw new Error('Mercado Pago no devolvió el enlace de pago.');

    return send(res, 200, {
      preferenceId: mpData.id,
      checkoutUrl,
      externalReference
    });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'No se pudo iniciar el pago. Intentá nuevamente.' });
  }
};
