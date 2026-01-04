import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// YouTube credentials table - stores user's YouTube API credentials
export const youtubeCredentials = pgTable("youtube_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertYoutubeCredentialsSchema = createInsertSchema(youtubeCredentials).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertYoutubeCredentials = z.infer<typeof insertYoutubeCredentialsSchema>;
export type YoutubeCredentials = typeof youtubeCredentials.$inferSelect;

// YouTube channels table - stores connected YouTube channels
export const youtubeChannels = pgTable("youtube_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").notNull(),
  channelTitle: varchar("channel_title").notNull(),
  channelDescription: text("channel_description"),
  thumbnailUrl: varchar("thumbnail_url"),
  subscriberCount: varchar("subscriber_count"),
  videoCount: varchar("video_count"),
  isConnected: boolean("is_connected").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserChannel: index("unique_user_channel_idx").on(table.userId, table.channelId),
}));

export const insertYoutubeChannelSchema = createInsertSchema(youtubeChannels).omit({ id: true, createdAt: true });
export type InsertYoutubeChannel = z.infer<typeof insertYoutubeChannelSchema>;
export type YoutubeChannel = typeof youtubeChannels.$inferSelect;

// YouTube OAuth tokens table - each channel has its own token
export const youtubeTokens = pgTable("youtube_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => youtubeChannels.id, { onDelete: "cascade" }).unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
});

export const insertYoutubeTokenSchema = createInsertSchema(youtubeTokens).omit({ id: true });
export type InsertYoutubeToken = z.infer<typeof insertYoutubeTokenSchema>;
export type YoutubeToken = typeof youtubeTokens.$inferSelect;

// Videos table
export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  filePath: varchar("file_path"),
  youtubeVideoId: varchar("youtube_video_id"),
  thumbnailUrl: varchar("thumbnail_url"),
  fileSize: varchar("file_size"),
  duration: varchar("duration"),
  viewCount: varchar("view_count"),
  status: varchar("status").notNull().default("draft"),
  tags: text("tags").array(),
  publishedChannels: text("published_channels").array(),
  premiereScheduledTime: timestamp("premiere_scheduled_time"),
  premiereChannelId: varchar("premiere_channel_id"),
  youtubeBroadcastId: varchar("youtube_broadcast_id"),
  premiereStatus: varchar("premiere_status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Live streams table
export const liveStreams = pgTable("live_streams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").notNull().references(() => youtubeChannels.id, { onDelete: "cascade" }),
  videoId: varchar("video_id").references(() => videos.id, { onDelete: "set null" }),
  title: varchar("title").notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url"),
  tags: text("tags").array(),
  streamType: varchar("stream_type").notNull().default("rtmp"),
  scheduledStartTime: timestamp("scheduled_start_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  youtubeBroadcastId: varchar("youtube_broadcast_id"),
  youtubeStreamId: varchar("youtube_stream_id"),
  streamKey: text("stream_key"),
  streamUrl: text("stream_url"),
  rtmpUrl: text("rtmp_url"),
  status: varchar("status").notNull().default("created"),
  privacyStatus: varchar("privacy_status").notNull().default("private"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLiveStreamSchema = createInsertSchema(liveStreams).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLiveStream = z.infer<typeof insertLiveStreamSchema>;
export type LiveStream = typeof liveStreams.$inferSelect;
