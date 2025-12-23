import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { bookmarksRouter } from './bookmarks';

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

describe('Bookmarks Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', bookmarksRouter);
  });

  describe('POST /', () => {
    it('should create bookmark with valid data', async () => {
      const bookmarkData = { userId: 'user-1', postId: 'post-1' };

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
      };

      mockGetDb.mockReturnValue(mockDb as any);
      mockValidateRequired.mockReturnValue({ valid: true });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(bookmarkData),
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
        missing: ['postId'],
      });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-1' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /:userId/:postId', () => {
    it('should delete bookmark', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/user-1/post-1', {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
    });
  });

  describe('GET /:userId', () => {
    it('should return user bookmarks', async () => {
      const mockBookmarks = [
        { userId: 'user-1', postId: 'post-1', createdAt: new Date().toISOString() },
        { userId: 'user-1', postId: 'post-2', createdAt: new Date().toISOString() },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockBookmarks),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(new Request('http://localhost/user-1'));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockBookmarks);
    });
  });
});
