import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { eventsRouter } from './events';

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

describe('Events Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', eventsRouter);
  });

  describe('POST /attendances', () => {
    it('should create event attendance', async () => {
      const attendanceData = { eventId: 'event-1', userId: 'user-1', status: 'going' };

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
      };

      mockGetDb.mockReturnValue(mockDb as any);
      mockValidateRequired.mockReturnValue({ valid: true });

      const response = await app.request(
        new Request('http://localhost/attendances', {
          method: 'POST',
          body: JSON.stringify(attendanceData),
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
        missing: ['userId'],
      });

      const response = await app.request(
        new Request('http://localhost/attendances', {
          method: 'POST',
          body: JSON.stringify({ eventId: 'event-1' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /attendances/:eventId/:userId', () => {
    it('should update attendance status', async () => {
      const updateData = { status: 'interested' };

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ eventId: 'event-1', userId: 'user-1', status: 'interested' }),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/attendances/event-1/user-1', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /attendances/:eventId/:userId', () => {
    it('should delete attendance', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/attendances/event-1/user-1', {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
    });
  });
});
