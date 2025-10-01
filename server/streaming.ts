import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

interface ActiveStream {
  process: ChildProcess;
  streamId: string;
  videoPath: string;
  rtmpUrl: string;
  startTime: Date;
}

type StreamEndCallback = (streamId: string, code: number | null) => void;

class StreamingService {
  private activeStreams: Map<string, ActiveStream> = new Map();
  private onStreamEndCallback?: StreamEndCallback;

  setStreamEndCallback(callback: StreamEndCallback): void {
    this.onStreamEndCallback = callback;
  }

  async startVideoStream(
    streamId: string,
    videoPath: string,
    rtmpUrl: string,
    loop: boolean = true
  ): Promise<void> {
    if (this.activeStreams.has(streamId)) {
      throw new Error('Stream is already running');
    }

    const uploadsDir = path.resolve(path.join(process.cwd(), 'uploads'));
    
    let absoluteVideoPath: string;
    if (path.isAbsolute(videoPath)) {
      absoluteVideoPath = videoPath;
    } else {
      absoluteVideoPath = path.join(uploadsDir, videoPath);
    }

    // Check if file exists first
    try {
      await fs.access(absoluteVideoPath);
    } catch (error) {
      throw new Error(`Video file not found: ${absoluteVideoPath}`);
    }

    // Validate that the file is within uploads directory by resolving symlinks
    try {
      const realVideoPath = await fs.realpath(absoluteVideoPath);
      const realUploadsDir = await fs.realpath(uploadsDir);
      const rel = path.relative(realUploadsDir, realVideoPath);
      
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error('Video path must be within the uploads directory');
      }
    } catch (error) {
      // If realpath fails, the validation above (file exists) is sufficient
      console.warn(`Warning: Could not validate path location: ${error}`);
    }

    const ffmpegArgs = [
      '-re',
      '-stream_loop', loop ? '-1' : '0',
      '-i', absoluteVideoPath,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-maxrate', '3000k',
      '-bufsize', '6000k',
      '-pix_fmt', 'yuv420p',
      '-g', '50',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'flv',
      rtmpUrl
    ];

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    ffmpegProcess.stdout.on('data', (data) => {
      console.log(`[Stream ${streamId}] ${data}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      console.error(`[Stream ${streamId}] ${data}`);
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`[Stream ${streamId}] Process exited with code ${code}`);
      this.activeStreams.delete(streamId);
      
      if (this.onStreamEndCallback) {
        this.onStreamEndCallback(streamId, code);
      }
    });

    ffmpegProcess.on('error', (error) => {
      console.error(`[Stream ${streamId}] Error:`, error);
      this.activeStreams.delete(streamId);
      
      if (this.onStreamEndCallback) {
        this.onStreamEndCallback(streamId, null);
      }
    });

    this.activeStreams.set(streamId, {
      process: ffmpegProcess,
      streamId,
      videoPath: absoluteVideoPath,
      rtmpUrl,
      startTime: new Date(),
    });

    console.log(`[Stream ${streamId}] Started video stream from ${absoluteVideoPath} to ${rtmpUrl}`);
  }

  stopVideoStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found or not running');
    }

    stream.process.kill('SIGTERM');
    
    setTimeout(() => {
      if (stream.process.killed === false) {
        stream.process.kill('SIGKILL');
      }
    }, 5000);

    this.activeStreams.delete(streamId);
    console.log(`[Stream ${streamId}] Stopped video stream`);
  }

  isStreamActive(streamId: string): boolean {
    return this.activeStreams.has(streamId);
  }

  getActiveStreamInfo(streamId: string): ActiveStream | undefined {
    return this.activeStreams.get(streamId);
  }

  getAllActiveStreams(): ActiveStream[] {
    return Array.from(this.activeStreams.values());
  }

  stopAllStreams(): void {
    for (const [streamId] of this.activeStreams) {
      try {
        this.stopVideoStream(streamId);
      } catch (error) {
        console.error(`Error stopping stream ${streamId}:`, error);
      }
    }
  }
}

export const streamingService = new StreamingService();
