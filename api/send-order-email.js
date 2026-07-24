const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';

const STATUS_CONFIG = {
  pendiente_pago: {
    label: 'Pendiente de pago',
    subject: 'Recibimos tu pedido {{code}}',
    message: 'Recibimos tu pedido correctamente. Para confirmarlo, realizá la transferencia y envianos el comprobante por WhatsApp.'
  },
  pago_confirmado: {
    label: 'Pago confirmado',
    subject: 'Confirmamos el pago de tu pedido {{code}}',
    message: 'Tu pago fue confirmado correctamente. En breve comenzaremos a preparar tu pedido.'
  },
  preparando_pedido: {
    label: 'Preparando pedido',
    subject: 'Estamos preparando tu pedido {{code}}',
    message: 'Tu pedido ya está siendo preparado. Te avisaremos cuando esté listo o haya sido enviado.'
  },
  enviado: {
    label: 'Pedido enviado',
    subject: 'Tu pedido {{code}} ya fue enviado',
    message: 'Tu pedido ya fue enviado. Podés consultar su estado desde el enlace de seguimiento.'
  },
  entregado: {
    label: 'Pedido entregado',
    subject: 'Tu pedido {{code}} fue entregado',
    message: 'Tu pedido figura como entregado. ¡Muchas gracias por comprar en ATP Suplementos!'
  },
  cancelado: {
    label: 'Pedido cancelado',
    subject: 'Información sobre tu pedido {{code}}',
    message: 'Tu pedido figura como cancelado. Comunicate con nosotros si necesitás ayuda o querés realizar uno nuevo.'
  }
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function money(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function orderCode(order) {
  if (order.tracking_code) return String(order.tracking_code);
  const year = new Date(order.created_at || Date.now()).getFullYear();
  return `ATP-${year}-${String(Number(order.order_number) || 0).padStart(6, '0')}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Método no permitido.' });
  }

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return json(res, 503, { error: 'EmailJS todavía no está configurado en Vercel.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const order = body.order || {};
    const status = String(body.status || order.status || 'pendiente_pago');
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente_pago;
    const customer = order.customer || {};
    const toEmail = String(customer.email || body.to_email || '').trim();

    if (!toEmail || !toEmail.includes('@')) {
      return json(res, 400, { error: 'El pedido no tiene un email válido.' });
    }

    const code = orderCode(order);
    const items = Array.isArray(order.items) ? order.items : [];
    const itemLines = items.length
      ? items.map(item => `${Number(item.quantity) || 1} × ${item.name || 'Producto'} — ${money((Number(item.price) || 0) * (Number(item.quantity) || 1))}`).join('\n')
      : 'Sin detalle de productos.';
    const siteUrl = String(process.env.SITE_URL || 'https://atp-suplementos.vercel.app').replace(/\/$/, '');
    const firstName = String(customer.name || customer.first_name || 'cliente').trim().split(/\s+/)[0];

    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: toEmail,
        customer_name: firstName,
        email_subject: config.subject.replace('{{code}}', code),
        status_message: config.message,
        order_number: code,
        order_status: config.label,
        order_items: itemLines,
        order_total: money(order.total),
        tracking_url: `${siteUrl}/seguimiento.html`,
        store_name: 'ATP Suplementos'
      }
    };

    if (privateKey) payload.accessToken = privateKey;

    const response = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('EmailJS:', response.status, detail);
      return json(res, 502, { error: 'EmailJS rechazó el envío.', detail });
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('send-order-email:', error);
    return json(res, 500, { error: 'No se pudo enviar el correo.' });
  }
};
