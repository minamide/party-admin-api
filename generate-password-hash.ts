import { hashPassword } from './src/utils/password.ts';

async function generateHashAndSalt(password) {
  const { hash, salt } = await hashPassword(password);
  console.log('Generated Hash:', hash);
  console.log('Generated Salt:', salt);
  console.log('-- INSERT SQL (replace YOUR_USER_ID with a UUID):');
  console.log(`INSERT INTO users (id, name, email, handle, password_hash, password_salt, role, created_at, updated_at) VALUES ('YOUR_USER_ID', 'Admin User', 'admin@example.com', 'admin', '${hash}', '${salt}', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`);
}

generateHashAndSalt('AdminPass123'); // あなたの希望する管理者パスワード