/**
 * POST /api/lead — Cloudflare Pages Function behind the Step 1 form on /book.
 *
 * Accepts JSON (the page script) or form-encoded (no JS). Validates, then, for each
 * integration whose env vars are present:
 *   - emails the atelier via Resend        RESEND_API_KEY, LEAD_TO_EMAIL, LEAD_FROM_EMAIL
 *   - appends a row to a Google Sheet      SHEETS_WEBHOOK_URL (Apps Script web app)
 *   - sends a Meta Conversions API "Lead"  META_PIXEL_ID, META_ACCESS_TOKEN
 * With none configured it still validates and answers, so the funnel never blocks.
 *
 * Secrets: `wrangler pages secret put NAME` (or the Pages dashboard). Local: .dev.vars.
 */

export interface Env {
  RESEND_API_KEY?: string;
  LEAD_TO_EMAIL?: string;
  LEAD_FROM_EMAIL?: string;
  SHEETS_WEBHOOK_URL?: string;
  META_PIXEL_ID?: string;
  META_ACCESS_TOKEN?: string;
  /** Optional test event code from Meta Events Manager while verifying. */
  META_TEST_EVENT_CODE?: string;
}

interface Lead {
  firstName: string;
  email: string;
  phone: string;
  weddingDate: string;
  meeting: 'in-person' | 'zoom';
  notes: string;
  gown: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  eventId: string;
  pageUrl: string;
  receivedAt: string;
}

const MAX = { short: 120, long: 2000 } as const;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    return (await request.json().catch(() => ({}))) as Record<string, unknown>;
  }
  const fd = await request.formData().catch(() => null);
  if (!fd) return {};
  const out: Record<string, unknown> = {};
  fd.forEach((v, k) => { out[k] = typeof v === 'string' ? v : ''; });
  return out;
}

function wantsJson(request: Request) {
  const accept = request.headers.get('accept') || '';
  const type = request.headers.get('content-type') || '';
  return accept.includes('application/json') || type.includes('application/json');
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* --- integrations, each a no-op without its env vars --------------------------- */

async function emailAtelier(env: Env, lead: Lead) {
  if (!env.RESEND_API_KEY || !env.LEAD_TO_EMAIL || !env.LEAD_FROM_EMAIL) return 'skipped';
  const meeting = lead.meeting === 'zoom' ? 'Over Zoom' : 'In person, Harlem';
  const lines = [
    `New consultation enquiry from ${lead.firstName}.`,
    '',
    `Name: ${lead.firstName}`,
    `Email: ${lead.email}`,
    `Phone / WhatsApp: ${lead.phone || '—'}`,
    `Wedding date: ${lead.weddingDate || '—'}`,
    `Meeting: ${meeting}`,
    `Gown of interest: ${lead.gown || '—'}`,
    '',
    'About the day:',
    lead.notes || '—',
    '',
    `Source: ${[lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(' / ') || 'direct'}`,
    `Page: ${lead.pageUrl || '—'}`,
    `Received: ${lead.receivedAt}`,
    '',
    'She is choosing a time in the calendar now; the booking confirmation follows separately.',
  ];
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.LEAD_FROM_EMAIL,
      to: env.LEAD_TO_EMAIL.split(',').map((s) => s.trim()),
      reply_to: lead.email,
      subject: `Consultation enquiry: ${lead.firstName}${lead.weddingDate ? `, ${lead.weddingDate}` : ''}`,
      text: lines.join('\n'),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
  return 'sent';
}

async function appendToSheet(env: Env, lead: Lead) {
  if (!env.SHEETS_WEBHOOK_URL) return 'skipped';
  // Apps Script web apps answer with a 302 to a googleusercontent URL; follow it.
  const res = await fetch(env.SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`sheets ${res.status}`);
  return 'appended';
}

async function metaLead(env: Env, lead: Lead, request: Request) {
  if (!env.META_PIXEL_ID || !env.META_ACCESS_TOKEN) return 'skipped';
  const email = lead.email.toLowerCase();
  const phone = lead.phone.replace(/\D/g, '');
  const cookies = request.headers.get('cookie') || '';
  const cookie = (name: string) => cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
  const userData: Record<string, unknown> = {
    em: [await sha256(email)],
    client_ip_address: request.headers.get('cf-connecting-ip') || undefined,
    client_user_agent: request.headers.get('user-agent') || undefined,
    fn: [await sha256(lead.firstName.toLowerCase())],
  };
  if (phone) userData.ph = [await sha256(phone)];
  if (cookie('_fbp')) userData.fbp = cookie('_fbp');
  if (cookie('_fbc')) userData.fbc = cookie('_fbc');

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: lead.eventId || undefined,
        event_source_url: lead.pageUrl || request.headers.get('referer') || undefined,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          meeting: lead.meeting,
          content_name: lead.gown || undefined,
          utm_source: lead.utm_source || undefined,
          utm_campaign: lead.utm_campaign || undefined,
        },
      },
    ],
  };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/v21.0/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_ACCESS_TOKEN)}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`meta ${res.status}: ${await res.text()}`);
  return 'sent';
}

/* --- handler ------------------------------------------------------------------- */

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const json = wantsJson(request);
  const body = await readBody(request);

  // Honeypot: a filled "company" field means a bot. Pretend all is well.
  if (str(body.company, MAX.short)) {
    return json ? Response.json({ ok: true }) : Response.redirect(new URL('/book#step-2', request.url).href, 303);
  }

  const lead: Lead = {
    firstName: str(body.firstName, MAX.short),
    email: str(body.email, MAX.short),
    phone: str(body.phone, MAX.short),
    weddingDate: str(body.weddingDate, MAX.short),
    meeting: body.meeting === 'zoom' ? 'zoom' : 'in-person',
    notes: str(body.notes, MAX.long),
    gown: str(body.gown, MAX.short),
    utm_source: str(body.utm_source, MAX.short),
    utm_medium: str(body.utm_medium, MAX.short),
    utm_campaign: str(body.utm_campaign, MAX.short),
    eventId: str(body.eventId, MAX.short),
    pageUrl: str(body.pageUrl, 500),
    receivedAt: new Date().toISOString(),
  };
  const consent = body.consent === 'yes' || body.consent === 'on' || body.consent === true;

  const errors: Record<string, string> = {};
  if (!lead.firstName) errors.firstName = 'First name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) errors.email = 'A valid email is required.';
  if (!consent) errors.consent = 'Consent is required.';
  if (Object.keys(errors).length) {
    return json
      ? Response.json({ ok: false, errors }, { status: 400 })
      : Response.redirect(new URL('/book?error=1#lead-form', request.url).href, 303);
  }

  const results = await Promise.allSettled([
    emailAtelier(env, lead),
    appendToSheet(env, lead),
    metaLead(env, lead, request),
  ]);
  const report = results.map((r, i) => `${['email', 'sheet', 'meta'][i]}: ${r.status === 'fulfilled' ? r.value : `failed (${(r.reason as Error).message})`}`);
  if (results.some((r) => r.status === 'rejected')) console.error('lead integrations', report.join('; '));

  return json
    ? Response.json({ ok: true, delivered: report })
    : Response.redirect(new URL('/book#step-2', request.url).href, 303);
};

/** Anything but POST */
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
};
