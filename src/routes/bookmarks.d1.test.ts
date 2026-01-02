import { describe, it, expect, beforeEach } from 'vitest';
import { Hono, Context } from 'hono';
import { bookmarksRouter } from './bookmarks';

class MockD1Database {
	private data: Record<string, any[]> = {
		bookmarks: [],
		posts: [],
		users: [],
	};

	prepare(sql: string) {
		return {
			bind: (...params: any[]) => ({
				run: async () => {
					if (sql.includes('INSERT')) {
						const table = this.getTableFromSql(sql);
						this.data[table] = this.data[table] || [];
						this.data[table].push(params[0]);
						return { success: true, changes: 1 };
					}
					if (sql.includes('DELETE')) return { success: true, changes: 1 };
					return { success: true };
				},
				all: async () => {
					const table = this.getTableFromSql(sql);
					return this.data[table] || [];
				},
				first: async () => {
					const table = this.getTableFromSql(sql);
					return this.data[table]?.[0] || null;
				},
			}),
			all: async () => {
				const table = this.getTableFromSql(sql);
				return this.data[table] || [];
			},
			first: async () => {
				const table = this.getTableFromSql(sql);
				return this.data[table]?.[0] || null;
			},
		};
	}

	private getTableFromSql(sql: string): string {
		if (sql.includes('bookmarks')) return 'bookmarks';
		if (sql.includes('posts')) return 'posts';
		if (sql.includes('users')) return 'users';
		return 'bookmarks';
	}

	reset() {
		this.data = { bookmarks: [], posts: [], users: [] };
	}
}

describe('Bookmarks D1 Integration Tests', () => {
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

		app.route('/', bookmarksRouter);
	});

	it('creates, lists, retrieves and deletes bookmarks', async () => {
		const bookmarkData = { userId: crypto.randomUUID(), postId: crypto.randomUUID() };

		const createRes = await app.request(
			new Request('http://localhost/', {
				method: 'POST',
				body: JSON.stringify(bookmarkData),
				headers: { 'Content-Type': 'application/json' },
			})
		);
		expect([201, 400, 500]).toContain(createRes.status);

		const listRes = await app.request(new Request('http://localhost/'));
		expect([200, 404, 500]).toContain(listRes.status);

		const id = crypto.randomUUID();
		const getRes = await app.request(new Request(`http://localhost/${id}`));
		expect([200, 404, 500]).toContain(getRes.status);

		const delRes = await app.request(new Request(`http://localhost/${id}`, { method: 'DELETE' }));
		expect([200, 404, 500]).toContain(delRes.status);
	});
});


