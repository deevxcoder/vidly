import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// YouTube OAuth scopes
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

export function getOAuth2Client(clientId?: string, clientSecret?: string, redirectUri?: string): OAuth2Client {
  let defaultRedirectUri: string;
  
  if (process.env.PUBLIC_URL) {
    defaultRedirectUri = `${process.env.PUBLIC_URL}/api/youtube/oauth/callback`;
  } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    defaultRedirectUri = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/youtube/oauth/callback`;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    defaultRedirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/youtube/oauth/callback`;
  } else {
    defaultRedirectUri = 'http://localhost:5000/api/youtube/oauth/callback';
  }
    
  return new google.auth.OAuth2(
    clientId || process.env.YOUTUBE_CLIENT_ID,
    clientSecret || process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri || defaultRedirectUri
  );
}

export function getAuthUrl(oauth2Client: OAuth2Client, state?: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: YOUTUBE_SCOPES,
    state: state,
    prompt: 'consent'
  });
}

export async function getTokenFromCode(oauth2Client: OAuth2Client, code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function refreshAccessToken(oauth2Client: OAuth2Client, refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

export async function getYoutubeService(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.youtube({
    version: 'v3',
    auth: oauth2Client
  });
}

export async function getUserChannels(accessToken: string) {
  const youtube = await getYoutubeService(accessToken);
  
  const response = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true
  });
  
  return response.data.items || [];
}

export async function uploadThumbnail(
  accessToken: string,
  videoId: string,
  thumbnailPath: string
) {
  const youtube = await getYoutubeService(accessToken);
  const { createReadStream } = await import('fs');
  
  try {
    const response = await youtube.thumbnails.set({
      videoId: videoId,
      media: {
        body: createReadStream(thumbnailPath),
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    throw error;
  }
}

export async function uploadVideoToYouTube(
  accessToken: string,
  videoFile: any,
  title: string,
  description: string,
  privacyStatus: 'private' | 'public' | 'unlisted' = 'private',
  tags?: string[],
  thumbnailPath?: string
) {
  const youtube = await getYoutubeService(accessToken);
  
  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags: tags && tags.length > 0 ? tags : undefined,
      },
      status: {
        privacyStatus,
      },
    },
    media: {
      body: videoFile,
    },
  });
  
  // Upload thumbnail if provided
  if (thumbnailPath && response.data.id) {
    await uploadThumbnail(accessToken, response.data.id, thumbnailPath);
  }
  
  return response.data;
}

export async function scheduleVideoUpload(
  accessToken: string,
  videoFile: any,
  title: string,
  description: string,
  scheduledTime: string,
  privacyStatus: 'private' | 'public' | 'unlisted' = 'private',
  tags?: string[],
  thumbnailPath?: string
) {
  const youtube = await getYoutubeService(accessToken);
  
  // Ensure scheduledTime is in RFC3339 format with timezone
  const scheduledDate = new Date(scheduledTime);
  const rfc3339Time = scheduledDate.toISOString();
  
  // Schedule a regular upload (non-premiere)
  // IMPORTANT: YouTube API limitation - when using publishAt (scheduled uploads),
  // the video MUST be private. The privacyStatus parameter is accepted for API
  // consistency but is not used. The video will remain private after the scheduled
  // publish time. To change privacy after publishing, a separate API call would be needed.
  const videoResponse = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags: tags && tags.length > 0 ? tags : undefined,
      },
      status: {
        privacyStatus: 'private', // Required by YouTube API when using publishAt
        publishAt: rfc3339Time,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: videoFile,
    },
  });
  
  const videoId = videoResponse.data.id;
  if (!videoId) {
    throw new Error('Failed to upload scheduled video');
  }
  
  // Upload thumbnail if provided
  if (thumbnailPath) {
    await uploadThumbnail(accessToken, videoId, thumbnailPath);
  }
  
  return {
    videoId,
    scheduledTime: rfc3339Time,
  };
}

export async function scheduleVideoPremiere(
  accessToken: string,
  videoFile: any,
  title: string,
  description: string,
  scheduledStartTime: string,
  tags?: string[],
  thumbnailPath?: string
) {
  const youtube = await getYoutubeService(accessToken);
  
  // Ensure scheduledStartTime is in RFC3339 format with timezone
  const scheduledDate = new Date(scheduledStartTime);
  const rfc3339Time = scheduledDate.toISOString();
  
  // YouTube Premieres are created by uploading a video with publishAt set to future time
  // YouTube automatically treats this as a premiere
  // NOTE: YouTube requires privacyStatus to be "private" when using publishAt
  const videoResponse = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags: tags && tags.length > 0 ? tags : undefined,
      },
      status: {
        privacyStatus: 'private', // Required for scheduled uploads/premieres
        publishAt: rfc3339Time,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: videoFile,
    },
  });
  
  const videoId = videoResponse.data.id;
  if (!videoId) {
    throw new Error('Failed to upload video for premiere');
  }
  
  // Upload thumbnail if provided
  if (thumbnailPath) {
    await uploadThumbnail(accessToken, videoId, thumbnailPath);
  }
  
  return {
    videoId,
    scheduledStartTime: rfc3339Time,
  };
}

export async function createLiveBroadcast(
  accessToken: string,
  title: string,
  description: string,
  scheduledStartTime: string,
  privacyStatus: 'private' | 'public' | 'unlisted' = 'private'
) {
  const youtube = await getYoutubeService(accessToken);
  
  const response = await youtube.liveBroadcasts.insert({
    part: ['snippet', 'status', 'contentDetails'],
    requestBody: {
      snippet: {
        title,
        description,
        scheduledStartTime,
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
      contentDetails: {
        enableAutoStart: true,
        enableAutoStop: true,
      },
    },
  });
  
  return response.data;
}

export async function createLiveStream(
  accessToken: string,
  title: string
) {
  const youtube = await getYoutubeService(accessToken);
  
  const response = await youtube.liveStreams.insert({
    part: ['snippet', 'cdn'],
    requestBody: {
      snippet: {
        title,
      },
      cdn: {
        frameRate: '30fps',
        ingestionType: 'rtmp',
        resolution: '1080p',
      },
    },
  });
  
  return response.data;
}

export async function bindBroadcastToStream(
  accessToken: string,
  broadcastId: string,
  streamId: string
) {
  const youtube = await getYoutubeService(accessToken);
  
  const response = await youtube.liveBroadcasts.bind({
    part: ['id', 'snippet', 'status'],
    id: broadcastId,
    streamId: streamId,
  });
  
  return response.data;
}

export async function transitionBroadcastStatus(
  accessToken: string,
  broadcastId: string,
  broadcastStatus: 'testing' | 'live' | 'complete'
) {
  const youtube = await getYoutubeService(accessToken);
  
  const response = await youtube.liveBroadcasts.transition({
    part: ['id', 'status'],
    broadcastStatus,
    id: broadcastId,
  });
  
  return response.data;
}

export async function deleteLiveBroadcast(
  accessToken: string,
  broadcastId: string
) {
  const youtube = await getYoutubeService(accessToken);
  
  await youtube.liveBroadcasts.delete({
    id: broadcastId,
  });
}
