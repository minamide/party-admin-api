import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { attachmentsRouter } from './attachments';

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

describe('Attachments Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);
  const mockValidateRequired = vi.mocked(validateRequired);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', attachmentsRouter);
  });

  describe('GET /:postId', () => {
    it('should return post attachments', async () => {
      const mockAttachments = [
        { id: 'attach-1', postId: 'post-1', mediaUrl: 'http://example.com/image.jpg', type: 'image' },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockAttachments),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/post-1')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /', () => {
    it('should create attachment', async () => {
      const attachData = {
        postId: 'post-1',
        mediaUrl: 'http://example.com/image.jpg',
        type: 'image',
      };

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ id: 'attach-new', ...attachData }),
      };

      mockGetDb.mockReturnValue(mockDb as any);
      mockValidateRequired.mockReturnValue({ valid: true });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify(attachData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(201);
    });

    it('should return 400 for missing fields', async () => {
      mockValidateRequired.mockReturnValue({
        valid: false,
        missing: ['type'],
      });

      const response = await app.request(
        new Request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ postId: 'post-1', mediaUrl: 'http://...' }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /:id', () => {
    it('should delete attachment', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const response = await app.request(
        new Request('http://localhost/attach-1', {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
    });
  });

  describe('Media Versions', () => {
    describe('GET /:attachmentId/versions', () => {
      it('should return media versions', async () => {
        const mockVersions = [
          { id: 'ver-1', attachmentId: 'attach-1', variant: 'thumbnail', url: 'http://...' },
        ];

        const mockDb = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue(mockVersions),
        };

        mockGetDb.mockReturnValue(mockDb as any);

        const response = await app.request(
          new Request('http://localhost/attach-1/versions')
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });
    });
  });
});
