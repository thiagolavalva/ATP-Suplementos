let admin;

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n');
}

async function getAdmin() {
  if (admin) return admin;
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      credential = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      credential = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
      };
    }
    if (!credential.project_id || !credential.client_email || !credential.private_key) {
      throw new Error('Faltan las credenciales privadas de Firebase en Vercel.');
    }
    admin.initializeApp({ credential: admin.credential.cert(credential) });
  }
  return admin;
}

async function getTokens() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  const response = await fetch(`${base}/rest/v1/atp_push_tokens?select=token`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) throw new Error(`No se pudieron leer los dispositivos (${response.status}).`);
  const rows = await response.json();
  return [...new Set(rows.map(row => row.token).filter(Boolean))];
}

async function removeInvalidTokens(tokens) {
  if (!tokens.length) return;
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const quoted = tokens.map(token => `"${String(token).replaceAll('"', '')}"`).join(',');
  await fetch(`${base}/rest/v1/atp_push_tokens?token=in.(${encodeURIComponent(quoted)})`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
}

async function notifyAll({ title, body, url = '/admin.html', tag = 'atp-notification' }) {
  const firebaseAdmin = await getAdmin();
  const tokens = await getTokens();
  if (!tokens.length) return { successCount: 0, failureCount: 0, noDevices: true };

  const result = await firebaseAdmin.messaging().sendEachForMulticast({
    tokens,
    data: { title: String(title), body: String(body), url: String(url), tag: String(tag) },
    webpush: {
      headers: { Urgency: 'high', TTL: '86400' },
      fcmOptions: { link: String(url) }
    }
  });

  const invalid = [];
  result.responses.forEach((response, index) => {
    const code = response.error?.code;
    if (!response.success && [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token'
    ].includes(code)) invalid.push(tokens[index]);
  });
  await removeInvalidTokens(invalid);
  return { successCount: result.successCount, failureCount: result.failureCount };
}

module.exports = { notifyAll };
