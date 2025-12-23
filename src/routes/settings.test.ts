import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { settingsRouter } from './settings';

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

describe('Settings Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', settingsRouter);
  });

  describe('GET /:userId', () => {
    it('should return user settings', async () => {
      const mockSettings = {
        userId: 'user-1',
        preferences: { theme: 'dark', language: 'en' },
        notifications: { email: true, push: false },
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSettings),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/user-1')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect((data as any).userId).toBe('user-1');
    });

    it('should return 404 when settings not found', async () => {
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
      expect(data.code).toBe('SETTINGS_NOT_FOUND');
    });

    it('should return 500 on database error', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error('DB error')),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/user-1')
      );

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.code).toBe('SETTINGS_GET_ERROR');
    });
  });

  describe('PUT /:userId', () => {
    it('should update user settings', async () => {
      const updateData = {
        preferences: { theme: 'light' },
        notifications: { email: false },
      };

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ userId: 'user-1', ...updateData }),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/user-1', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.userId).toBe('user-1');
    });

    it('should return 400 on update error', async () => {
      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error('Update failed')),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/user-1', {
          method: 'PUT',
          body: JSON.stringify({ preferences: { theme: 'dark' } }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('SETTINGS_UPDATE_ERROR');
    });
  });
});
