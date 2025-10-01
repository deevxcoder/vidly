import { useState } from "react";
import { Video, Upload, Youtube, CheckCircle, Plus, Loader2 } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import VideoCard from "@/components/VideoCard";
import ChannelCard from "@/components/ChannelCard";
import PublishModal, { PublishOptions } from "@/components/PublishModal";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Video as VideoType, YoutubeChannel } from "@shared/schema";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: videos, isLoading: videosLoading } = useQuery<VideoType[]>({
    queryKey: ['/api/videos'],
  });

  const { data: channels, isLoading: channelsLoading } = useQuery<YoutubeChannel[]>({
    queryKey: ['/api/youtube/channels'],
  });

  const publishMutation = useMutation({
    mutationFn: async ({ videoId, options }: { videoId: string; options: PublishOptions }) => {
      return await apiRequest('POST', `/api/videos/${videoId}/publish`, options);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      const isScheduled = !!data.scheduledTime;
      toast({
        title: isScheduled ? "Video Scheduled" : "Video Published",
        description: isScheduled 
          ? "Your video has been scheduled successfully" 
          : "Your video has been published successfully to selected channels",
      });
      setPublishModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Publish Failed",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (videoId: string) => {
      return await apiRequest('DELETE', `/api/videos/${videoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Video Deleted",
        description: "Your video has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message,
      });
    },
  });

  const handlePublishClick = (video: VideoType) => {
    setSelectedVideo(video);
    setPublishModalOpen(true);
  };

  const handlePublish = (options: PublishOptions) => {
    if (selectedVideo) {
      publishMutation.mutate({
        videoId: selectedVideo.id,
        options,
      });
    }
  };

  const handleDelete = (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      deleteMutation.mutate(videoId);
    }
  };

  // Calculate stats from real data
  const totalVideos = videos?.length || 0;
  const publishedVideos = videos?.filter(v => v.status === 'published').length || 0;
  const pendingVideos = videos?.filter(v => v.status === 'draft').length || 0;
  const connectedChannels = channels?.length || 0;

  // Get recent videos (last 3)
  const recentVideos = videos?.slice(0, 3) || [];

  const isLoading = videosLoading || channelsLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your videos and channels from one place
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Videos"
          value={totalVideos}
          icon={Video}
          description="In your library"
          data-testid="stat-total-videos"
        />
        <StatsCard
          title="Published"
          value={publishedVideos}
          icon={CheckCircle}
          description="Across all channels"
          data-testid="stat-published"
        />
        <StatsCard
          title="Pending"
          value={pendingVideos}
          icon={Upload}
          description="Ready to publish"
          data-testid="stat-pending"
        />
        <StatsCard
          title="Connected Channels"
          value={connectedChannels}
          icon={Youtube}
          description="Active connections"
          data-testid="stat-channels"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Videos</h2>
          <Button variant="outline" onClick={() => setLocation('/videos')} data-testid="button-view-all-videos">
            View All
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : recentVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentVideos.map((video) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                thumbnail={video.thumbnailUrl || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop'}
                duration={video.duration || '0:00'}
                uploadDate={new Date(video.createdAt!).toLocaleDateString()}
                fileSize={video.fileSize || 'N/A'}
                status={video.status as any}
                publishedChannels={video.publishedChannels?.length || 0}
                onPublish={() => handlePublishClick(video)}
                onEdit={() => setLocation(`/upload?edit=${video.id}`)}
                onDelete={() => handleDelete(video.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No videos yet. Upload your first video to get started!
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Connected Channels</h2>
          <Button onClick={() => setLocation('/channels')} data-testid="button-connect-channel">
            <Plus className="w-4 h-4 mr-2" />
            Connect Channel
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : channels && channels.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {channels.slice(0, 2).map((channel) => (
              <ChannelCard
                key={channel.id}
                id={channel.id}
                name={channel.channelTitle}
                avatar={channel.thumbnailUrl || ''}
                subscribers={channel.subscriberCount || '0'}
                videoCount={parseInt(channel.videoCount || '0')}
                connected={channel.isConnected || false}
                onManage={() => setLocation('/channels')}
                onDisconnect={() => setLocation('/channels')}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No channels connected yet. Connect your first YouTube channel!
          </div>
        )}
      </div>

      {selectedVideo && channels && (
        <PublishModal
          open={publishModalOpen}
          onOpenChange={setPublishModalOpen}
          video={selectedVideo}
          channels={channels.map((c) => ({
            id: c.id,
            name: c.channelTitle,
            avatar: c.thumbnailUrl || '',
            subscribers: c.subscriberCount || '0',
          }))}
          onPublish={handlePublish}
        />
      )}
    </div>
  );
}
