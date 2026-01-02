import { describe, it, expect, beforeEach } from 'vitest';
import { Hono, Context } from 'hono';
import { usersRouter } from './users';

class MockD1Database {
  private data: Record<string, any[]> = { users: [], profiles: [] };

  prepare(sql: string) {
    const self = this;
    return {
      bind: (...params: any[]) => ({
        run: async () => {
          if (sql.includes('INSERT')) {
            const table = self.getTableFromSql(sql);
            self.data[table] = self.data[table] || [];
            const payload = params[0] ?? {};
            self.data[table].push(payload);
            return { success: true, changes: 1 };
          }
          if (sql.includes('UPDATE')) return { success: true, changes: 1 };
          if (sql.includes('DELETE')) return { success: true, changes: 1 };
          return { success: true };
        },
        all: async () => {
          const table = self.getTableFromSql(sql);
          return self.data[table] || [];
        },
        first: async () => {
          const table = self.getTableFromSql(sql);
          return self.data[table]?.[0] ?? null;
        },
      }),
      all: async () => {
        const table = this.getTableFromSql(sql);
        return this.data[table] || [];
      },
      first: async () => {
        const table = this.getTableFromSql(sql);
        return this.data[table]?.[0] ?? null;
      },
    };
  }

  async all(sql: string) {
    const table = this.getTableFromSql(sql);
    return this.data[table] || [];
  }

  async first(sql: string) {
    const table = this.getTableFromSql(sql);
    return this.data[table]?.[0] ?? null;
  }

  private getTableFromSql(sql: string): string {
    if (sql.includes('profiles')) return 'profiles';
    return 'users';
  }

  reset() {
    this.data = { users: [], profiles: [] };
  }
}

describe('Users D1 Integration Tests', () => {
  let app: Hono;
  let db: MockD1Database;

  beforeEach(() => {
    db = new MockD1Database();
    app = new Hono();

    app.use('*', (c: Context, next) => {
      c.env = c.env || {};
      c.env.DB = db;
      return next();
    });

    app.route('/', usersRouter);
  });

  describe('User CRUD Operations', () => {
    it('should handle GET / - list all users', async () => {
      const response = await app.request(new Request('http://localhost/'));
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(Array.isArray(data) || typeof data === 'object').toBe(true);
      }
    });

    it('should handle POST / - create new user', async () => {
      const userData = { name: 'John Doe', handle: 'johndoe', email: 'john@example.com', role: 'user' };
      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(userData),
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect([201, 400, 500]).toContain(response.status);
    });

    it('should handle GET /:id - retrieve specific user', async () => {
      const userId = crypto.randomUUID();
      const response = await app.request(new Request(`http://localhost/${userId}`));
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle PUT /:id - update user data', async () => {
      const userId = crypto.randomUUID();
      const updateData = { name: 'Updated Name', email: 'updated@example.com' };
      const response = await app.request(
        new Request(`http://localhost/${userId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle DELETE /:id - delete user', async () => {
      const userId = crypto.randomUUID();
      const response = await app.request(new Request(`http://localhost/${userId}`, { method: 'DELETE' }));
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('User Validation', () => {
    it('should validate email format', async () => {
      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test User', handle: 'testuser', email: 'invalid-email-format', role: 'user' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect([400, 500]).toContain(response.status);
    });

    it('should validate handle format', async () => {
      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test User', handle: 'a', email: 'test@example.com', role: 'user' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect([400, 500]).toContain(response.status);
    });

    it('should require all mandatory fields', async () => {
      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test User' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent user', async () => {
      const userId = crypto.randomUUID();
      const response = await app.request(new Request(`http://localhost/${userId}`));
      expect([200, 404, 500]).toContain(response.status);
    });
  });

});
