import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { reportsRouter } from './reports';

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

describe('Reports Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', reportsRouter);
  });

  describe('GET /', () => {
    it('should return list of reports', async () => {
      const mockReports = [
        { id: 'report-1', reporterId: 'user-1', targetId: 'user-2', reason: 'spam', status: 'pending' },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockReports),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(new Request('http://localhost/'));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /', () => {
    it('should create report with valid data', async () => {
      const reportData = { reporterId: 'user-1', targetId: 'user-2', reason: 'spam' };

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ id: 'report-new', ...reportData, status: 'pending' }),
      };

      mockGetDb.mockReturnValue(mockDb as any);
      mockValidateRequired.mockReturnValue({ valid: true });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(reportData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(201);
    });

    it('should return 400 for missing fields', async () => {
      mockValidateRequired.mockReturnValue({
        valid: false,
        missing: ['reason'],
      });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ reporterId: 'user-1', targetId: 'user-2' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /:id', () => {
    it('should update report status', async () => {
      const updateData = { status: 'resolved' };

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ id: 'report-1', status: 'resolved' }),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/report-1', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(200);
    });
  });
});
