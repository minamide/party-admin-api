import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { followsRouter } from './follows';

vi.mock('../utils/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('../utils/errors', () => ({
  getErrorMessage: vi.fn((error: unknown) => {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  }),
  createErrorResponse: vi.fn((message: string, code?: string, details?: unknown) => ({
    error: message,
    code: code || 'UNKNOWN_ERROR',
    ...(details && { details }),
  })),
}));

vi.mock('../utils/validation', () => ({
  validateRequired: vi.fn((body: unknown, fields: string[]) => {
    const b = body as Record<string, unknown>;
    const missing = fields.filter(f => !b[f]);
    return {
      valid: missing.length === 0,
      missing: missing.length > 0 ? missing : undefined,
    };
  }),
}));

import { getDb } from '../utils/db';
import { validateRequired } from '../utils/validation';

describe('Follows Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', followsRouter);
  });

  describe('POST /', () => {
    it('should create follow relationship', async () => {
      const followData = { followerId: 'user-1', followingId: 'user-2' };

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
      };

      mockGetDb.mockReturnValue(mockDb as any);
      mockValidateRequired.mockReturnValue({ valid: true });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(followData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
    });

    it('should return 400 for missing fields', async () => {
      mockValidateRequired.mockReturnValue({
        valid: false,
        missing: ['followingId'],
      });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ followerId: 'user-1' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /:followerId/:followingId', () => {
    it('should delete follow relationship', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/user-1/user-2', {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
    });
  });

  describe('GET /:userId/followers', () => {
    it('should return followers list', async () => {
      const mockFollowers = [
        { id: 'follower-1', name: 'Follower 1', handle: 'follower1' },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockFollowers),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/user-1/followers')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
