const id = '8888d8f9-60c2-4524-b43b-0c97ea7d8edb';
const res = await fetch('http://127.0.0.1:8787/activity_places/' + id);
console.log('Status', res.status);
console.log(await res.text());
