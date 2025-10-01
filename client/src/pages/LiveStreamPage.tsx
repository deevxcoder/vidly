import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LiveStream, YoutubeChannel, Video as VideoType } from "@shared/schema";
import { Video, Clock, Trash2, Copy, ExternalLink, Loader2, Radio, Play, StopCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function LiveStreamPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [scheduledStartTime, setScheduledStartTime] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState<"private" | "public" | "unlisted">("private");
  const [streamType, setStreamType] = useState<"rtmp" | "video">("rtmp");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();

  const { data: channels, isLoading: channelsLoading } = useQuery<YoutubeChannel[]>({
    queryKey: ['/api/youtube/channels'],
  });

  const { data: videos, isLoading: videosLoading } = useQuery<VideoType[]>({
    queryKey: ['/api/videos'],
  });

  const { data: liveStreams, isLoading: streamsLoading } = useQuery<LiveStream[]>({
    queryKey: ['/api/live-streams'],
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/live-streams', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create live stream');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-streams'] });
      toast({
        title: "Live Stream Created",
        description: "Your live stream has been created successfully",
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message,
      });
    },
  });

  const startStreamMutation = useMutation({
    mutationFn: async (streamId: string) => {
      return await apiRequest('POST', `/api/live-streams/${streamId}/start`, { loop: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-streams'] });
      toast({
        title: "Stream Started",
        description: "Your video stream is now live",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Start",
        description: error.message,
      });
    },
  });

  const stopStreamMutation = useMutation({
    mutationFn: async (streamId: string) => {
      return await apiRequest('POST', `/api/live-streams/${streamId}/stop`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-streams'] });
      toast({
        title: "Stream Stopped",
        description: "Your video stream has been stopped",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Stop",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (streamId: string) => {
      return await apiRequest('DELETE', `/api/live-streams/${streamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-streams'] });
      toast({
        title: "Live Stream Deleted",
        description: "The live stream has been deleted successfully",
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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedChannelId("");
    setScheduledStartTime("");
    setPrivacyStatus("private");
    setStreamType("rtmp");
    setSelectedVideoId("");
    setThumbnailFile(null);
    setTags([]);
    setTagInput("");
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCreateStream = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedChannelId) {
      toast({
        variant: "destructive",
        title: "Channel Required",
        description: "Please select a channel for your live stream",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title Required",
        description: "Please enter a title for your live stream",
      });
      return;
    }

    if (streamType === 'video' && !selectedVideoId) {
      toast({
        variant: "destructive",
        title: "Video Required",
        description: "Please select a video for your live stream",
      });
      return;
    }

    if (!scheduledStartTime) {
      toast({
        variant: "destructive",
        title: "Schedule Required",
        description: "Please set a scheduled start time for your live stream",
      });
      return;
    }

    const formData = new FormData();
    formData.append('channelId', selectedChannelId);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('scheduledStartTime', new Date(scheduledStartTime).toISOString());
    formData.append('privacyStatus', privacyStatus);
    formData.append('streamType', streamType);
    
    if (streamType === 'video' && selectedVideoId) {
      formData.append('videoId', selectedVideoId);
    }
    
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }
    
    if (tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }

    createMutation.mutate(formData);
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const handleDelete = (streamId: string) => {
    if (confirm('Are you sure you want to delete this live stream?')) {
      deleteMutation.mutate(streamId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created':
        return 'bg-blue-500 text-white';
      case 'live':
        return 'bg-red-500 text-white';
      case 'testing':
        return 'bg-yellow-500 text-white';
      case 'complete':
        return 'bg-green-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Live Streaming</h1>
        <p className="text-muted-foreground">
          Create and manage live streams for your YouTube channels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Create Live Stream</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStream} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="channel">Channel</Label>
                  <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                    <SelectTrigger id="channel" data-testid="select-channel">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels?.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id} data-testid={`select-item-channel-${channel.id}`}>
                          {channel.channelTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Stream Type</Label>
                  <RadioGroup value={streamType} onValueChange={(value: any) => setStreamType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="rtmp" id="rtmp" data-testid="radio-rtmp" />
                      <Label htmlFor="rtmp" className="font-normal cursor-pointer">
                        RTMP (Use external encoder)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="video" id="video" data-testid="radio-video" />
                      <Label htmlFor="video" className="font-normal cursor-pointer">
                        Pre-recorded Video (Stream from app)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {streamType === 'video' && (
                  <div className="space-y-2">
                    <Label htmlFor="video">Select Video</Label>
                    <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
                      <SelectTrigger id="video" data-testid="select-video">
                        <SelectValue placeholder="Choose a video to stream" />
                      </SelectTrigger>
                      <SelectContent>
                        {videos && videos.length > 0 ? (
                          videos.map((video) => (
                            <SelectItem key={video.id} value={video.id} data-testid={`select-item-video-${video.id}`}>
                              {video.title} {video.duration ? `(${video.duration})` : ''}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled data-testid="select-item-no-videos">
                            No videos available - Upload videos first
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {videosLoading && (
                      <p className="text-xs text-muted-foreground">Loading videos...</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="My Live Stream"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your live stream..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    data-testid="input-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail (Optional)</Label>
                  <Input
                    id="thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    data-testid="input-thumbnail"
                  />
                  {thumbnailFile && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {thumbnailFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      placeholder="Add a tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      data-testid="input-tag"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      variant="outline"
                      data-testid="button-add-tag"
                    >
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1"
                          data-testid={`badge-tag-${tag}`}
                        >
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                            data-testid={`button-remove-tag-${tag}`}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Scheduled Start Time</Label>
                  <Input
                    id="scheduledTime"
                    type="datetime-local"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                    data-testid="input-scheduled-time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="privacy">Privacy</Label>
                  <Select value={privacyStatus} onValueChange={(value: any) => setPrivacyStatus(value)}>
                    <SelectTrigger id="privacy" data-testid="select-privacy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private" data-testid="select-item-privacy-private">Private</SelectItem>
                      <SelectItem value="unlisted" data-testid="select-item-privacy-unlisted">Unlisted</SelectItem>
                      <SelectItem value="public" data-testid="select-item-privacy-public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || channelsLoading}
                  data-testid="button-create-stream"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4 mr-2" />
                      Create Live Stream
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Live Streams</CardTitle>
            </CardHeader>
            <CardContent>
              {streamsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : liveStreams && liveStreams.length > 0 ? (
                <div className="space-y-4">
                  {liveStreams.map((stream) => (
                    <Card key={stream.id} data-testid={`card-stream-${stream.id}`}>
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold" data-testid={`text-stream-title-${stream.id}`}>
                                  {stream.title}
                                </h3>
                                <Badge className={getStatusColor(stream.status)} data-testid={`badge-status-${stream.id}`}>
                                  {stream.status}
                                </Badge>
                              </div>
                              {stream.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {stream.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {stream.scheduledStartTime
                                    ? new Date(stream.scheduledStartTime).toLocaleString()
                                    : "Not scheduled"}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Video className="w-4 h-4" />
                                  {stream.privacyStatus}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(stream.id)}
                              data-testid={`button-delete-${stream.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {stream.streamType === 'video' && (
                            <div className="flex gap-2 pt-4 border-t">
                              {stream.status !== 'live' ? (
                                <Button
                                  onClick={() => startStreamMutation.mutate(stream.id)}
                                  disabled={startStreamMutation.isPending}
                                  className="flex-1"
                                  data-testid={`button-start-${stream.id}`}
                                >
                                  {startStreamMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Starting...
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4 mr-2" />
                                      Start Streaming
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  onClick={() => stopStreamMutation.mutate(stream.id)}
                                  disabled={stopStreamMutation.isPending}
                                  className="flex-1"
                                  data-testid={`button-stop-${stream.id}`}
                                >
                                  {stopStreamMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Stopping...
                                    </>
                                  ) : (
                                    <>
                                      <StopCircle className="w-4 h-4 mr-2" />
                                      Stop Streaming
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}

                          {stream.streamKey && stream.streamUrl && stream.streamType === 'rtmp' && (
                            <div className="space-y-3 pt-4 border-t">
                              <h4 className="text-sm font-medium">Stream Details</h4>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <Label className="text-sm text-muted-foreground">RTMP URL</Label>
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded" data-testid={`text-rtmp-${stream.id}`}>
                                      {stream.streamUrl}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCopyToClipboard(stream.streamUrl!, "RTMP URL")}
                                      data-testid={`button-copy-rtmp-${stream.id}`}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <Label className="text-sm text-muted-foreground">Stream Key</Label>
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded" data-testid={`text-stream-key-${stream.id}`}>
                                      {stream.streamKey}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCopyToClipboard(stream.streamKey!, "Stream Key")}
                                      data-testid={`button-copy-key-${stream.id}`}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>

                                {stream.youtubeBroadcastId && (
                                  <div className="flex items-center justify-between gap-2">
                                    <Label className="text-sm text-muted-foreground">YouTube Link</Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                      data-testid={`link-youtube-${stream.id}`}
                                    >
                                      <a
                                        href={`https://studio.youtube.com/video/${stream.youtubeBroadcastId}/livestreaming`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="w-4 h-4 mr-1" />
                                        Open in YouTube Studio
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No live streams yet. Create your first live stream!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
