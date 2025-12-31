import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { censusMeshRouter } from './census_mesh';

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

describe('Census Mesh Router', () => {
  let app: Hono;
  const mockGetDb = vi.mocked(getDb);

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/', censusMeshRouter);
  });

  describe('GET /:keyCode', () => {
    it('should return census mesh data for a specific key code', async () => {
      const mockData = {
        keyCode: '623927591',
        htkSyori: 0,
        htkSaki: null,
        gassan: null,
        t001101001: 149,
        t001101002: 59,
        t001101003: 90,
        t001101034: 84,
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockData),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const res = await app.request('/623927591');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockData);
    });

    it('should return 404 if mesh data not found', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const res = await app.request('/999999999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /', () => {
    it('should return census mesh data with query filters', async () => {
      const mockResults = [
        {
          keyCode: '623927591',
          t001101001: 149,
          t001101034: 84,
        },
        {
          keyCode: '623927592',
          t001101001: 194,
          t001101034: 112,
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockResults),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const res = await app.request('/?keyCodePrefix=6239&minPopulation=100&limit=10');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual(mockResults);
      expect(json.meta.limit).toBe(10);
    });

    it('should enforce maximum limit of 1000', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([]),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const res = await app.request('/?limit=5000');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.meta.limit).toBe(1000);
    });
  });

  describe('GET /summary/:keyCodePrefix', () => {
    it('should return aggregated summary for key code prefix', async () => {
      const mockSummary = {
        totalPopulation: 1000,
        totalHouseholds: 450,
        totalMale: 480,
        totalFemale: 520,
        totalAge0to14: 150,
        totalAge15to64: 650,
        totalAge65Plus: 200,
        totalAge75Plus: 80,
        totalForeigners: 30,
        meshCount: 10,
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSummary),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const res = await app.request('/summary/6239');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.keyCodePrefix).toBe('6239');
      expect(json.summary).toEqual(mockSummary);
    });

    it('should return 404 if no meshes found for prefix', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ meshCount: 0 }),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const res = await app.request('/summary/9999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /statistics/demographics/:keyCode', () => {
    it('should return formatted demographics data', async () => {
      const mockData = {
        keyCode: '623927591',
        t001101001: 149,
        t001101002: 59,
        t001101003: 90,
        t001101004: 10,
        t001101005: 5,
        t001101006: 5,
        t001101010: 100,
        t001101011: 40,
        t001101012: 60,
        t001101019: 39,
        t001101020: 14,
        t001101021: 25,
        t001101022: 15,
        t001101023: 6,
        t001101024: 9,
        t001101031: 5,
        t001101032: 2,
        t001101033: 3,
        t001101034: 84,
        t001101035: 84,
        t001101036: 40,
        t001101037: 31,
        t001101038: 7,
        t001101039: 4,
        t001101040: 2,
        t001101041: 0,
        t001101042: 0,
        t001101044: 38,
        t001101049: 14,
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockData),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const res = await app.request('/statistics/demographics/623927591');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.keyCode).toBe('623927591');
      expect(json.population.total).toBe(149);
      expect(json.population.male).toBe(59);
      expect(json.households.total).toBe(84);
      expect(json.ageGroups.age65Plus.total).toBe(39);
    });

    it('should return 404 if mesh data not found', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      const res = await app.request('/statistics/demographics/999999999');
      expect(res.status).toBe(404);
    });
  });
});
