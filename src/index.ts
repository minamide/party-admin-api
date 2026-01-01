import { Hono } from "hono";
import { authRouter } from './routes/auth';
import { oauthRouter } from './routes/oauth';
import { usersRouter } from './routes/users';
import { postsRouter } from './routes/posts';
import { searchRouter } from './routes/search';
import { communitiesRouter } from './routes/communities';
import { listsRouter } from './routes/lists';
import { conversationsRouter } from './routes/conversations';
import { followsRouter } from './routes/follows';
import { likesRouter } from './routes/likes';
import { bookmarksRouter } from './routes/bookmarks';
import { repostsRouter } from './routes/reposts';
import { membersRouter } from './routes/members';
import { notificationsRouter } from './routes/notifications';
import { reportsRouter } from './routes/reports';
import { interactionsRouter } from './routes/interactions';
import { eventsRouter } from './routes/events';
import { draftsRouter } from './routes/drafts';
import { attachmentsRouter } from './routes/attachments';
import { hashtagsRouter } from './routes/hashtags';
import { settingsRouter } from './routes/settings';
import { healthRouter } from './routes/health';
import { activityPlacesRouter } from './routes/activity_places';
import { activityGroupsRouter } from './routes/activity_groups';
import { prefecturesRouter } from './routes/prefectures';
import { statisticsRouter } from './routes/statistics';
import { censusMeshRouter } from './routes/census_mesh';
import { debugRouter } from './routes/debug_db';
import { r2Router } from './routes/r2';
import { authMiddleware } from './middleware/auth';
import { OAuthProviderManager } from './auth/providers/manager';
import { GoogleOAuthProvider } from './auth/providers/google';
import { cors } from 'hono/cors';

type Variables = {
  oauthManager: OAuthProviderManager;
};

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

// Global OAuth manager instance
const globalOAuthManager = new OAuthProviderManager();

// ==================== GLOBAL MIDDLEWARE ====================
// 0. CORS (allow browser requests from frontend)
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 1. JWT Authentication Middleware (applies to all routes, setting c.env.auth)
app.use('*', authMiddleware);

// 2. OAuth provider registration (for /oauth/* routes only)
app.use('/oauth/*', async (c, next) => {
  // Register Google provider if not already registered
  if (!globalOAuthManager.isProviderAvailable('google') && c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET) {
    const googleProvider = new GoogleOAuthProvider({
      clientId: c.env.GOOGLE_CLIENT_ID,
      clientSecret: c.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${new URL(c.req.url).origin}/oauth/callback/google`,
    });
    globalOAuthManager.registerProvider('google', googleProvider);
    console.log('OAuth: Google provider registered');
  }

  // Store manager in context for use in routes
  c.set('oauthManager', globalOAuthManager);

  await next();
});



// ==================== FILE-BASED ROUTING ====================
// Routes are automatically registered based on imported route modules
// Each route file exports a router with the same pattern

type RouteEntry = [string, Hono<{ Bindings: CloudflareBindings }>];

// Centralized route registry (file-pattern style)
const routes: RouteEntry[] = [
  ['auth', authRouter],
  ['oauth', oauthRouter],
  ['users', usersRouter],
  ['posts', postsRouter],
  ['search', searchRouter],
  ['communities', communitiesRouter],
  ['lists', listsRouter],
  ['conversations', conversationsRouter],
  ['follows', followsRouter],
  ['likes', likesRouter],
  ['bookmarks', bookmarksRouter],
  ['reposts', repostsRouter],
  ['members', membersRouter],
  ['notifications', notificationsRouter],
  ['reports', reportsRouter],
  ['interactions', interactionsRouter],
  ['events', eventsRouter],
  ['drafts', draftsRouter],
  ['attachments', attachmentsRouter],
  ['hashtags', hashtagsRouter],
  ['settings', settingsRouter],
  ['activity_places', activityPlacesRouter],
  ['activity-groups', activityGroupsRouter],
  ['prefectures', prefecturesRouter],
  ['volunteer/locations', activityPlacesRouter],
  ['census-mesh', censusMeshRouter],
  ['r2', r2Router],
  ['debug', debugRouter],
  ['health', healthRouter],
  ['statistics', statisticsRouter],
];

// Register all routes
routes.forEach(([path, router]) => {
  app.route(`/${path}`, router);
});

export default app;
