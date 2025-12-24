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

const app = new Hono<{ Bindings: CloudflareBindings }>();

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
