import { Hono } from "hono";
import { authRouter } from './routes/auth';
import { oauthRouter } from './routes/oauth';
import { usersRouter } from './routes/users';
import { postsRouter } from './routes/posts';
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
import { authMiddleware } from './middleware/auth';
import { OAuthProviderManager } from './auth/providers/manager';
import { GoogleOAuthProvider } from './auth/providers/google';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Global OAuth manager instance (initialized on first request)
let globalOAuthManager: OAuthProviderManager | null = null;

// ==================== OAUTH INITIALIZATION ====================
// Initialize OAuth providers on first request
app.use('*', async (c, next) => {
  // Initialize OAuth manager only once
  if (!globalOAuthManager) {
    globalOAuthManager = new OAuthProviderManager();
    
    // Add Google provider if configured
    if (c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET) {
      const googleProvider = new GoogleOAuthProvider({
        clientId: c.env.GOOGLE_CLIENT_ID,
        clientSecret: c.env.GOOGLE_CLIENT_SECRET,
        redirectUri: c.env.GOOGLE_REDIRECT_URI || `${new URL(c.req.url).origin}/oauth/callback/google`,
      });
      console.log('Google provider created with:', {
        clientId: c.env.GOOGLE_CLIENT_ID,
        redirectUri: c.env.GOOGLE_REDIRECT_URI,
      });
      globalOAuthManager.registerProvider('google', googleProvider);
      console.log('Provider registered, available:', globalOAuthManager.isProviderAvailable('google'));
    }
  }
  
  // Store manager in context for use in routes
  c.set('oauthManager', globalOAuthManager);
  
  await next();
});

// ==================== AUTHENTICATION MIDDLEWARE ====================
// Apply JWT authentication to all routes
app.use('*', authMiddleware);

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
  ['health', healthRouter],
];

// Register all routes
routes.forEach(([path, router]) => {
  app.route(`/${path}`, router);
});

export default app;
