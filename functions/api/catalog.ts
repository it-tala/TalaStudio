// Cloudflare Pages Function: POST /api/catalog
// 1. Check Turnstile  2. Save to Supabase (insert-only RLS)  3. Email David.

interface Env {
  TURNSTILE_SECRET_KEY?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  RESEND_API_KEY?: string;
  DAVID_EMAIL?: string;
}

const FIELDS = ['full_name', 'company', 'email', 'phone', 'country', 'buyer_type', 'message'] as const;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const form = await request.formData();

  // Honeypot: bots fill this. Pretend success.
  if (form.get('website')) return new Response('ok');

  if (env.TURNSTILE_SECRET_KEY) {
    const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: String(form.get('cf-turnstile-response') ?? ''),
        remoteip: request.headers.get('CF-Connecting-IP') ?? '',
      }),
    });
    const { success } = (await check.json()) as { success: boolean };
    if (!success) return new Response('Spam check failed', { status: 400 });
  }

  const row: Record<string, string> = {};
  for (const k of FIELDS) row[k] = String(form.get(k) ?? '').trim().slice(0, 2000);
  if (!row.full_name || !row.company || !/^\S+@\S+\.\S+$/.test(row.email)) {
    return new Response('Missing fields', { status: 400 });
  }

  // The anon role can insert only. RLS blocks reads, so no return=representation.
  const save = await fetch(`${env.SUPABASE_URL}/rest/v1/catalog_requests`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!save.ok) return new Response('Could not save', { status: 500 });

  // Email is best effort: the request is already saved.
  if (env.RESEND_API_KEY && env.DAVID_EMAIL) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'TalaStudio Website <hello@talastudio.net>',
        to: [env.DAVID_EMAIL],
        subject: `Catalog request: ${row.company}`,
        text: FIELDS.map((k) => `${k}: ${row[k]}`).join('\n'),
      }),
    }).catch(() => {});
  }

  return new Response('ok');
};
