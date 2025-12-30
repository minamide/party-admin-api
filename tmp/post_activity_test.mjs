import crypto from 'node:crypto';
function b64u(b){return Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
const header = b64u(JSON.stringify({alg:'HS256',typ:'JWT'}));
const now = Math.floor(Date.now()/1000);
const payload = b64u(JSON.stringify({userId:'test-user-1',email:'test@example.com',role:'admin',iat:now,exp:now+86400}));
const msg = header + '.' + payload;
const sig = crypto.createHmac('sha256','your-super-secret-jwt-key-change-this-in-production').update(msg).digest();
const token = msg + '.' + b64u(sig);
console.log('TOKEN', token);

try {
  const res = await fetch('http://127.0.0.1:8787/activity_places', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ name: 'テスト会場', address: '東京都', city_code: '13101' })
  });
  console.log('STATUS', res.status);
  const text = await res.text();
  console.log('BODY', text);
} catch (e) {
  console.error('ERROR', e);
  process.exit(1);
}
