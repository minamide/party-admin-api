/**
 * 検索ルート - FTS5を使用した全文検索
 */

import { Hono } from 'hono';
import { Context } from 'hono';
import { getDb } from '../utils/db';
import { createErrorResponse } from '../utils/errors';
import { posts, users } from '../db/schema';
import { sql, eq, ilike, or } from 'drizzle-orm';

export const searchRouter = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * GET /search/posts?q=query
 * ツイート全文検索（FTS5使用）
 */
searchRouter.get('/posts', async (c: Context) => {
  try {
    const query = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    if (!query.trim()) {
      return c.json({
        success: true,
        data: {
          posts: [],
          total: 0,
          limit,
          offset,
        },
      });
    }

    // D1 インスタンスから Drizzle 取得
    const db = getDb(c.env.DB);

    // FTS5 を使用したツイート検索
    try {
      const searchResults = await db.run(
        sql`
          SELECT 
            p.id,
            p.content,
            p.author_id,
            p.created_at,
            p.updated_at,
            p.media,
            u.name,
            u.handle,
            u.photo_url,
            u.banner_url,
            u.bio,
            u.location,
            u.website
          FROM posts_fts
          JOIN posts p ON posts_fts.id = p.id
          LEFT JOIN users u ON p.author_id = u.id
          WHERE posts_fts MATCH ${query}
          ORDER BY rank
          LIMIT ${limit}
          OFFSET ${offset}
        `
      );

      // 総件数を取得
      const countResult = await db.run(
        sql`
          SELECT COUNT(*) as count
          FROM posts_fts
          WHERE posts_fts MATCH ${query}
        `
      );

      const total = (countResult.results as any[])[0]?.count || 0;

      // データを整形
      const postsData = (searchResults.results as any[]).map((row: any) => ({
        id: row.id,
        content: row.content,
        authorId: row.author_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        media: row.media ? JSON.parse(row.media) : [],
        author: {
          id: row.author_id,
          name: row.name,
          handle: row.handle,
          photoUrl: row.photo_url,
          bannerUrl: row.banner_url,
          bio: row.bio,
          location: row.location,
          website: row.website,
        },
      }));

      return c.json({
        success: true,
        data: {
          posts: postsData,
          total,
          limit,
          offset,
        },
      });
    } catch (dbError: any) {
      console.error('FTS5 query error:', dbError);
      
      // FTS5 エラー時のフォールバック: 通常の LIKE クエリで検索
      console.log('Falling back to LIKE query');
      const searchPattern = `%${query}%`;
      
      const searchResults = await db
        .select({
          id: posts.id,
          content: posts.content,
          authorId: posts.authorId,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          media: posts.media,
          name: users.name,
          handle: users.handle,
          photoUrl: users.photoUrl,
          bannerUrl: users.bannerUrl,
          bio: users.bio,
          location: users.location,
          website: users.website,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(ilike(posts.content, searchPattern))
        .limit(limit)
        .offset(offset);

      const countResult = await db.run(
        sql`SELECT COUNT(*) as count FROM posts WHERE content ILIKE ${searchPattern}`
      );

      const total = (countResult.results as any[])[0]?.count || 0;

      const postsData = searchResults.map((row: any) => ({
        id: row.id,
        content: row.content,
        authorId: row.authorId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        media: row.media ? JSON.parse(row.media) : [],
        author: {
          id: row.authorId,
          name: row.name,
          handle: row.handle,
          photoUrl: row.photoUrl,
          bannerUrl: row.bannerUrl,
          bio: row.bio,
          location: row.location,
          website: row.website,
        },
      }));

      return c.json({
        success: true,
        data: {
          posts: postsData,
          total,
          limit,
          offset,
        },
      });
    }
  } catch (error: any) {
    console.error('Search posts error:', error);
    return c.json(
      createErrorResponse(
        error?.message || '検索に失敗しました',
        'SEARCH_ERROR'
      ),
      500
    );
  }
});

/**
 * GET /search/users?q=query
 * ユーザー検索（名前またはハンドル）
 */
searchRouter.get('/users', async (c: Context) => {
  try {
    const query = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    if (!query.trim()) {
      return c.json({
        success: true,
        data: {
          users: [],
          total: 0,
          limit,
          offset,
        },
      });
    }

    // D1 インスタンスから Drizzle 取得
    const db = getDb(c.env.DB);
    const searchTerm = `%${query}%`;

    // ユーザー検索（名前またはハンドル）
    const searchResults = await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.name, searchTerm),
          ilike(users.handle, searchTerm)
        )
      )
      .limit(limit)
      .offset(offset);

    // 総件数を取得
    const countResult = await db.run(
      sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE name ILIKE ${searchTerm} OR handle ILIKE ${searchTerm}
      `
    );

    const total = (countResult.results as any[])[0]?.count || 0;

    // データを整形
    const usersData = searchResults.map((user: any) => ({
      id: user.id,
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      location: user.location,
      website: user.website,
      photoUrl: user.photoUrl,
      bannerUrl: user.bannerUrl,
      displayName: user.name,
    }));

    return c.json({
      success: true,
      data: {
        users: usersData,
        total,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('Search users error:', error);
    return c.json(
      createErrorResponse(
        error?.message || '検索に失敗しました',
        'SEARCH_ERROR'
      ),
      500
    );
  }
});
