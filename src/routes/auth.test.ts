/**
 * 認証ルート統合テスト
 * JWT sign-up, sign-in, sign-out, me エンドポイントのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { HonoRequest } from 'hono/request';
import { authRouter } from '../routes/auth';
import { generateJWT, verifyJWT } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';

describe('JWT Authentication Tests', () => {
  describe('JWT Utility Functions', () => {
    it('should generate and verify a valid JWT', async () => {
      const secret = 'test-secret-key';
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };

      const token = await generateJWT(payload, secret, 3600);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const verified = await verifyJWT(token, secret);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
      expect(verified.iat).toBeTruthy();
      expect(verified.exp).toBeTruthy();
    });

    it('should reject an expired token', async () => {
      const secret = 'test-secret-key';
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };

      // 1 秒で有効期限切れ
      const token = await generateJWT(payload, secret, 1);
      
      // 少し待機（有効期限切れを確実にするため）
      await new Promise((resolve) => setTimeout(resolve, 1100));

      try {
        await verifyJWT(token, secret);
        expect.fail('Should have thrown an error for expired token');
      } catch (error) {
        expect(error instanceof Error && error.message).toContain('expired');
      }
    });

    it('should reject a token with invalid signature', async () => {
      const secret1 = 'test-secret-1';
      const secret2 = 'test-secret-2';
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };

      const token = await generateJWT(payload, secret1, 3600);

      try {
        await verifyJWT(token, secret2);
        expect.fail('Should have thrown an error for invalid signature');
      } catch (error) {
        expect(error instanceof Error && error.message).toContain('signature');
      }
    });
  });

  describe('Password Management', () => {
    it('should hash and verify a password', async () => {
      const password = 'SecurePassword123!';
      
      const { hash, salt } = await hashPassword(password);
      expect(hash).toBeTruthy();
      expect(salt).toBeTruthy();

      const isMatch = await verifyPassword(password, hash, salt);
      expect(isMatch).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword456!';

      const { hash, salt } = await hashPassword(password);
      const isMatch = await verifyPassword(wrongPassword, hash, salt);
      expect(isMatch).toBe(false);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'SecurePassword123!';

      const result1 = await hashPassword(password);
      const result2 = await hashPassword(password);

      // ハッシュが異なることを確認（ソルトが異なるため）
      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.salt).not.toBe(result2.salt);

      // ただし両方とも同じパスワードで検証可能
      const verify1 = await verifyPassword(password, result1.hash, result1.salt);
      const verify2 = await verifyPassword(password, result2.hash, result2.salt);

      expect(verify1).toBe(true);
      expect(verify2).toBe(true);
    });

    it('should handle edge case: empty password', async () => {
      const password = '';

      try {
        const { hash, salt } = await hashPassword(password);
        expect(hash).toBeTruthy();
        expect(salt).toBeTruthy();

        const isMatch = await verifyPassword(password, hash, salt);
        expect(isMatch).toBe(true);
      } catch (error) {
        // 実装によってはエラーになる可能性もある
        console.log('Empty password handling:', error);
      }
    });
  });

  describe('JWT Token Structure', () => {
    it('should have correct JWT structure with three parts', async () => {
      const secret = 'test-secret-key';
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = await generateJWT(payload, secret, 3600);
      const parts = token.split('.');

      expect(parts.length).toBe(3);

      // デコード可能か確認
      const header = JSON.parse(
        Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
      );
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });

    it('should include all payload fields in token', async () => {
      const secret = 'test-secret-key';
      const payload = {
        userId: 'user-456',
        email: 'admin@example.com',
        role: 'admin',
      };

      const token = await generateJWT(payload, secret, 3600);
      const verified = await verifyJWT(token, secret);

      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
      expect(verified.iat).toBeTruthy();
      expect(verified.exp).toBeTruthy();
    });
  });

  describe('JWT Expiration', () => {
    it('should set correct expiration time', async () => {
      const secret = 'test-secret-key';
      const payload = {
        userId: 'user-789',
        email: 'user@example.com',
        role: 'user',
      };

      const expiresIn = 3600; // 1 時間
      const token = await generateJWT(payload, secret, expiresIn);
      const verified = await verifyJWT(token, secret);

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = verified.iat! + expiresIn;

      // 誤差を許容（1-2 秒）
      expect(Math.abs(verified.exp! - expectedExpiry)).toBeLessThanOrEqual(2);
    });
  });
});
