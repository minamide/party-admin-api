import crypto from 'node:crypto';
function b64u(b){return Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
const header = b64u(JSON.stringify({alg:'HS256',typ:'JWT'}));
const now = Math.floor(Date.now()/1000);
const payload = b64u(JSON.stringify({userId:'test-user-1',email:'test@example.com',role:'admin',iat:now,exp:now+86400}));
const msg = header + '.' + payload;
const sig = crypto.createHmac('sha256','your-super-secret-jwt-key-change-this-in-production').update(msg).digest();
const token = msg + '.' + b64u(sig);
console.log('Using token (truncated):', token.slice(0,40) + '...');

// ID returned from earlier POST
const id = 'f94e358a-37c3-4eee-991c-2e1ec932e850';
const base = 'http://127.0.0.1:8787';

async function run(){
  try{
    console.log('\n1) GET /activity_places/:id');
    let res = await fetch(`${base}/activity_places/${id}`);
    console.log('Status', res.status);
    console.log(await res.text());

    console.log('\n2) PUT /activity_places/:id (update name)');
    res = await fetch(`${base}/activity_places/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ name: 'テスト会場 - 更新', notes: '更新ノート' })
    });
    console.log('Status', res.status);
    console.log(await res.text());

    console.log('\n3) GET /activity_places/:id (after update)');
    res = await fetch(`${base}/activity_places/${id}`);
    console.log('Status', res.status);
    console.log(await res.text());

    console.log('\n4) DELETE /activity_places/:id');
    res = await fetch(`${base}/activity_places/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    console.log('Status', res.status);
    console.log(await res.text());

    console.log('\n5) GET /activity_places (verify list)');
    res = await fetch(`${base}/activity_places`);
    console.log('Status', res.status);
    console.log(await res.text());

  }catch(e){
    console.error('ERROR', e);
    process.exit(1);
  }
}

run();
