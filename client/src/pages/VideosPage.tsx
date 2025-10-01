import { useState } from "react";
import VideoCard from "@/components/VideoCard";
import PublishModal, { PublishOptions } from "@/components/PublishModal";
import PremiereModal from "@/components/PremiereModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Grid3x3, 
  List, 
  Loader2, 
  Video as VideoIcon,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ImageOff
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Video, YoutubeChannel } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  published: { label: "Published", className: "bg-chart-1 text-white" },
  processing: { label: "Processing", className: "bg-chart-2 text-white" },
  failed: { label: "Failed", className: "bg-destructive text-destructive-foreground" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  premiere_scheduled: { label: "Premiere", className: "bg-chart-3 text-white" },
};

type SortField = "title" | "status" | "date" | "channels";
type SortDirection = "asc" | "desc";

export default function VideosPage() {
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [premiereModalOpen, setPremiereModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
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
      setSelectedVideoIds(new Set());
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

  const handleBulkDelete = () => {
    if (selectedVideoIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedVideoIds.size} video(s)?`)) {
      selectedVideoIds.forEach(id => deleteMutation.mutate(id));
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideoIds);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideoIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedVideoIds.size === filteredAndSortedVideos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(filteredAndSortedVideos.map(v => v.id)));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  let filteredVideos = filterStatus === "all"
    ? (videos || [])
    : (videos || []).filter((v) => v.status === filterStatus);

  if (searchQuery) {
    filteredVideos = filteredVideos.filter(v => 
      v.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const filteredAndSortedVideos = [...filteredVideos].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "date":
        comparison = new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
        break;
      case "channels":
        comparison = (a.publishedChannels?.length || 0) - (b.publishedChannels?.length || 0);
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const transformedChannels = (channels || []).map(ch => ({
    id: ch.id,
    name: ch.channelTitle,
    avatar: ch.thumbnailUrl || '',
    subscribers: ch.subscriberCount || '0',
  }));

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  return (
    <div className="space-y-6">
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedVideoIds.size > 0 && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                data-testid="button-bulk-delete"
              >
                Delete ({selectedVideoIds.size})
              </Button>
              <div className="h-6 w-px bg-border" />
            </>
          )}
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
      ) : filteredAndSortedVideos.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedVideos.map((video) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                thumbnail={video.thumbnailUrl || ''}
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
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedVideoIds.size === filteredAndSortedVideos.length && filteredAndSortedVideos.length > 0}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead className="w-[300px]">
                    <button
                      onClick={() => handleSort("title")}
                      className="flex items-center hover-elevate active-elevate-2 -ml-4 pl-4 pr-2 py-1 rounded"
                      data-testid="sort-title"
                    >
                      Video
                      <SortIcon field="title" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center hover-elevate active-elevate-2 -ml-4 pl-4 pr-2 py-1 rounded"
                      data-testid="sort-status"
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("date")}
                      className="flex items-center hover-elevate active-elevate-2 -ml-4 pl-4 pr-2 py-1 rounded"
                      data-testid="sort-date"
                    >
                      Date
                      <SortIcon field="date" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("channels")}
                      className="flex items-center hover-elevate active-elevate-2 -ml-4 pl-4 pr-2 py-1 rounded"
                      data-testid="sort-channels"
                    >
                      Published To
                      <SortIcon field="channels" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedVideos.map((video) => {
                  const statusInfo = statusConfig[video.status as keyof typeof statusConfig] || 
                    { label: video.status, className: "bg-muted text-muted-foreground" };
                  
                  return (
                    <TableRow key={video.id} data-testid={`row-video-${video.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedVideoIds.has(video.id)}
                          onCheckedChange={() => toggleVideoSelection(video.id)}
                          data-testid={`checkbox-video-${video.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-24 h-14 flex-shrink-0 bg-muted rounded overflow-hidden">
                            {video.thumbnailUrl ? (
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                                data-testid={`img-thumbnail-${video.id}`}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageOff className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                              {video.duration || '0:00'}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium line-clamp-2" data-testid={`text-title-${video.id}`}>
                              {video.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {video.fileSize || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.className} data-testid={`badge-status-${video.id}`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-date-${video.id}`}>
                        {new Date(video.createdAt!).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-channels-${video.id}`}>
                        {video.publishedChannels?.length || 0} channel{video.publishedChannels?.length !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-menu-${video.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handlePublishClick(video)}
                              data-testid={`button-publish-${video.id}`}
                            >
                              Publish
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePremiereClick(video)}
                              data-testid={`button-premiere-${video.id}`}
                            >
                              Schedule Premiere
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => console.log("Edit video:", video.id)}
                              data-testid={`button-edit-${video.id}`}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(video.id)}
                              data-testid={`button-delete-${video.id}`}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <Card className="p-12 text-center">
          <VideoIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Videos Found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? `No videos matching "${searchQuery}"`
              : filterStatus === "all" 
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
