import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { usersRouter } from './users';

// 認証ミドルウェアをモック
vi.mock('../middleware/auth', () => ({
  authMiddleware: vi.fn(async (c: any, next: any) => {
    c.env = c.env || {};
    c.env.JWT_SECRET = 'test-secret';
    await next();
  }),
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.env = c.env || {};
    c.env.auth = {
      user: {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
      },
    };
    await next();
  }),
}));

// Mock the database utilities
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
  isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  isValidHandle: vi.fn((handle: string) => /^[a-z0-9_]{3,30}$/.test(handle)),
}));

import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired, isValidEmail, isValidHandle } from '../utils/validation';

describe('Users Router', () => {
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);
  const mockIsValidEmail = vi.mocked(isValidEmail);
  const mockIsValidHandle = vi.mocked(isValidHandle);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return list of users with 200 status', async () => {
      const mockUsers = [
        { id: '1', name: 'Alice', handle: 'alice', email: 'alice@test.com' },
        { id: '2', name: 'Bob', handle: 'bob', email: 'bob@test.com' },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockUsers),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(new Request('http://localhost/'));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockUsers);
    });

    it('should return 500 on database error', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        all: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(new Request('http://localhost/'));

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.code).toBe('USERS_LIST_ERROR');
    });
  });

  describe('POST /', () => {
    it('should create user with valid data and return 201', async () => {
      const newUser = {
        id: 'user-123',
        name: 'Charlie',
        handle: 'charlie',
        email: 'charlie@test.com',
        role: 'user',
      };

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(newUser),
      };

      mockGetDb.mockReturnValue(mockDb as any);
      mockValidateRequired.mockReturnValue({ valid: true });
      mockIsValidHandle.mockReturnValue(true);
      mockIsValidEmail.mockReturnValue(true);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(newUser),
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer dummy-token'
          },
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(newUser);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidUser = {
        id: 'user-123',
        // Missing name and handle
      };

      mockValidateRequired.mockReturnValue({
        valid: false,
        missing: ['name', 'handle'],
      });

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(invalidUser),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details.missing).toContain('name');
      expect(data.details.missing).toContain('handle');
    });

    it('should return 400 for invalid handle format', async () => {
      const userWithInvalidHandle = {
        id: 'user-123',
        name: 'David',
        handle: 'da', // Too short (need 3+ chars)
        email: 'david@test.com',
      };

      mockValidateRequired.mockReturnValue({ valid: true });
      mockIsValidHandle.mockReturnValue(false);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(userWithInvalidHandle),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('INVALID_HANDLE');
    });

    it('should return 400 for invalid email format', async () => {
      const userWithInvalidEmail = {
        id: 'user-123',
        name: 'Eve',
        handle: 'eve_user',
        email: 'invalid-email', // Invalid email
      };

      mockValidateRequired.mockReturnValue({ valid: true });
      mockIsValidHandle.mockReturnValue(true);
      mockIsValidEmail.mockReturnValue(false);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(userWithInvalidEmail),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('INVALID_EMAIL');
    });
  });

  describe('GET /:id', () => {
    it('should return user by id with 200 status', async () => {
      const user = {
        id: 'user-123',
        name: 'Frank',
        handle: 'frank',
        email: 'frank@test.com',
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(user),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/user-123')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(user);
    });

    it('should return 404 when user not found', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/nonexistent-id')
      );

      expect(response.status).toBe(404);
      const data = await response.json() as any;
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('should return 500 on database error', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error('DB error')),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/user-123')
      );

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.code).toBe('USER_GET_ERROR');
    });
  });

  describe('PUT /:id', () => {
    it('should update user and return 200', async () => {
      const updateData = {
        name: 'Frank Updated',
        email: 'frank_new@test.com',
      };

      const updatedUser = {
        id: 'user-123',
        ...updateData,
        handle: 'frank',
        updatedAt: new Date().toISOString(),
      };

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(updatedUser),
      };

      mockGetDb.mockReturnValue(mockDb as any);
      mockIsValidEmail.mockReturnValue(true);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/user-123', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.name).toBe(updateData.name);
      expect(data.email).toBe(updateData.email);
    });

    it('should return 400 for invalid email during update', async () => {
      const updateData = {
        email: 'invalid-email-format',
      };

      mockIsValidEmail.mockReturnValue(false);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/user-123', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('INVALID_EMAIL');
    });
  });

  describe('DELETE /:id', () => {
    it('should delete user and return 200 with success', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/user-123', {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
    });

    it('should return 400 on database error during delete', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error('Delete failed')),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const app = new (await import('hono')).Hono();
      app.route('/', usersRouter);

      const response = await app.request(
        new Request('http://localhost/user-123', {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('USER_DELETE_ERROR');
    });
  });
});
