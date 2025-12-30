import crypto from 'node:crypto';
function b64u(b){return Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
const header = b64u(JSON.stringify({alg:'HS256',typ:'JWT'}));
const now = Math.floor(Date.now()/1000);
const payload = b64u(JSON.stringify({userId:'test-user-2',email:'test2@example.com',role:'admin',iat:now,exp:now+86400}));
const msg = header + '.' + payload;
const sig = crypto.createHmac('sha256','your-super-secret-jwt-key-change-this-in-production').update(msg).digest();
const token = msg + '.' + b64u(sig);
console.log('TOKEN truncated:', token.slice(0,40)+'...');

try{
  const res = await fetch('http://127.0.0.1:8787/activity_places',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify({ name:'種別テスト会場', address:'神奈川', city_code:'14100', type_codes:['street','leaflet'] })
  });
  console.log('Status', res.status);
  console.log(await res.text());
} catch(e){ console.error(e); process.exit(1); }
