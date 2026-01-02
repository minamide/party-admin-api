import crypto from 'crypto';

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest();
}

function createJWT(payload, secret, expiresInSeconds = 24 * 3600) {
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(message, secret);
  const encodedSignature = base64UrlEncode(signature);
  return `${message}.${encodedSignature}`;
}

async function main() {
  const secret = process.env.TEST_JWT_SECRET;
  if (!secret) {
    console.error('TEST_JWT_SECRET must be set');
    process.exit(2);
  }

  const adminId = process.env.CI_TEST_ADMIN_ID || 'ci-admin';
  const userId = process.env.CI_TEST_USER_ID || 'ci-user';

  const adminToken = createJWT({ userId: adminId, email: `${adminId}@example.com`, role: 'admin' }, secret);
  const userToken = createJWT({ userId: userId, email: `${userId}@example.com`, role: 'user' }, secret);

  // Emit env file lines
  console.log(`TEST_ADMIN_TOKEN=${adminToken}`);
  console.log(`TEST_USER_TOKEN=${userToken}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
