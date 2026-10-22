// Cloudflare Pages Function of the admin project: POST /api/rebuild
// The "Publish site" button. The website is static, so Supabase changes show only after it is rebuilt.
// 1. Check the caller is staff (their Supabase login token)  2. Call the website project's deploy hook.

interface Env {
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_ANON_KEY: string;
  DEPLOY_HOOK_URL?: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.DEPLOY_HOOK_URL) {
    return new Response('DEPLOY_HOOK_URL is not set in the admin Cloudflare Pages project. See admin/README.md.', { status: 501 });
  }

  const auth = request.headers.get('Authorization') ?? '';
  if (!/^Bearer \S+$/.test(auth)) return new Response('Sign in first.', { status: 401 });

  // is_staff() runs as the signed-in user, so a forged or expired token fails here.
  const check = await fetch(`${env.PUBLIC_SUPABASE_URL}/rest/v1/rpc/is_staff`, {
    method: 'POST',
    headers: { apikey: env.PUBLIC_SUPABASE_ANON_KEY, Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (check.status === 401) return new Response('Your session has expired. Sign out and in again.', { status: 401 });
  if (!check.ok || (await check.json()) !== true) return new Response('Staff only.', { status: 403 });

  const hook = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  if (!hook.ok) return new Response(`Cloudflare did not start the build (${hook.status}).`, { status: 502 });
  return new Response('ok');
};
