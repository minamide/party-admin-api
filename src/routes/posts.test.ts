import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { postsRouter } from './posts';

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

describe('Posts Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', postsRouter);
  });

  describe('GET /', () => {
    it('should return list of posts with 200 status', async () => {
      const mockPosts = [
        { id: 'post-1', authorId: 'user-1', content: 'Hello', type: 'text', visibility: 'public', createdAt: new Date().toISOString() },
        { id: 'post-2', authorId: 'user-2', content: 'World', type: 'text', visibility: 'public', createdAt: new Date().toISOString() },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockPosts),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(new Request('http://localhost/'));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockPosts);
    });

    it('should return 500 on database error', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        all: vi.fn().mockRejectedValue(new Error('DB error')),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(new Request('http://localhost/'));

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.code).toBe('POSTS_LIST_ERROR');
    });
  });

  describe('POST /', () => {
    it('should create post with valid authorId and return 201', async () => {
      const newPost = {
        authorId: 'user-1',
        content: 'New post',
        type: 'text',
        visibility: 'public',
      };

      const createdPost = {
        id: 'post-new',
        ...newPost,
        communityId: null,
        media: null,
        hashtags: null,
        createdAt: new Date(),
      };

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(createdPost),
      };

      mockGetDb.mockReturnValue(mockDb as any);
      mockValidateRequired.mockReturnValue({ valid: true });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(newPost),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.authorId).toBe(newPost.authorId);
    });

    it('should return 400 for missing authorId', async () => {
      const invalidPost = {
        content: 'No author',
      };

      mockValidateRequired.mockReturnValue({
        valid: false,
        missing: ['authorId'],
      });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(invalidPost),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details.missing).toContain('authorId');
    });
  });
});
