import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account: text("account").notNull(),
  accountNormalized: text("account_normalized").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull().default(100000),
  nickname: text("nickname").notNull(),
  bio: text("bio").notNull().default(""),
  avatarKey: text("avatar_key"),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});

export const authAttempts = sqliteTable("auth_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attemptKey: text("attempt_key").notNull(),
  action: text("action", { enum: ["login", "register"] }).notNull(),
  succeeded: integer("succeeded", { mode: "boolean" }).notNull().default(false),
  attemptedAt: text("attempted_at").notNull(),
});

export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["rss", "wechat", "x"] }).notNull().default("rss"),
  category: text("category", { enum: ["ai", "investment", "gaming", "technology", "business", "product"] }),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastSyncedAt: text("last_synced_at"),
  lastError: text("last_error"),
  avatarUrl: text("avatar_url"),
  contributorUserId: integer("contributor_user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
});

export const userSourceFollows = sqliteTable("user_source_follows", {
  userId: integer("user_id").notNull().references(() => users.id),
  sourceId: integer("source_id").notNull().references(() => sources.id),
  createdAt: text("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.sourceId] })]);

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: integer("source_id").references(() => sources.id),
  kind: text("kind", { enum: ["rss", "link"] }).notNull(),
  title: text("title").notNull(),
  originalExcerpt: text("original_excerpt"),
  contentMarkdown: text("content_markdown"),
  author: text("author"),
  translatedTitle: text("translated_title"),
  translatedExcerpt: text("translated_excerpt"),
  url: text("url").notNull().unique(),
  publishedAt: text("published_at"),
  language: text("language"),
  topic: text("topic"),
  status: text("status", { enum: ["pending", "ready", "needs_ai"] }).notNull().default("pending"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  isSaved: integer("is_saved", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const syncRuns = sqliteTable("sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: integer("source_id").notNull().references(() => sources.id),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  itemCount: integer("item_count").notNull().default(0),
  error: text("error"),
});

export const ideas = sqliteTable("ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day").notNull().unique(),
  headline: text("headline").notNull(),
  angle: text("angle").notNull(),
  sourceItemIds: text("source_item_ids").notNull(),
  createdAt: text("created_at").notNull(),
});

export const subscriptionRequests = sqliteTable("subscription_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  query: text("query").notNull().unique(),
  kind: text("kind", { enum: ["unknown", "wechat"] }).notNull().default("unknown"),
  category: text("category", { enum: ["ai", "investment", "gaming", "technology", "business", "product"] }),
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull().default("pending"),
  stage: text("stage", { enum: ["queued", "reading", "importing", "history", "retrying", "completed"] }).notNull().default("queued"),
  resultName: text("result_name"),
  itemCount: integer("item_count").notNull().default(0),
  requesterUserId: integer("requester_user_id").references(() => users.id),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const userItemStates = sqliteTable("user_item_states", {
  userId: integer("user_id").notNull().references(() => users.id),
  itemId: integer("item_id").notNull().references(() => items.id),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  readAt: text("read_at"),
  isSaved: integer("is_saved", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.itemId] })]);

export const dailyReadingActivity = sqliteTable("daily_reading_activity", {
  userId: integer("user_id").notNull().references(() => users.id),
  itemId: integer("item_id").notNull().references(() => items.id),
  day: text("day").notNull(),
  activeSeconds: integer("active_seconds").notNull().default(0),
  lastHeartbeatAt: text("last_heartbeat_at").notNull(),
  countedAt: text("counted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.itemId, table.day] })]);

export const annotations = sqliteTable("annotations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull().references(() => items.id),
  userId: integer("user_id").notNull().references(() => users.id),
  quote: text("quote").notNull(),
  body: text("body").notNull(),
  blockIndex: integer("block_index").notNull(),
  startOffset: integer("start_offset").notNull(),
  endOffset: integer("end_offset").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const annotationReplies = sqliteTable("annotation_replies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  annotationId: integer("annotation_id").notNull().references(() => annotations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  replyToUserId: integer("reply_to_user_id").references(() => users.id),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const profileLikes = sqliteTable("profile_likes", {
  userId: integer("user_id").notNull().references(() => users.id),
  profileUserId: integer("profile_user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.profileUserId] })]);

export const profileMessages = sqliteTable("profile_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileUserId: integer("profile_user_id").notNull().references(() => users.id),
  authorUserId: integer("author_user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  actorUserId: integer("actor_user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["annotation_reply", "profile_message", "profile_like"] }).notNull(),
  annotationId: integer("annotation_id").references(() => annotations.id),
  profileMessageId: integer("profile_message_id").references(() => profileMessages.id),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
