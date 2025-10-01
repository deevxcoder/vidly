import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword, comparePassword } from "./auth";
import { z } from "zod";
import { upload } from "./upload";
import fs from "fs/promises";
import crypto from "crypto";
import express from "express";
import path from "path";

// Helper function to get full video file path
function getVideoFilePath(filePathOrFilename: string): string {
  // If already an absolute path, return as is
  if (path.isAbsolute(filePathOrFilename)) {
    return filePathOrFilename;
  }
  // Otherwise, join with uploads directory
  return path.join(process.cwd(), 'uploads', filePathOrFilename);
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export function registerRoutes(app: Express): Server {
  // Setup authentication middleware
  setupAuth(app);
  
  // Initialize streaming service with callback to update DB when streams end
  (async () => {
    const { streamingService } = await import('./streaming');
    streamingService.setStreamEndCallback(async (streamId, code) => {
      try {
        await storage.updateLiveStream(streamId, {
          status: 'complete',
          actualEndTime: new Date(),
        });
        console.log(`[DB] Updated stream ${streamId} status to complete`);
      } catch (error) {
        console.error(`[DB] Failed to update stream ${streamId} status:`, error);
      }
    });
  })();
  
  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Signup route
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password } = signupSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
      });

      // Set session
      (req.session as any).userId = user.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // YouTube credentials routes
  app.get('/api/youtube/credentials', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const credentials = await storage.getYoutubeCredentials(userId);
      
      if (!credentials) {
        return res.json({ hasCredentials: false });
      }
      
      // Return masked credentials for security
      res.json({
        hasCredentials: true,
        clientId: credentials.clientId,
        clientSecretMasked: '••••••••',
        updatedAt: credentials.updatedAt,
      });
    } catch (error) {
      console.error("Error fetching credentials:", error);
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  const youtubeCredentialsSchema = z.object({
    clientId: z.string().min(1, "Client ID is required"),
    clientSecret: z.string().min(1, "Client Secret is required"),
  });

  app.post('/api/youtube/credentials', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const validated = youtubeCredentialsSchema.parse(req.body);
      
      const credentials = await storage.upsertYoutubeCredentials({
        userId,
        clientId: validated.clientId,
        clientSecret: validated.clientSecret,
      });
      
      res.json({
        message: "Credentials saved successfully",
        hasCredentials: true,
        clientId: credentials.clientId,
        clientSecretMasked: '••••••••',
        updatedAt: credentials.updatedAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error saving credentials:", error);
      res.status(500).json({ message: "Failed to save credentials" });
    }
  });

  app.delete('/api/youtube/credentials', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.deleteYoutubeCredentials(userId);
      res.json({ message: "Credentials deleted successfully" });
    } catch (error) {
      console.error("Error deleting credentials:", error);
      res.status(500).json({ message: "Failed to delete credentials" });
    }
  });

  // YouTube OAuth routes
  app.get('/api/youtube/oauth/url', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
      // Get user's YouTube credentials
      const credentials = await storage.getYoutubeCredentials(userId);
      if (!credentials) {
        return res.status(400).json({ 
          message: "Please configure your YouTube API credentials in Settings first" 
        });
      }
      
      const { getOAuth2Client, getAuthUrl } = await import('./youtube');
      
      // Generate cryptographically random state
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in session for validation
      (req.session as any).oauthState = state;
      
      // Create OAuth client with user's credentials
      const oauth2Client = getOAuth2Client(
        credentials.clientId,
        credentials.clientSecret
      );
      
      // Generate auth URL with random state
      const authUrl = getAuthUrl(oauth2Client, state);
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating OAuth URL:", error);
      res.status(500).json({ message: "Failed to generate OAuth URL" });
    }
  });

  app.get('/api/youtube/oauth/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.redirect('/?error=oauth_failed');
      }
      
      // Validate state to prevent CSRF
      const sessionState = (req.session as any).oauthState;
      if (!sessionState || sessionState !== state) {
        return res.redirect('/?error=invalid_state');
      }
      
      // Get userId from session
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.redirect('/login?error=not_authenticated');
      }
      
      // Get user's YouTube credentials
      const credentials = await storage.getYoutubeCredentials(userId);
      if (!credentials) {
        return res.redirect('/settings?error=missing_credentials');
      }
      
      // Clear used state
      delete (req.session as any).oauthState;
      
      const { getOAuth2Client, getTokenFromCode, getUserChannels } = await import('./youtube');
      
      // Exchange code for tokens using user's credentials
      const oauth2Client = getOAuth2Client(
        credentials.clientId,
        credentials.clientSecret
      );
      const tokens = await getTokenFromCode(oauth2Client, code as string);
      
      // Get user's YouTube channels
      const channels = await getUserChannels(tokens.access_token!);
      
      // Save channels and tokens to database
      for (const channelData of channels) {
        const channel = await storage.createYoutubeChannel({
          userId,
          channelId: channelData.id!,
          channelTitle: channelData.snippet?.title || 'Untitled Channel',
          channelDescription: channelData.snippet?.description,
          thumbnailUrl: channelData.snippet?.thumbnails?.default?.url,
          subscriberCount: channelData.statistics?.subscriberCount,
          videoCount: channelData.statistics?.videoCount,
          isConnected: true,
        });
        
        // Save token for this channel
        await storage.createYoutubeToken({
          channelId: channel.id,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scope: tokens.scope,
        });
      }
      
      res.redirect('/channels?success=true');
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect('/?error=oauth_failed');
    }
  });

  // Get user's YouTube channels
  app.get('/api/youtube/channels', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const channels = await storage.getYoutubeChannels(userId);
      res.json(channels);
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  // Disconnect a YouTube channel
  app.delete('/api/youtube/channels/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      
      // Verify channel ownership
      const userChannels = await storage.getYoutubeChannels(userId);
      const channel = userChannels.find(c => c.id === id);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      // Get token to revoke
      const token = await storage.getYoutubeTokenByChannelId(id);
      
      // Revoke token with Google
      if (token) {
        try {
          // Get user's YouTube credentials for token revocation
          const credentials = await storage.getYoutubeCredentials(userId);
          if (credentials) {
            const { getOAuth2Client } = await import('./youtube');
            const oauth2Client = getOAuth2Client(
              credentials.clientId,
              credentials.clientSecret
            );
            // Revoke refresh token if available (revokes all associated access tokens)
            if (token.refreshToken) {
              await oauth2Client.revokeToken(token.refreshToken);
            } else {
              await oauth2Client.revokeToken(token.accessToken);
            }
          }
        } catch (error) {
          console.error("Error revoking token:", error);
        }
      }
      
      // Delete channel (cascade will delete token)
      await storage.deleteYoutubeChannel(id);
      res.json({ message: "Channel disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting channel:", error);
      res.status(500).json({ message: "Failed to disconnect channel" });
    }
  });

  // Get all videos
  app.get('/api/videos', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const videos = await storage.getVideos(userId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  const uploadVideoSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(5000).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  });

  // Upload video file
  app.post('/api/videos/upload', isAuthenticated, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files || !files.video || !files.video[0]) {
        return res.status(400).json({ message: "No video file provided" });
      }
      
      const userId = (req.session as any).userId;
      
      let parsedTags: string[] = [];
      if (req.body.tags) {
        try {
          parsedTags = JSON.parse(req.body.tags);
        } catch (error) {
          return res.status(400).json({ message: "Invalid tags format" });
        }
      }
      
      const validated = uploadVideoSchema.parse({
        title: req.body.title || files.video[0].originalname,
        description: req.body.description,
        tags: parsedTags,
      });
      
      const thumbnailPath = files.thumbnail && files.thumbnail[0] ? `/uploads/${files.thumbnail[0].filename}` : undefined;
      
      // Calculate file size in MB
      const fileSizeInBytes = files.video[0].size;
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
      const fileSize = `${fileSizeInMB} MB`;
      
      const video = await storage.createVideo({
        userId,
        title: validated.title,
        description: validated.description || '',
        filePath: files.video[0].filename,
        thumbnailUrl: thumbnailPath,
        fileSize,
        tags: validated.tags,
        status: 'draft',
      });
      
      res.json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error uploading video:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  // Create a new video record without file
  app.post('/api/videos', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { title, description } = req.body;
      
      const video = await storage.createVideo({
        userId,
        title,
        description,
        status: 'draft',
      });
      
      res.json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  const publishVideoSchema = z.object({
    channelIds: z.array(z.string()).nonempty(),
  });

  // Publish video to YouTube channels
  app.post('/api/videos/:id/publish', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      const validated = publishVideoSchema.parse(req.body);
      
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Verify video ownership
      if (video.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to publish this video" });
      }
      
      if (!video.filePath) {
        return res.status(400).json({ message: "Video file not found" });
      }
      
      // Verify all channelIds belong to the user
      const userChannels = await storage.getYoutubeChannels(userId);
      const userChannelIds = new Set(userChannels.map(c => c.id));
      
      for (const channelId of validated.channelIds) {
        if (!userChannelIds.has(channelId)) {
          return res.status(403).json({ message: `Channel ${channelId} not found or not authorized` });
        }
      }
      
      // Get user's YouTube credentials for token refresh
      const credentials = await storage.getYoutubeCredentials(userId);
      if (!credentials) {
        return res.status(400).json({ 
          message: "YouTube API credentials not configured. Please add them in Settings first." 
        });
      }
      
      const { uploadVideoToYouTube, refreshAccessToken, getOAuth2Client } = await import('./youtube');
      const { createReadStream } = await import('fs');
      const publishedChannels: string[] = [];
      const youtubeVideoIds: Record<string, string> = {};
      
      for (const channelId of validated.channelIds) {
        const token = await storage.getYoutubeTokenByChannelId(channelId);
        if (!token) continue;
        
        try {
          // Check if token is expired and refresh if needed
          let accessToken = token.accessToken;
          if (token.expiresAt && new Date(token.expiresAt) <= new Date()) {
            if (token.refreshToken) {
              // Use user's credentials for token refresh
              const oauth2Client = getOAuth2Client(
                credentials.clientId,
                credentials.clientSecret
              );
              const newTokens = await refreshAccessToken(oauth2Client, token.refreshToken);
              accessToken = newTokens.access_token!;
              
              // Update stored token
              await storage.updateYoutubeToken(channelId, {
                accessToken,
                expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
              });
            } else {
              console.error(`No refresh token for channel ${channelId}`);
              continue;
            }
          }
          
          const videoStream = createReadStream(getVideoFilePath(video.filePath));
          const thumbnailPath = video.thumbnailUrl ? getVideoFilePath(video.thumbnailUrl.replace('/uploads/', '')) : undefined;
          
          const result = await uploadVideoToYouTube(
            accessToken,
            videoStream,
            video.title,
            video.description || '',
            'private',
            video.tags || undefined,
            thumbnailPath
          );
          
          if (result.id) {
            publishedChannels.push(channelId);
            youtubeVideoIds[channelId] = result.id;
          }
        } catch (error) {
          console.error(`Error publishing to channel ${channelId}:`, error);
        }
      }
      
      // Store the first YouTube video ID
      const firstVideoId = Object.values(youtubeVideoIds)[0];
      
      await storage.updateVideo(id, {
        status: 'published',
        publishedChannels,
        youtubeVideoId: firstVideoId,
      });
      
      // Clean up uploaded file after publishing
      try {
        await fs.unlink(getVideoFilePath(video.filePath));
      } catch (error) {
        console.error("Error deleting uploaded file:", error);
      }
      
      res.json({ 
        message: "Video published successfully", 
        publishedChannels,
        youtubeVideoIds 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error publishing video:", error);
      res.status(500).json({ message: "Failed to publish video" });
    }
  });

  const schedulePremiereSchema = z.object({
    channelId: z.string(),
    scheduledTime: z.string(),
  });

  // Schedule video as premiere
  app.post('/api/videos/:id/premiere', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      const validated = schedulePremiereSchema.parse(req.body);
      
      // Validate that scheduled time is in the future
      const scheduledDate = new Date(validated.scheduledTime);
      const now = new Date();
      if (scheduledDate <= now) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }
      
      // YouTube requires at least 5 minutes in the future
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      if (scheduledDate < fiveMinutesFromNow) {
        return res.status(400).json({ message: "Scheduled time must be at least 5 minutes in the future" });
      }
      
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      if (video.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      if (!video.filePath) {
        return res.status(400).json({ message: "Video file not found" });
      }
      
      // Verify channel ownership
      const channel = await storage.getYoutubeChannel(userId, validated.channelId);
      if (!channel) {
        return res.status(403).json({ message: "Channel not found or not authorized" });
      }
      
      // Get channel token
      const token = await storage.getYoutubeTokenByChannelId(validated.channelId);
      if (!token) {
        return res.status(400).json({ message: "Channel not authenticated" });
      }
      
      // Get credentials for token refresh
      const credentials = await storage.getYoutubeCredentials(userId);
      if (!credentials) {
        return res.status(400).json({ 
          message: "YouTube API credentials not configured" 
        });
      }
      
      // Check token expiry and refresh if needed
      let accessToken = token.accessToken;
      if (token.expiresAt && new Date(token.expiresAt) <= new Date()) {
        if (token.refreshToken) {
          const { getOAuth2Client, refreshAccessToken } = await import('./youtube');
          const oauth2Client = getOAuth2Client(credentials.clientId, credentials.clientSecret);
          const newTokens = await refreshAccessToken(oauth2Client, token.refreshToken);
          accessToken = newTokens.access_token!;
          
          await storage.updateYoutubeToken(validated.channelId, {
            accessToken,
            expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
          });
        } else {
          return res.status(400).json({ 
            message: "Token expired. Please reconnect the channel." 
          });
        }
      }
      
      const { scheduleVideoPremiere } = await import('./youtube');
      const { createReadStream } = await import('fs');
      
      const videoStream = createReadStream(getVideoFilePath(video.filePath));
      const thumbnailPath = video.thumbnailUrl ? getVideoFilePath(video.thumbnailUrl.replace('/uploads/', '')) : undefined;
      
      const result = await scheduleVideoPremiere(
        accessToken,
        videoStream,
        video.title,
        video.description || '',
        validated.scheduledTime,
        video.tags || undefined,
        thumbnailPath
      );
      
      // Update video with premiere info
      await storage.updateVideo(id, {
        premiereScheduledTime: new Date(result.scheduledStartTime),
        premiereChannelId: validated.channelId,
        youtubeVideoId: result.videoId,
        premiereStatus: 'scheduled',
        status: 'premiere_scheduled',
      });
      
      // Clean up uploaded file only after successful premiere creation
      try {
        await fs.unlink(getVideoFilePath(video.filePath));
      } catch (error) {
        console.error("Error deleting uploaded file:", error);
      }
      
      res.json({ 
        message: "Premiere scheduled successfully", 
        youtubeVideoId: result.videoId,
        scheduledTime: result.scheduledStartTime,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error scheduling premiere:", error);
      res.status(500).json({ message: "Failed to schedule premiere" });
    }
  });

  // Delete a video
  app.delete('/api/videos/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVideo(id);
      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // Live stream routes
  const createLiveStreamSchema = z.object({
    channelId: z.string(),
    title: z.string().min(1).max(100),
    description: z.string().max(5000).optional(),
    scheduledStartTime: z.string(),
    privacyStatus: z.enum(['private', 'public', 'unlisted']).optional(),
    streamType: z.enum(['rtmp', 'video']).optional().default('rtmp'),
    videoId: z.string().optional(),
  }).refine(
    (data) => {
      if (data.streamType === 'video' && !data.videoId) {
        return false;
      }
      return true;
    },
    {
      message: "videoId is required when streamType is 'video'",
      path: ['videoId'],
    }
  );

  // Get all live streams for a user
  app.get('/api/live-streams', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const streams = await storage.getLiveStreams(userId);
      res.json(streams);
    } catch (error) {
      console.error("Error fetching live streams:", error);
      res.status(500).json({ message: "Failed to fetch live streams" });
    }
  });

  // Get a specific live stream
  app.get('/api/live-streams/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      const stream = await storage.getLiveStream(id);
      
      if (!stream) {
        return res.status(404).json({ message: "Live stream not found" });
      }
      
      // Verify ownership
      if (stream.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this live stream" });
      }
      
      res.json(stream);
    } catch (error) {
      console.error("Error fetching live stream:", error);
      res.status(500).json({ message: "Failed to fetch live stream" });
    }
  });

  // Create a new live stream
  app.post('/api/live-streams', isAuthenticated, upload.single('thumbnail'), async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
      // Parse tags if present
      let parsedTags: string[] = [];
      if (req.body.tags) {
        try {
          parsedTags = JSON.parse(req.body.tags);
        } catch (error) {
          console.error("Error parsing tags:", error);
        }
      }
      
      const validated = createLiveStreamSchema.parse({
        ...req.body,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      });
      
      // Verify channel ownership
      const channel = await storage.getYoutubeChannel(userId, validated.channelId);
      if (!channel) {
        return res.status(403).json({ message: "Channel not found or not authorized" });
      }

      // If video stream type, verify video ownership
      if (validated.streamType === 'video' && validated.videoId) {
        const video = await storage.getVideo(validated.videoId);
        if (!video) {
          return res.status(404).json({ message: "Video not found" });
        }
        if (video.userId !== userId) {
          return res.status(403).json({ message: "Not authorized to use this video" });
        }
      }
      
      // Get channel token
      const token = await storage.getYoutubeTokenByChannelId(validated.channelId);
      if (!token) {
        return res.status(400).json({ message: "Channel not authenticated" });
      }
      
      // Check if token is expired and refresh if needed
      let accessToken = token.accessToken;
      if (token.expiresAt && new Date(token.expiresAt) <= new Date()) {
        if (!token.refreshToken) {
          return res.status(400).json({ 
            message: "YouTube access token expired and no refresh token available. Please reconnect the channel." 
          });
        }
        
        const credentials = await storage.getYoutubeCredentials(userId);
        if (!credentials) {
          return res.status(400).json({ 
            message: "YouTube API credentials not configured. Please add them in Settings first." 
          });
        }
        
        const { getOAuth2Client, refreshAccessToken } = await import('./youtube');
        const oauth2Client = getOAuth2Client(credentials.clientId, credentials.clientSecret);
        const newTokens = await refreshAccessToken(oauth2Client, token.refreshToken);
        accessToken = newTokens.access_token!;
        
        await storage.updateYoutubeToken(validated.channelId, {
          accessToken,
          expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
        });
      }
      
      // Create YouTube broadcast
      const { createLiveBroadcast, createLiveStream, bindBroadcastToStream } = await import('./youtube');
      
      const broadcast = await createLiveBroadcast(
        accessToken,
        validated.title,
        validated.description || '',
        validated.scheduledStartTime,
        validated.privacyStatus || 'private'
      );
      
      // Create YouTube stream (needed for both RTMP and video types)
      const ytStream = await createLiveStream(
        accessToken,
        `${validated.title} - Stream`
      );
      
      // Bind broadcast to stream
      await bindBroadcastToStream(
        accessToken,
        broadcast.id!,
        ytStream.id!
      );
      
      const streamKey = ytStream.cdn?.ingestionInfo?.streamName;
      const streamUrl = ytStream.cdn?.ingestionInfo?.ingestionAddress;
      const rtmpUrl = `${ytStream.cdn?.ingestionInfo?.ingestionAddress}/${ytStream.cdn?.ingestionInfo?.streamName}`;
      
      // Handle thumbnail upload
      const file = req.file as Express.Multer.File | undefined;
      const thumbnailPath = file ? `/uploads/${file.filename}` : undefined;
      
      // Store in database
      const liveStream = await storage.createLiveStream({
        userId,
        channelId: validated.channelId,
        videoId: validated.videoId,
        title: validated.title,
        description: validated.description,
        thumbnailUrl: thumbnailPath,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        streamType: validated.streamType || 'rtmp',
        scheduledStartTime: new Date(validated.scheduledStartTime),
        youtubeBroadcastId: broadcast.id,
        youtubeStreamId: ytStream.id,
        streamKey,
        streamUrl,
        rtmpUrl,
        status: 'created',
        privacyStatus: validated.privacyStatus || 'private',
      });
      
      res.json(liveStream);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating live stream:", error);
      
      // Check for YouTube live streaming not enabled error
      if ((error as any).message?.includes('not enabled for live streaming')) {
        return res.status(403).json({ 
          message: "Your YouTube channel is not enabled for live streaming. Please enable it in YouTube Studio first (may take up to 24 hours after verification)." 
        });
      }
      
      res.status(500).json({ message: "Failed to create live stream" });
    }
  });

  // Delete a live stream
  app.delete('/api/live-streams/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      
      const stream = await storage.getLiveStream(id);
      if (!stream) {
        return res.status(404).json({ message: "Live stream not found" });
      }
      
      // Verify ownership
      if (stream.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this live stream" });
      }
      
      // Delete from YouTube if broadcast exists
      if (stream.youtubeBroadcastId) {
        try {
          const token = await storage.getYoutubeTokenByChannelId(stream.channelId);
          if (token) {
            let accessToken = token.accessToken;
            
            // Check if token is expired and refresh if needed
            if (token.expiresAt && new Date(token.expiresAt) <= new Date()) {
              if (!token.refreshToken) {
                return res.status(400).json({ 
                  message: "Cannot delete YouTube broadcast: access token expired and no refresh token available. Please reconnect the channel first." 
                });
              }
              
              const credentials = await storage.getYoutubeCredentials(userId);
              if (!credentials) {
                return res.status(400).json({ 
                  message: "YouTube API credentials not configured. Please add them in Settings first." 
                });
              }
              
              const { getOAuth2Client, refreshAccessToken } = await import('./youtube');
              const oauth2Client = getOAuth2Client(credentials.clientId, credentials.clientSecret);
              const newTokens = await refreshAccessToken(oauth2Client, token.refreshToken);
              accessToken = newTokens.access_token!;
              
              await storage.updateYoutubeToken(stream.channelId, {
                accessToken,
                expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
              });
            }
            
            const { deleteLiveBroadcast } = await import('./youtube');
            await deleteLiveBroadcast(accessToken, stream.youtubeBroadcastId);
          }
        } catch (error) {
          console.error("Error deleting YouTube broadcast:", error);
          return res.status(500).json({ message: "Failed to delete YouTube broadcast" });
        }
      }
      
      await storage.deleteLiveStream(id);
      res.json({ message: "Live stream deleted successfully" });
    } catch (error) {
      console.error("Error deleting live stream:", error);
      res.status(500).json({ message: "Failed to delete live stream" });
    }
  });

  // Start video-based live stream
  app.post('/api/live-streams/:id/start', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      
      const stream = await storage.getLiveStream(id);
      if (!stream) {
        return res.status(404).json({ message: "Live stream not found" });
      }
      
      if (stream.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to start this live stream" });
      }
      
      if (stream.streamType !== 'video') {
        return res.status(400).json({ message: "This endpoint is only for video-based streams" });
      }
      
      if (!stream.videoId) {
        return res.status(400).json({ message: "No video associated with this stream" });
      }

      const video = await storage.getVideo(stream.videoId);
      if (!video) {
        return res.status(404).json({ message: "Associated video not found" });
      }

      if (!video.filePath) {
        return res.status(400).json({ message: "Video file not found" });
      }

      if (!stream.streamUrl || !stream.streamKey) {
        return res.status(400).json({ 
          message: "Stream URL and key not available. Please create an RTMP stream for video-based streaming." 
        });
      }

      const rtmpUrl = `${stream.streamUrl}/${stream.streamKey}`;
      
      const { streamingService } = await import('./streaming');
      const loop = req.body.loop !== false;
      
      await streamingService.startVideoStream(
        stream.id,
        video.filePath,
        rtmpUrl,
        loop
      );
      
      await storage.updateLiveStream(id, {
        status: 'live',
        actualStartTime: new Date(),
      });
      
      res.json({ 
        message: "Video stream started successfully",
        streamId: stream.id,
        loop,
      });
    } catch (error) {
      console.error("Error starting video stream:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to start video stream" 
      });
    }
  });

  // Stop video-based live stream
  app.post('/api/live-streams/:id/stop', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      
      const stream = await storage.getLiveStream(id);
      if (!stream) {
        return res.status(404).json({ message: "Live stream not found" });
      }
      
      if (stream.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to stop this live stream" });
      }
      
      const { streamingService } = await import('./streaming');
      
      if (!streamingService.isStreamActive(id)) {
        return res.status(400).json({ message: "Stream is not currently running" });
      }
      
      streamingService.stopVideoStream(id);
      
      await storage.updateLiveStream(id, {
        status: 'complete',
        actualEndTime: new Date(),
      });
      
      res.json({ message: "Video stream stopped successfully" });
    } catch (error) {
      console.error("Error stopping video stream:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to stop video stream" 
      });
    }
  });

  // Get stream status
  app.get('/api/live-streams/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      
      const stream = await storage.getLiveStream(id);
      if (!stream) {
        return res.status(404).json({ message: "Live stream not found" });
      }
      
      if (stream.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this stream status" });
      }
      
      const { streamingService } = await import('./streaming');
      const isActive = streamingService.isStreamActive(id);
      const activeInfo = streamingService.getActiveStreamInfo(id);
      
      res.json({
        streamId: id,
        isActive,
        status: stream.status,
        activeInfo: activeInfo ? {
          startTime: activeInfo.startTime,
          videoPath: activeInfo.videoPath,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching stream status:", error);
      res.status(500).json({ message: "Failed to fetch stream status" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
