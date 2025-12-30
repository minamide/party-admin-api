/*
Auto integration script:
- Generates HS256 JWT using the development secret
- Creates an activity place via API
- Uploads a small test file as photo
- Requests signed URL and fetches it
- Deletes the photo and the place

Usage:
  BASE_URL=http://127.0.0.1:8787 node tmp/run_integration_auto.mjs

Note: Ensure the server (wrangler dev) is running at BASE_URL.
*/
import crypto from 'crypto';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const SECRET = 'your-super-secret-jwt-key-change-this-in-production'; // from wrangler.jsonc

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest();
}

function generateJWT(payload, secret, expiresInSeconds = 300) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + expiresInSeconds };
  const encoded = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(full))}`;
  const signature = base64url(sign(encoded, secret));
  return `${encoded}.${signature}`;
}

async function main() {
  console.log('BASE_URL =', BASE_URL);
  const token = generateJWT({ userId: 'integration-user', email: 'int@local', role: 'admin' }, SECRET, 3600);
  console.log('Generated token (truncated):', token.slice(0, 40) + '...');

  // 1) Create place
  const createRes = await fetch(`${BASE_URL}/activity_places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: 'Integration Test Place' })
  });
  const createJson = await createRes.json().catch(() => null);
  console.log('Create status:', createRes.status, 'body:', createJson);
  if (createRes.status !== 201) throw new Error('Create place failed');
  const placeId = createJson?.id || createJson?.[0]?.id || createJson?.id;
  if (!placeId) throw new Error('No place id');

  // 2) Upload photo (using global FormData/Blob)
  const form = new FormData();
  const blob = new Blob(["hello world"], { type: 'text/plain' });
  form.append('file', blob, 'test.txt');
  const uploadRes = await fetch(`${BASE_URL}/activity_places/${placeId}/photos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form
  });
  const uploadJson = await uploadRes.json().catch(() => null);
  console.log('Upload status:', uploadRes.status, 'body:', uploadJson);
  if (uploadRes.status !== 201) throw new Error('Upload failed');
  const photoId = uploadJson?.id || (uploadJson && uploadJson.id);
  if (!photoId) throw new Error('No photo id');

  // 3) Get signed url
  const signedRes = await fetch(`${BASE_URL}/activity_places/${placeId}/photos/${photoId}/signed_url?expires=120`, {
    method: 'GET', headers: { 'Authorization': `Bearer ${token}` }
  });
  const signedJson = await signedRes.json().catch(() => null);
  console.log('Signed status:', signedRes.status, 'body:', signedJson);
  if (signedRes.status !== 200) throw new Error('Signed URL failed');
  const url = signedJson.url;

  // 4) Fetch via signed url
  const fetchRes = await fetch(url);
  const fetchedBody = await fetchRes.text().catch(() => null);
  console.log('Fetch signed status:', fetchRes.status, 'len:', fetchedBody?.length);
  if (fetchRes.status !== 200) throw new Error('Fetch signed failed');

  // 5) Delete photo
  const delRes = await fetch(`${BASE_URL}/activity_places/${placeId}/photos/${photoId}`, {
    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Delete photo status:', delRes.status);

  // 6) Delete place
  const delPlaceRes = await fetch(`${BASE_URL}/activity_places/${placeId}`, {
    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Delete place status:', delPlaceRes.status);

  console.log('Integration flow completed successfully.');
}

main().catch((e) => { console.error(e); process.exit(1); });
