import { Hono } from 'hono';
import { verifyJWT } from '../utils/jwt';

export const r2Router = new Hono<{ Bindings: CloudflareBindings }>();

// Proxy endpoint: GET /r2/:token
// Token is a JWT containing { key, exp }
r2Router.get('/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const secret = (c.env as any).JWT_SECRET;
    if (!secret) return c.text('Server misconfigured', 500);

    const payload: any = await verifyJWT(token, secret);
    const key = payload.key as string;
    if (!key) return c.text('Invalid token payload', 400);

    const r2 = (c.env as any).ACTIVITY_PLACES;
    if (!r2) return c.text('R2 bucket not configured', 500);

    const obj = await r2.get(key);
    if (!obj) return c.text('Not found', 404);

    const headers = new Headers();
    if (obj.httpMetadata && (obj.httpMetadata as any).contentType) {
      headers.set('Content-Type', (obj.httpMetadata as any).contentType as string);
    }
    if (obj.httpMetadata && (obj.httpMetadata as any).cacheControl) {
      headers.set('Cache-Control', (obj.httpMetadata as any).cacheControl as string);
    }

    const body = await obj.arrayBuffer();
    return new Response(body, { status: 200, headers });
  } catch (err: unknown) {
    return new Response('Unauthorized or error', { status: 401 });
  }
});
