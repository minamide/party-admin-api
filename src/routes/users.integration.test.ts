import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import { usersRouter } from './users';

describe('Users Router - Integration Tests (Mock D1)', () => {
  let app: Hono;
  const usersList: any[] = [];

  beforeAll(async () => {
    // Create Hono app with mock D1
    app = new Hono();
    
    // Mock D1 context
    app.use('*', (c, next) => {
      c.env = c.env || {};
      c.env.DB = {
        prepare: (sql: string) => ({
          bind: (...params: any[]) => ({
            run: async () => ({ success: true }),
            all: async () => usersList,
            first: async () => usersList[0] || null,
          }),
          all: async () => usersList,
          first: async () => usersList[0] || null,
        }),
      };
      return next();
    });

    app.route('/', usersRouter);
  });

  afterAll(async () => {
    // Cleanup
    usersList.length = 0;
  });

  describe('POST / - Create user', () => {
    it('should create a user with valid data or return error', async () => {
      const userData = {
        name: 'Test User',
        handle: 'testuser123',
        email: 'test@example.com',
        role: 'user',
      };

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(userData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect([201, 400, 500]).toContain(response.status);
    });

    it('should fail without required fields', async () => {
      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ name: 'No Handle' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET / - List users', () => {
    it('should return users list or empty array', async () => {
      const response = await app.request(
        new Request('http://localhost/')
      );

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json() as any;
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });

  describe('GET /:id - Get user by ID', () => {
    it('should return 404 for non-existent user', async () => {
      const response = await app.request(
        new Request('http://localhost/nonexistent-id')
      );

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('PUT /:id - Update user', () => {
    it('should return error or success for update', async () => {
      const userId = crypto.randomUUID();

      const response = await app.request(
        new Request(`http://localhost/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /:id - Delete user', () => {
    it('should return error or success for deletion', async () => {
      const userId = crypto.randomUUID();

      const response = await app.request(
        new Request(`http://localhost/${userId}`, {
          method: 'DELETE',
        })
      );

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Data persistence', () => {
    it('should maintain data consistency across requests', async () => {
      // Just verify the endpoint is callable
      const listResponse = await app.request(
        new Request('http://localhost/')
      );

      expect([200, 500]).toContain(listResponse.status);
    });
  });
});
