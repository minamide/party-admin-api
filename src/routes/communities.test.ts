import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { communitiesRouter } from './communities';

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

describe('Communities Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', communitiesRouter);
  });

  describe('GET /', () => {
    it('should return list of communities', async () => {
      const mockCommunities = [
        { id: 'comm-1', name: 'Community 1', ownerId: 'user-1', description: 'Desc 1' },
        { id: 'comm-2', name: 'Community 2', ownerId: 'user-2', description: 'Desc 2' },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockCommunities),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(new Request('http://localhost/'));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockCommunities);
    });

    it('should return 500 on database error', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        all: vi.fn().mockRejectedValue(new Error('DB error')),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(new Request('http://localhost/'));
      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.code).toBe('COMMUNITIES_LIST_ERROR');
    });
  });

  describe('POST /', () => {
    it('should create community with valid data', async () => {
      const newCommunity = {
        name: 'New Community',
        ownerId: 'user-1',
        description: 'A new community',
      };

      const created = { id: 'comm-new', ...newCommunity, iconUrl: null, bannerUrl: null };

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
          body: JSON.stringify(newCommunity),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.name).toBe(newCommunity.name);
    });

    it('should return 400 for missing name or ownerId', async () => {
      mockValidateRequired.mockReturnValue({
        valid: false,
        missing: ['name'],
      });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ ownerId: 'user-1' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });
});
