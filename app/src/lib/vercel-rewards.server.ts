/**
 * Smart Retail AI Rewards, server-side Vercel adapter.
 * Keeps the approved Rewards UI and JSON API contract unchanged.
 * Accounts are separate from the original Higgsfield D1 deployment.
 * Private Blob records are never exposed by URL to a browser.
 */
import { del, get, put } from '@vercel/blob';

type Profile = {
  id: string;
  firstName: string;
  email: string;
  favorite: string;
  marketingOptIn: boolean;
  couponCode: string;
  couponUsed: boolean;
  redeemedProduct: string | null;
  visits: number;
  joinedAt: string;
  lastSeenAt: string;
  sessionHash: string;
};

type Session = { userPath: string; sessionHash: string; expiresAt: string };
type Snapshot<T> = { data: T; etag: string };
const cookieName = 'srai_rewards_session';
const drinks = ['bloom', 'aura', 'rush', 'vivi'];
const periodMs = 90 * 24 * 60 * 60 * 1000;
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};
function respond(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, ...extra } });
}
function getCookie(req: Request): string | null {
  const value = (req.headers.get('cookie') ?? '').split(';').map(s => s.trim())
    .find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  return value && /^[A-Za-z0-9_-]{40,64}$/.test(value) ? value : null;
}
function cookie(token: string, age = 7776000) {
  return cookieName + '=' + token +
    '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + age;
}
function makeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function hash(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function publicView(p: Profile) {
  return { id: p.id, firstName: p.firstName, email: p.email,
    favorite: p.favorite, marketingOptIn: p.marketingOptIn,
    couponCode: p.couponCode, couponUsed: p.couponUsed,
    redeemedProduct: p.redeemedProduct, visits: p.visits, joinedAt: p.joinedAt };
}
function userPath(emailHash: string) {
  return 'srai-rewards-v1/users/' + emailHash + '.json';
}
function sessionPath(sessionHash: string) {
  return 'srai-rewards-v1/sessions/' + sessionHash + '.json';
}
async function readJson<T>(path: string): Promise<Snapshot<T> | null> {
  const result = await get(path, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  if ((result.blob.size ?? 0) > 16384) throw new Error('Oversized rewards record');
  return { data: JSON.parse(await new Response(result.stream).text()) as T,
    etag: result.blob.etag };
}
async function writeNew(path: string, data: unknown) {
  return put(path, JSON.stringify(data), { access: 'private', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 60 });
}
async function writeUpdate(path: string, data: unknown, etag: string) {
  return put(path, JSON.stringify(data), { access: 'private', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: true, ifMatch: etag, cacheControlMaxAge: 60 });
}
async function current(req: Request) {
  const token = getCookie(req);
  if (!token) return null;
  const sessionHash = await hash(token);
  const session = await readJson<Session>(sessionPath(sessionHash));
  if (!session || session.data.sessionHash !== sessionHash ||
      Date.parse(session.data.expiresAt) <= Date.now() ||
      !/^srai-rewards-v1\/users\/[a-f0-9]{64}\.json$/.test(session.data.userPath)) return null;
  const user = await readJson<Profile>(session.data.userPath);
  if (!user || user.data.sessionHash !== sessionHash) return null;
  return { user: user.data, etag: user.etag, path: session.data.userPath, sessionHash };
}
const conflict = (e: unknown) => /already.?exists|conflict|409|BlobAlreadyExists/i.test(String(e));
const stale = (e: unknown) => /precondition|412|BlobPreconditionFailed/i.test(String(e));

export async function serveVercelRewards(request: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
    return respond({ error: 'Rewards storage is not configured' }, 503);
  }

  if (request.method === 'GET') {
    try {
      const s = await current(request);
      if (!s) return respond({ profile: null });
      const p = s.user;
      if (Date.now() - Date.parse(p.lastSeenAt) > 20 * 60 * 1000) {
        const newer: Profile = { ...p, visits: p.visits + 1, lastSeenAt: new Date().toISOString() };
        try {
          await writeUpdate(s.path, newer, s.etag);
          return respond({ profile: publicView(newer) });
        } catch (err) {
          if (!stale(err)) throw err;
          const latest = await current(request);
          return respond({ profile: latest ? publicView(latest.user) : null });
        }
      }
      return respond({ profile: publicView(p) });
    } catch {
      return respond({ error: 'Unable to load profile' }, 500);
    }
  }

  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return respond({ error: 'Invalid origin' }, 403);
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json'))
    return respond({ error: 'Invalid format' }, 400);
  if (Number(request.headers.get('content-length') || 0) > 4096)
    return respond({ error: 'Request too large' }, 413);
  let data: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 4096) return respond({ error: 'Request too large' }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid');
    data = parsed as Record<string, unknown>;
  } catch {
    return respond({ error: 'Invalid request' }, 400);
  }

  if (data.action === 'register') {
    const firstName = typeof data.firstName === 'string' ? data.firstName.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const favorite = typeof data.favorite === 'string' ? data.favorite : '';
    if (!firstName || firstName.length > 70 || email.length > 190 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        data.adultConfirmed !== true || !['', ...drinks].includes(favorite))
      return respond({ error: 'Please provide a valid name, email, and confirm you are an adult.' }, 400);
    try {
      const already = await current(request);
      if (already) return respond({ profile: publicView(already.user) });
      const token = makeToken();
      const sessionHash = await hash(token);
      const path = userPath(await hash(email));
      const now = new Date().toISOString();
      const profile: Profile = {
        id: crypto.randomUUID(), firstName, email, favorite,
        marketingOptIn: data.marketingOptIn === true,
        couponCode: 'SRAI-' + crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase(),
        couponUsed: false, redeemedProduct: null, visits: 1,
        joinedAt: now, lastSeenAt: now, sessionHash,
      };
      try {
        await writeNew(path, profile);
      } catch (err) {
        if (conflict(err)) return respond({ error: 'This email is already registered. For this demo, return using the original phone/browser; account recovery is not available yet.' }, 409);
        throw err;
      }
      const session: Session = { userPath: path, sessionHash,
        expiresAt: new Date(Date.now() + periodMs).toISOString() };
      try {
        await writeNew(sessionPath(sessionHash), session);
      } catch {
        await del(path).catch(() => {});
        throw new Error('Unable to create session');
      }
      return respond({ profile: publicView(profile) }, 201, { 'Set-Cookie': cookie(token) });
    } catch {
      return respond({ error: 'Registration unavailable' }, 500);
    }
  }

  let s: Awaited<ReturnType<typeof current>>;
  try { s = await current(request); }
  catch { return respond({ error: 'Unable to load profile' }, 500); }
  if (!s) return respond({ error: 'Please register first on this device.' }, 401);

  if (data.action === 'redeem') {
    const product = typeof data.product === 'string' ? data.product : '';
    if (!drinks.includes(product)) return respond({ error: 'Choose a valid product' }, 400);
    if (s.user.couponUsed) return respond({ profile: publicView(s.user), redeemed: false });
    const updated: Profile = { ...s.user, couponUsed: true, redeemedProduct: product };
    try {
      await writeUpdate(s.path, updated, s.etag);
      return respond({ profile: publicView(updated), redeemed: true });
    } catch (err) {
      if (stale(err)) {
        const latest = await current(request);
        return respond({ profile: latest ? publicView(latest.user) : null, redeemed: false });
      }
      return respond({ error: 'Unable to redeem coupon' }, 500);
    }
  }

  if (data.action === 'preferences') {
    const favorite = typeof data.favorite === 'string' ? data.favorite : '';
    if (!['', ...drinks].includes(favorite) || typeof data.marketingOptIn !== 'boolean')
      return respond({ error: 'Invalid preferences' }, 400);
    const updated: Profile = { ...s.user, favorite, marketingOptIn: data.marketingOptIn };
    try {
      await writeUpdate(s.path, updated, s.etag);
      return respond({ profile: publicView(updated) });
    } catch (err) {
      if (stale(err)) return respond({ error: 'Preferences have changed; please try again.' }, 409);
      return respond({ error: 'Unable to save preferences' }, 500);
    }
  }

  if (data.action === 'delete') {
    try {
      await del(s.path, { ifMatch: s.etag });
      await del(sessionPath(s.sessionHash));
      return respond({ profile: null, deleted: true }, 200, { 'Set-Cookie': cookie('', 0) });
    } catch (err) {
      return respond({ error: stale(err) ? 'Account changed; please retry deletion.' : 'Unable to delete account' }, stale(err) ? 409 : 500);
    }
  }
  return respond({ error: 'Unknown action' }, 400);
}
