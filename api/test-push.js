const { notifyAll } = require('./_push');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function authenticated(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const base = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !anon) return false;
  const response = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: auth }
  });
  return response.ok;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido.' });
  if (!(await authenticated(req))) return send(res, 401, { error: 'Sesión no válida.' });
  try {
    const result = await notifyAll({
      title: 'ATP Suplementos',
      body: 'Las notificaciones push están funcionando correctamente.',
      url: '/admin.html',
      tag: `atp-test-${Date.now()}`
    });
    return send(res, 200, result);
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: error.message || 'No se pudo enviar la notificación.' });
  }
};
