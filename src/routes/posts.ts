import { Hono } from "hono";
import { posts, likes, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';

// Helper: ポストを親情報と一緒に取得
async function getPostWithParent(db: any, postId: string) {
  // postsとusersをJOINして取得
  const result = await db
    .select({
      post: posts,
      author: {
        id: users.id,
        name: users.name,
        handle: users.handle,
        email: users.email,
        photoUrl: users.photoUrl,
        bannerUrl: users.bannerUrl,
        bio: users.bio,
        location: users.location,
        website: users.website,
      }
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId))
    .get();
  
  if (!result) return null;

  const post = {
    ...result.post,
    author: result.author
  };

  // 親ポストがある場合は取得
  let parent = null;
  if (post.parentId) {
    parent = await db.select().from(posts).where(eq(posts.id, post.parentId)).get();
  }

  // ルートポストがある場合は取得
  let root = null;
  if (post.rootId && post.rootId !== post.parentId) {
    root = await db.select().from(posts).where(eq(posts.id, post.rootId)).get();
  }

  // 参照ポストがある場合は取得（リポスト等）
  let reference = null;
  if (post.referencePostId) {
    reference = await db.select().from(posts).where(eq(posts.id, post.referencePostId)).get();
  }

  return {
    ...post,
    parent,
    root,
    reference,
  };
}

// Helper: 複数ポストを親情報と一緒に取得
async function getPostsWithParents(db: any, postList: any[]) {
  return Promise.all(
    postList.map(async (post) => {
      let parent = null;
      let root = null;
      let reference = null;

      if (post.parentId) {
        parent = await db.select().from(posts).where(eq(posts.id, post.parentId)).get();
      }

      if (post.rootId && post.rootId !== post.parentId) {
        root = await db.select().from(posts).where(eq(posts.id, post.rootId)).get();
      }

      if (post.referencePostId) {
        reference = await db.select().from(posts).where(eq(posts.id, post.referencePostId)).get();
      }

      return {
        ...post,
        parent,
        root,
        reference,
      };
    })
  );
}

export const postsRouter = new Hono<{ Bindings: CloudflareBindings }>();

// GET /posts - リスト取得（認証不要）
postsRouter.get("/", async (c) => {
  try {
    const db = getDb(c);
    
    // postsとusersをJOINして取得
    const result = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          handle: users.handle,
          email: users.email,
          photoUrl: users.photoUrl,
          bannerUrl: users.bannerUrl,
          bio: users.bio,
          location: users.location,
          website: users.website,
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .all();
    
    // 結果を整形
    const postsWithAuthors = result.map(row => ({
      ...row.post,
      author: row.author
    }));
    
    const postsWithParents = await getPostsWithParents(db, postsWithAuthors);
    return c.json(postsWithParents, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POSTS_LIST_ERROR'), 500);
  }
});

// POST /posts - ポスト作成（認証必須）
postsRouter.post("/", requireAuth, async (c) => {
  try {
    const auth = c.env.auth as any;
    const body = await c.req.json();
    
    // Validation
    const validation = validateRequired(body, ['authorId']);
    if (!validation.valid) {
      return c.json(
        createErrorResponse(
          `Missing required fields: ${validation.missing?.join(', ')}`,
          'VALIDATION_ERROR',
          { missing: validation.missing }
        ),
        400
      );
    }

    // 自分のポストのみ作成可能
    if (auth.user.userId !== body.authorId) {
      return c.json(
        createErrorResponse('Forbidden: can only create your own posts', 'FORBIDDEN'),
        403
      );
    }

    const db = getDb(c);
    const result = await db.insert(posts).values({
      id: crypto.randomUUID(),
      authorId: body.authorId,
      communityId: body.communityId || null,
      content: body.content || null,
      media: body.media ? JSON.stringify(body.media) : null,
      hashtags: body.hashtags ? JSON.stringify(body.hashtags) : null,
      type: body.type || 'text',
      visibility: body.visibility || 'public',
    }).returning().get();
    
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_CREATE_ERROR'), 400);
  }
});

postsRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const result = await getPostWithParent(db, id);
    
    if (!result) {
      return c.json(
        createErrorResponse('投稿が見つかりません', 'POST_NOT_FOUND'),
        404
      );
    }
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_GET_ERROR'), 500);
  }
});

postsRouter.put("/:id", requireAuth, async (c) => {
  try {
    const auth = c.env.auth as any;
    const id = c.req.param('id');
    const body = await c.req.json();
    const db = getDb(c);

    // ポストの所有者を確認
    const post = await db.select().from(posts).where(eq(posts.id, id)).get();
    if (!post) {
      return c.json(
        createErrorResponse('投稿が見つかりません', 'POST_NOT_FOUND'),
        404
      );
    }

    // 自分のポストか管理者のみ編集可能
    if (auth.user.userId !== post.authorId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('Forbidden: can only edit your own posts', 'FORBIDDEN'),
        403
      );
    }

    const result = await db.update(posts)
      .set({
        content: body.content,
        media: body.media ? JSON.stringify(body.media) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, id))
      .returning()
      .get();
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_UPDATE_ERROR'), 400);
  }
});

// DELETE /posts/:id - ポスト削除（認証必須）
postsRouter.delete("/:id", requireAuth, async (c) => {
  try {
    const auth = c.env.auth as any;
    const id = c.req.param('id');
    const db = getDb(c);

    // ポストの所有者を確認
    const post = await db.select().from(posts).where(eq(posts.id, id)).get();
    if (!post) {
      return c.json(
        createErrorResponse('投稿が見つかりません', 'POST_NOT_FOUND'),
        404
      );
    }

    // 自分のポストか管理者のみ削除可能
    if (auth.user.userId !== post.authorId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('Forbidden: can only delete your own posts', 'FORBIDDEN'),
        403
      );
    }
    
    await db.delete(posts).where(eq(posts.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_DELETE_ERROR'), 400);
  }
});

postsRouter.get("/:id/likes", async (c) => {
  try {
    const postId = c.req.param('id');
    const db = getDb(c);
    const result = await db.select({ 
      id: users.id, 
      name: users.name, 
      handle: users.handle,
      photoUrl: users.photoUrl
    })
      .from(likes)
      .innerJoin(users, eq(likes.userId, users.id))
      .where(eq(likes.postId, postId))
      .all();
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_LIKES_ERROR'), 500);
  }
});
