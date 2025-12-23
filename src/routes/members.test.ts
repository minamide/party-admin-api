import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { membersRouter } from './members';

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

describe('Members Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', membersRouter);
  });

  describe('Community Members', () => {
    describe('POST /community', () => {
      it('should add community member', async () => {
        const memberData = { userId: 'user-1', communityId: 'comm-1', role: 'member' };

        const mockDb = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue(undefined),
        };

        mockGetDb.mockReturnValue(mockDb as any);
        mockValidateRequired.mockReturnValue({ valid: true });

        const response = await app.request(
          new Request('http://localhost/community', {
            method: 'POST',
            body: JSON.stringify(memberData),
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
          missing: ['communityId'],
        });

        const response = await app.request(
          new Request('http://localhost/community', {
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

    describe('DELETE /community/:userId/:communityId', () => {
      it('should remove community member', async () => {
        const mockDb = {
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined),
        };

        mockGetDb.mockReturnValue(mockDb as any);

        const response = await app.request(
          new Request('http://localhost/community/user-1/comm-1', {
            method: 'DELETE',
          })
        );

        expect(response.status).toBe(200);
        const data = await response.json() as any;
        expect(data.success).toBe(true);
      });
    });
  });

  describe('List Members', () => {
    describe('POST /list', () => {
      it('should add list member', async () => {
        const memberData = { listId: 'list-1', userId: 'user-1' };

        const mockDb = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue(undefined),
        };

        mockGetDb.mockReturnValue(mockDb as any);
        mockValidateRequired.mockReturnValue({ valid: true });

        const response = await app.request(
          new Request('http://localhost/list', {
            method: 'POST',
            body: JSON.stringify(memberData),
            headers: { 'Content-Type': 'application/json' },
          })
        );

        expect(response.status).toBe(201);
        const data = await response.json() as any;
        expect(data.success).toBe(true);
      });
    });

    describe('DELETE /list/:listId/:userId', () => {
      it('should remove list member', async () => {
        const mockDb = {
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined),
        };

        mockGetDb.mockReturnValue(mockDb as any);

        const response = await app.request(
          new Request('http://localhost/list/list-1/user-1', {
            method: 'DELETE',
          })
        );

        expect(response.status).toBe(200);
        const data = await response.json() as any;
        expect(data.success).toBe(true);
      });
    });
  });
});
