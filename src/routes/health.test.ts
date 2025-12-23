import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { healthRouter } from './health';

describe('Health Router', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/', healthRouter);
  });

  describe('GET /', () => {
    it('should return health status with 200', async () => {
      const response = await app.request(new Request('http://localhost/'));

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', async () => {
      const response = await app.request(new Request('http://localhost/'));
      const data = await response.json() as any;

      // Verify ISO timestamp format
      expect(() => new Date(data.timestamp).toISOString()).not.toThrow();
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
