/*
Integration test script for activity_places photo upload flow.

Usage:
  BASE_URL=http://127.0.0.1:8787 AUTH_TOKEN=<jwt> PLACE_ID=<place-id> node tmp/activity_photos_integration.mjs

Requires Node 18+ (fetch, FormData available).
*/

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const PLACE_ID = process.env.PLACE_ID;

if (!AUTH_TOKEN || !PLACE_ID) {
  console.error('Please set AUTH_TOKEN and PLACE_ID environment variables. (BASE_URL optional)');
  process.exit(1);
}

async function run() {
  console.log('Base URL:', BASE_URL);

  // 1) Upload a small text file as image
  const form = new FormData();
  const blob = new Blob(["hello world"], { type: 'text/plain' });
  form.append('file', blob, 'test.txt');

  const uploadRes = await fetch(`${BASE_URL}/activity_places/${PLACE_ID}/photos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: form,
  });

  console.log('Upload status:', uploadRes.status);
  const uploadJson = await uploadRes.json().catch(() => null);
  console.log('Upload body:', uploadJson);

  if (uploadRes.status !== 201) {
    console.error('Upload failed.');
    process.exit(2);
  }

  const photoId = uploadJson?.id || uploadJson?.[0]?.id || (uploadJson && uploadJson.id);
  if (!photoId) {
    console.error('Could not determine photo id from response.');
    process.exit(3);
  }

  // 2) Request signed URL
  const signedRes = await fetch(`${BASE_URL}/activity_places/${PLACE_ID}/photos/${photoId}/signed_url?expires=120`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
  });
  console.log('Signed URL status:', signedRes.status);
  const signedJson = await signedRes.json().catch(() => null);
  console.log('Signed URL body:', signedJson);
  if (signedRes.status !== 200) {
    console.error('Signed URL request failed.');
    process.exit(4);
  }

  const url = signedJson?.url;
  if (!url) {
    console.error('No url in signed response');
    process.exit(5);
  }

  // 3) Fetch image via signed URL
  const fetchRes = await fetch(url);
  console.log('Fetch signed URL status:', fetchRes.status);
  const body = await fetchRes.text().catch(() => null);
  console.log('Fetched body length / preview:', (body && body.length) || 0, body ? body.slice(0,80) : '');
  if (fetchRes.status !== 200) {
    console.error('Fetching signed URL failed.');
    process.exit(6);
  }

  // 4) Delete photo
  const delRes = await fetch(`${BASE_URL}/activity_places/${PLACE_ID}/photos/${photoId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
  });
  console.log('Delete status:', delRes.status);
  const delJson = await delRes.json().catch(() => null);
  console.log('Delete body:', delJson);

  if (delRes.status !== 200) {
    console.error('Delete failed.');
    process.exit(7);
  }

  console.log('Integration test completed successfully.');
}

run().catch((err) => { console.error(err); process.exit(99); });
