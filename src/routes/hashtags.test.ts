import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { hashtagsRouter } from './hashtags';

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

import { getDb } from '../utils/db';

describe('Hashtags Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', hashtagsRouter);
  });

  describe('GET /', () => {
    it('should return list of trending hashtags', async () => {
      const mockHashtags = [
        { tag: 'javascript', count: 150, updatedAt: new Date() },
        { tag: 'typescript', count: 120, updatedAt: new Date() },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockHashtags),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(new Request('http://localhost/'));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
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
      expect(data.code).toBe('HASHTAGS_LIST_ERROR');
    });
  });

  describe('GET /:tag', () => {
    it('should return specific hashtag', async () => {
      const mockHashtag = { tag: 'javascript', count: 150, updatedAt: new Date() };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockHashtag),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/javascript')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect((data as any).tag).toBe('javascript');
    });

    it('should return 404 when hashtag not found', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/nonexistent')
      );

      expect(response.status).toBe(404);
      const data = await response.json() as any;
      expect(data.code).toBe('HASHTAG_NOT_FOUND');
    });
  });
});
