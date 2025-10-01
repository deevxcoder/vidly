import { 
  type User, 
  type UpsertUser, 
  users,
  type YoutubeCredentials,
  type InsertYoutubeCredentials,
  youtubeCredentials,
  type YoutubeToken,
  type InsertYoutubeToken,
  youtubeTokens,
  type YoutubeChannel,
  type InsertYoutubeChannel,
  youtubeChannels,
  type Video,
  type InsertVideo,
  videos,
  type LiveStream,
  type InsertLiveStream,
  liveStreams
} from "@shared/schema";
import { getDb } from "./db";
import { eq, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // YouTube credentials operations
  getYoutubeCredentials(userId: string): Promise<YoutubeCredentials | undefined>;
  upsertYoutubeCredentials(credentials: InsertYoutubeCredentials): Promise<YoutubeCredentials>;
  deleteYoutubeCredentials(userId: string): Promise<void>;

  // YouTube token operations
  getYoutubeTokenByChannelId(channelId: string): Promise<YoutubeToken | undefined>;
  createYoutubeToken(token: InsertYoutubeToken): Promise<YoutubeToken>;
  updateYoutubeToken(channelId: string, token: Partial<InsertYoutubeToken>): Promise<YoutubeToken | undefined>;
  deleteYoutubeToken(channelId: string): Promise<void>;

  // YouTube channel operations
  getYoutubeChannels(userId: string): Promise<YoutubeChannel[]>;
  getYoutubeChannel(userId: string, channelId: string): Promise<YoutubeChannel | undefined>;
  createYoutubeChannel(channel: InsertYoutubeChannel): Promise<YoutubeChannel>;
  updateYoutubeChannel(id: string, channel: Partial<InsertYoutubeChannel>): Promise<YoutubeChannel | undefined>;
  deleteYoutubeChannel(id: string): Promise<void>;

  // Video operations
  getVideos(userId: string): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: string): Promise<void>;

  // Live stream operations
  getLiveStreams(userId: string): Promise<LiveStream[]>;
  getLiveStreamsByChannel(channelId: string): Promise<LiveStream[]>;
  getLiveStream(id: string): Promise<LiveStream | undefined>;
  createLiveStream(stream: InsertLiveStream): Promise<LiveStream>;
  updateLiveStream(id: string, stream: Partial<InsertLiveStream>): Promise<LiveStream | undefined>;
  deleteLiveStream(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const db = await getDb();
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const db = await getDb();
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // YouTube credentials operations
  async getYoutubeCredentials(userId: string): Promise<YoutubeCredentials | undefined> {
    const db = await getDb();
    const [credentials] = await db.select().from(youtubeCredentials).where(eq(youtubeCredentials.userId, userId));
    return credentials;
  }

  async upsertYoutubeCredentials(credentialsData: InsertYoutubeCredentials): Promise<YoutubeCredentials> {
    const db = await getDb();
    const [credentials] = await db
      .insert(youtubeCredentials)
      .values(credentialsData)
      .onConflictDoUpdate({
        target: youtubeCredentials.userId,
        set: {
          ...credentialsData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return credentials;
  }

  async deleteYoutubeCredentials(userId: string): Promise<void> {
    const db = await getDb();
    await db.delete(youtubeCredentials).where(eq(youtubeCredentials.userId, userId));
  }

  // YouTube token operations
  async getYoutubeTokenByChannelId(channelId: string): Promise<YoutubeToken | undefined> {
    const db = await getDb();
    const [token] = await db.select().from(youtubeTokens).where(eq(youtubeTokens.channelId, channelId));
    return token;
  }

  async createYoutubeToken(tokenData: InsertYoutubeToken): Promise<YoutubeToken> {
    const db = await getDb();
    const [token] = await db
      .insert(youtubeTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async updateYoutubeToken(channelId: string, tokenData: Partial<InsertYoutubeToken>): Promise<YoutubeToken | undefined> {
    const db = await getDb();
    const [token] = await db
      .update(youtubeTokens)
      .set(tokenData)
      .where(eq(youtubeTokens.channelId, channelId))
      .returning();
    return token;
  }

  async deleteYoutubeToken(channelId: string): Promise<void> {
    const db = await getDb();
    await db.delete(youtubeTokens).where(eq(youtubeTokens.channelId, channelId));
  }

  // YouTube channel operations
  async getYoutubeChannels(userId: string): Promise<YoutubeChannel[]> {
    const db = await getDb();
    return await db.select().from(youtubeChannels).where(eq(youtubeChannels.userId, userId));
  }

  async getYoutubeChannel(userId: string, channelId: string): Promise<YoutubeChannel | undefined> {
    const db = await getDb();
    const [channel] = await db
      .select()
      .from(youtubeChannels)
      .where(and(eq(youtubeChannels.userId, userId), eq(youtubeChannels.id, channelId)));
    return channel;
  }

  async createYoutubeChannel(channelData: InsertYoutubeChannel): Promise<YoutubeChannel> {
    const db = await getDb();
    const [channel] = await db
      .insert(youtubeChannels)
      .values(channelData)
      .returning();
    return channel;
  }

  async updateYoutubeChannel(id: string, channelData: Partial<InsertYoutubeChannel>): Promise<YoutubeChannel | undefined> {
    const db = await getDb();
    const [channel] = await db
      .update(youtubeChannels)
      .set(channelData)
      .where(eq(youtubeChannels.id, id))
      .returning();
    return channel;
  }

  async deleteYoutubeChannel(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(youtubeChannels).where(eq(youtubeChannels.id, id));
  }

  // Video operations
  async getVideos(userId: string): Promise<Video[]> {
    const db = await getDb();
    return await db.select().from(videos).where(eq(videos.userId, userId));
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const db = await getDb();
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(videoData: InsertVideo): Promise<Video> {
    const db = await getDb();
    const [video] = await db
      .insert(videos)
      .values(videoData)
      .returning();
    return video;
  }

  async updateVideo(id: string, videoData: Partial<InsertVideo>): Promise<Video | undefined> {
    const db = await getDb();
    const [video] = await db
      .update(videos)
      .set({ ...videoData, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return video;
  }

  async deleteVideo(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(videos).where(eq(videos.id, id));
  }

  // Live stream operations
  async getLiveStreams(userId: string): Promise<LiveStream[]> {
    const db = await getDb();
    return await db.select().from(liveStreams).where(eq(liveStreams.userId, userId));
  }

  async getLiveStreamsByChannel(channelId: string): Promise<LiveStream[]> {
    const db = await getDb();
    return await db.select().from(liveStreams).where(eq(liveStreams.channelId, channelId));
  }

  async getLiveStream(id: string): Promise<LiveStream | undefined> {
    const db = await getDb();
    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, id));
    return stream;
  }

  async createLiveStream(streamData: InsertLiveStream): Promise<LiveStream> {
    const db = await getDb();
    const [stream] = await db
      .insert(liveStreams)
      .values(streamData)
      .returning();
    return stream;
  }

  async updateLiveStream(id: string, streamData: Partial<InsertLiveStream>): Promise<LiveStream | undefined> {
    const db = await getDb();
    const [stream] = await db
      .update(liveStreams)
      .set({ ...streamData, updatedAt: new Date() })
      .where(eq(liveStreams.id, id))
      .returning();
    return stream;
  }

  async deleteLiveStream(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(liveStreams).where(eq(liveStreams.id, id));
  }
}

export const storage = new DatabaseStorage();
