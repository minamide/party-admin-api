import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { interactionsRouter } from './interactions';

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

describe('Interactions Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', interactionsRouter);
  });

  describe('Blocked Users', () => {
    describe('POST /blocked', () => {
      it('should block user', async () => {
        const blockData = { userId: 'user-1', targetId: 'user-2' };

        const mockDb = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue(undefined),
        };

        mockGetDb.mockReturnValue(mockDb as any);
        mockValidateRequired.mockReturnValue({ valid: true });

        const response = await app.request(
          new Request('http://localhost/blocked', {
            method: 'POST',
            body: JSON.stringify(blockData),
            headers: { 'Content-Type': 'application/json' },
          })
        );

        expect(response.status).toBe(201);
        const data = await response.json() as any;
        expect(data.success).toBe(true);
      });
    });

    describe('DELETE /blocked/:userId/:targetId', () => {
      it('should unblock user', async () => {
        const mockDb = {
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined),
        };

        mockGetDb.mockReturnValue(mockDb as any);

        const response = await app.request(
          new Request('http://localhost/blocked/user-1/user-2', {
            method: 'DELETE',
          })
        );

        expect(response.status).toBe(200);
        const data = await response.json() as any;
        expect(data.success).toBe(true);
      });
    });
  });

  describe('Muted Users', () => {
    describe('POST /muted', () => {
      it('should mute user', async () => {
        const muteData = { userId: 'user-1', targetId: 'user-2' };

        const mockDb = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue(undefined),
        };

        mockGetDb.mockReturnValue(mockDb as any);
        mockValidateRequired.mockReturnValue({ valid: true });

        const response = await app.request(
          new Request('http://localhost/muted', {
            method: 'POST',
            body: JSON.stringify(muteData),
            headers: { 'Content-Type': 'application/json' },
          })
        );

        expect(response.status).toBe(201);
        const data = await response.json() as any;
        expect(data.success).toBe(true);
      });
    });

    describe('DELETE /muted/:userId/:targetId', () => {
      it('should unmute user', async () => {
        const mockDb = {
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined),
        };

        mockGetDb.mockReturnValue(mockDb as any);

        const response = await app.request(
          new Request('http://localhost/muted/user-1/user-2', {
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
