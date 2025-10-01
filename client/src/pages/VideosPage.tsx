import { useState } from "react";
import VideoCard from "@/components/VideoCard";
import PublishModal, { PublishOptions } from "@/components/PublishModal";
import PremiereModal from "@/components/PremiereModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Grid3x3, List, Loader2, Video as VideoIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Video, YoutubeChannel } from "@shared/schema";
import { Card } from "@/components/ui/card";

export default function VideosPage() {
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [premiereModalOpen, setPremiereModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  const { data: videos, isLoading: videosLoading } = useQuery<Video[]>({
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

  const premiereMutation = useMutation({
    mutationFn: async ({ videoId, channelId, scheduledTime }: { videoId: string; channelId: string; scheduledTime: string }) => {
      return await apiRequest('POST', `/api/videos/${videoId}/premiere`, { channelId, scheduledTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Premiere Scheduled",
        description: "Your video premiere has been scheduled successfully",
      });
      setPremiereModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Premiere Failed",
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

  const handlePublishClick = (video: Video) => {
    setSelectedVideo(video);
    setPublishModalOpen(true);
  };

  const handlePremiereClick = (video: Video) => {
    setSelectedVideo(video);
    setPremiereModalOpen(true);
  };

  const handlePublish = (options: PublishOptions) => {
    if (!selectedVideo || !selectedVideo.filePath) {
      toast({
        variant: "destructive",
        title: "Cannot Publish",
        description: "Video file not found",
      });
      return;
    }
    publishMutation.mutate({
      videoId: selectedVideo.id,
      options,
    });
  };

  const handlePremiere = (channelId: string, scheduledTime: string) => {
    if (!selectedVideo || !selectedVideo.filePath) {
      toast({
        variant: "destructive",
        title: "Cannot Schedule Premiere",
        description: "Video file not found",
      });
      return;
    }
    premiereMutation.mutate({
      videoId: selectedVideo.id,
      channelId,
      scheduledTime,
    });
  };

  const handleDelete = (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      deleteMutation.mutate(videoId);
    }
  };

  const filteredVideos = filterStatus === "all"
    ? (videos || [])
    : (videos || []).filter((v) => v.status === filterStatus);

  const transformedChannels = (channels || []).map(ch => ({
    id: ch.id,
    name: ch.channelTitle,
    avatar: ch.thumbnailUrl || '',
    subscribers: ch.subscriberCount || '0',
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Video Library</h1>
        <p className="text-muted-foreground">
          Browse and manage all your uploaded videos
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterStatus("all")}
            className={filterStatus === "all" ? "bg-accent" : ""}
            data-testid="filter-all"
          >
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterStatus("published")}
            className={filterStatus === "published" ? "bg-accent" : ""}
            data-testid="filter-published"
          >
            Published
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterStatus("draft")}
            className={filterStatus === "draft" ? "bg-accent" : ""}
            data-testid="filter-draft"
          >
            Draft
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "bg-accent" : ""}
            data-testid="view-grid"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "bg-accent" : ""}
            data-testid="view-list"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {videosLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredVideos.length > 0 ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              thumbnail={video.thumbnailUrl || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop'}
              duration={video.duration || '00:00'}
              uploadDate={new Date(video.createdAt!).toLocaleDateString()}
              fileSize={video.fileSize || 'N/A'}
              status={video.status as any}
              publishedChannels={video.publishedChannels?.length || 0}
              onPublish={() => handlePublishClick(video)}
              onPremiere={() => handlePremiereClick(video)}
              onEdit={() => console.log("Edit video:", video.id)}
              onDelete={() => handleDelete(video.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <VideoIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Videos Found</h3>
          <p className="text-muted-foreground">
            {filterStatus === "all" 
              ? "Upload your first video to get started" 
              : `No ${filterStatus} videos found`}
          </p>
        </Card>
      )}

      {selectedVideo && (
        <>
          <PublishModal
            open={publishModalOpen}
            onOpenChange={setPublishModalOpen}
            video={{
              id: selectedVideo.id,
              title: selectedVideo.title,
              thumbnail: selectedVideo.thumbnailUrl || '',
            }}
            channels={transformedChannels}
            onPublish={handlePublish}
          />
          
          <PremiereModal
            open={premiereModalOpen}
            onOpenChange={setPremiereModalOpen}
            video={{
              id: selectedVideo.id,
              title: selectedVideo.title,
              thumbnail: selectedVideo.thumbnailUrl || '',
            }}
            channels={transformedChannels}
            onSchedule={handlePremiere}
          />
        </>
      )}
    </div>
  );
}
