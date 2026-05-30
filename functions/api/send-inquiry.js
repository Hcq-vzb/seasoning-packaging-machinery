/**
 * Cloudflare Pages Function – Resend email proxy for inquiry forms.
 * Deploy on Cloudflare Pages; set RESEND_API_KEY env var (optional fallback below).
 */
const RESEND_API_KEY = 're_JxfkTY4T_7NwqmBRGfSuKPqAiRF6rS6Ub';
const FROM_EMAIL = 'noreply@seasoningpackagingmachinery.com';
const TO_EMAIL = '981888215@qq.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(data) {
  return (
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">' +
    '<h2 style="color:#ff6310">New Website Inquiry</h2>' +
    '<table style="border-collapse:collapse;width:100%;max-width:600px">' +
    '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:120px">Name</td>' +
    '<td style="padding:8px;border:1px solid #ddd">' + escapeHtml(data.name) + '</td></tr>' +
    '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td>' +
    '<td style="padding:8px;border:1px solid #ddd">' + escapeHtml(data.email) + '</td></tr>' +
    '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td>' +
    '<td style="padding:8px;border:1px solid #ddd">' + escapeHtml(data.phone) + '</td></tr>' +
    '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;vertical-align:top">Message</td>' +
    '<td style="padding:8px;border:1px solid #ddd;white-space:pre-wrap">' + escapeHtml(data.message) + '</td></tr>' +
    '</table>' +
    (data.pageUrl
      ? '<p style="margin-top:16px;font-size:12px;color:#666">Page: <a href="' +
        escapeHtml(data.pageUrl) +
        '">' +
        escapeHtml(data.pageTitle || data.pageUrl) +
        '</a></p>'
      : '') +
    '</div>'
  );
}

function jsonResponse(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS,
      ...(extraHeaders || {}),
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { name, email, phone, message } = data || {};

    if (!name || !email || !phone || !message) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Invalid email' }, 400);
    }

    const apiKey = context.env?.RESEND_API_KEY || RESEND_API_KEY;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: 'Website Inquiry from ' + name,
        html: buildEmailHtml(data),
      }),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      return jsonResponse(
        { error: result.message || result.error || 'Resend API error' },
        res.status >= 400 ? res.status : 502,
      );
    }

    return jsonResponse({ success: true, id: result.id }, 200);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Server error' }, 500);
  }
}
