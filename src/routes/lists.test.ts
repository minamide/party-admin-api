import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { listsRouter } from './lists';

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

describe('Lists Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', listsRouter);
  });

  describe('GET /', () => {
    it('should return list of lists', async () => {
      const mockLists = [
        { id: 'list-1', name: 'List 1', ownerId: 'user-1', isPrivate: 0 },
        { id: 'list-2', name: 'List 2', ownerId: 'user-1', isPrivate: 1 },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockLists),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(new Request('http://localhost/'));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockLists);
    });
  });

  describe('POST /', () => {
    it('should create list with valid data', async () => {
      const listData = { name: 'New List', ownerId: 'user-1', description: 'My list' };
      const created = { id: 'list-new', ...listData, isPrivate: 0 };

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(created),
      };

      mockGetDb.mockReturnValue(mockDb as any);
      mockValidateRequired.mockReturnValue({ valid: true });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(listData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.name).toBe(listData.name);
    });
  });

  describe('GET /:id', () => {
    it('should return list by id', async () => {
      const mockList = { id: 'list-1', name: 'List 1', ownerId: 'user-1' };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockList),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/list-1')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockList);
    });

    it('should return 404 when list not found', async () => {
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
      expect(data.code).toBe('LIST_NOT_FOUND');
    });
  });
});
