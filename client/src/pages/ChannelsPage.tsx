import { useState } from "react";
import ChannelCard from "@/components/ChannelCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Youtube, 
  Loader2, 
  Grid3x3, 
  List,
  ExternalLink,
  RefreshCw,
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Video,
  Search,
  CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { YoutubeChannel, Video as VideoType } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortField = "name" | "subscribers" | "videos" | "published";
type SortDirection = "asc" | "desc";

export default function ChannelsPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());

  const { data: channels, isLoading } = useQuery<YoutubeChannel[]>({
    queryKey: ['/api/youtube/channels'],
  });

  const { data: videos } = useQuery<VideoType[]>({
    queryKey: ['/api/videos'],
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/youtube/oauth/url', {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get OAuth URL');
      }
      return data;
    },
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message,
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (channelId: string) => {
      return await apiRequest('DELETE', `/api/youtube/channels/${channelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/youtube/channels'] });
      setSelectedChannelIds(new Set());
      toast({
        title: "Channel Disconnected",
        description: "Your YouTube channel has been disconnected successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Disconnection Failed",
        description: error.message,
      });
    },
  });

  const handleConnect = () => {
    connectMutation.mutate();
  };

  const handleDisconnect = (channelId: string) => {
    if (confirm('Are you sure you want to disconnect this channel?')) {
      disconnectMutation.mutate(channelId);
    }
  };

  const handleBulkDisconnect = () => {
    if (selectedChannelIds.size === 0) return;
    if (confirm(`Are you sure you want to disconnect ${selectedChannelIds.size} channel(s)?`)) {
      selectedChannelIds.forEach(id => disconnectMutation.mutate(id));
    }
  };

  const handleManage = (channelId: string) => {
    toast({
      title: "Channel Settings",
      description: "Channel-specific settings will be available in a future update. Use Settings page for general configuration.",
    });
  };

  const handleRefresh = (channelId: string) => {
    queryClient.invalidateQueries({ queryKey: ['/api/youtube/channels'] });
    toast({
      title: "Refreshing Channel",
      description: "Channel data is being refreshed...",
    });
  };

  const toggleChannelSelection = (channelId: string) => {
    const newSelection = new Set(selectedChannelIds);
    if (newSelection.has(channelId)) {
      newSelection.delete(channelId);
    } else {
      newSelection.add(channelId);
    }
    setSelectedChannelIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedChannelIds.size === filteredAndSortedChannels.length) {
      setSelectedChannelIds(new Set());
    } else {
      setSelectedChannelIds(new Set(filteredAndSortedChannels.map(c => c.id)));
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

  const getPublishedVideosCount = (channelId: string) => {
    if (!videos) return 0;
    return videos.filter(video => 
      video.publishedChannels?.includes(channelId)
    ).length;
  };

  const channelsWithStats = (channels || []).map(channel => ({
    ...channel,
    publishedVideosCount: getPublishedVideosCount(channel.id),
    hasActivity: getPublishedVideosCount(channel.id) > 0,
  }));

  let filteredChannels = channelsWithStats;
  if (searchQuery) {
    filteredChannels = filteredChannels.filter(c => 
      c.channelTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const filteredAndSortedChannels = [...filteredChannels].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "name":
        comparison = a.channelTitle.localeCompare(b.channelTitle);
        break;
      case "subscribers":
        comparison = parseInt(a.subscriberCount || '0') - parseInt(b.subscriberCount || '0');
        break;
      case "videos":
        comparison = parseInt(a.videoCount || '0') - parseInt(b.videoCount || '0');
        break;
      case "published":
        comparison = a.publishedVideosCount - b.publishedVideosCount;
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const totalSubscribers = channelsWithStats.reduce((sum, ch) => 
    sum + parseInt(ch.subscriberCount || '0'), 0
  );
  const totalPublished = channelsWithStats.reduce((sum, ch) => 
    sum + ch.publishedVideosCount, 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Connected Channels</h1>
          <p className="text-muted-foreground">
            Manage your YouTube channels and connections
          </p>
        </div>
        <div className="flex items-center gap-2">
          {channels && channels.length > 0 && (
            <>
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
              <div className="h-6 w-px bg-border" />
            </>
          )}
          <Button 
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            data-testid="button-connect-channel"
          >
            {connectMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Connect New Channel
          </Button>
        </div>
      </div>

      {channels && channels.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Youtube className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{channels.length}</div>
                  <div className="text-sm text-muted-foreground">Connected Channels</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-chart-1" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Subscribers</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalPublished}</div>
                  <div className="text-sm text-muted-foreground">Videos Published</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search channels..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
            {selectedChannelIds.size > 0 && viewMode === "list" && (
              <Button
                variant="destructive"
                size="default"
                onClick={handleBulkDisconnect}
                data-testid="button-bulk-disconnect"
              >
                Disconnect ({selectedChannelIds.size})
              </Button>
            )}
          </div>
        </>
      )}

      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Youtube className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">How to Connect a Channel</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Click "Connect New Channel" to authorize Video Manager to access your YouTube
              channels. You'll need to sign in with Google and grant the necessary permissions.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Connect multiple YouTube channels</li>
              <li>Publish videos to all channels at once</li>
              <li>Track performance across all channels</li>
            </ul>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : channels && channels.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAndSortedChannels.map((channel) => (
              <ChannelCard
                key={channel.id}
                id={channel.id}
                name={channel.channelTitle}
                avatar={channel.thumbnailUrl || ''}
                subscribers={channel.subscriberCount || '0'}
                videoCount={parseInt(channel.videoCount || '0')}
                publishedVideosCount={channel.publishedVideosCount}
                connected={channel.isConnected || false}
                channelId={channel.channelId}
                description={channel.channelDescription || undefined}
                hasActivity={channel.hasActivity}
                onManage={() => handleManage(channel.id)}
                onDisconnect={() => handleDisconnect(channel.id)}
                onRefresh={() => handleRefresh(channel.id)}
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
                      checked={selectedChannelIds.size === filteredAndSortedChannels.length && filteredAndSortedChannels.length > 0}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead className="w-[300px]">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center hover-elevate active-elevate-2 -ml-4 pl-4 pr-2 py-1 rounded"
                      data-testid="sort-name"
                    >
                      Channel
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("subscribers")}
                      className="flex items-center hover-elevate active-elevate-2 -ml-4 pl-4 pr-2 py-1 rounded"
                      data-testid="sort-subscribers"
                    >
                      Subscribers
                      <SortIcon field="subscribers" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("videos")}
                      className="flex items-center hover-elevate active-elevate-2 -ml-4 pl-4 pr-2 py-1 rounded"
                      data-testid="sort-videos"
                    >
                      Total Videos
                      <SortIcon field="videos" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("published")}
                      className="flex items-center hover-elevate active-elevate-2 -ml-4 pl-4 pr-2 py-1 rounded"
                      data-testid="sort-published"
                    >
                      Published
                      <SortIcon field="published" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedChannels.map((channel) => {
                  const youtubeUrl = channel.channelId ? `https://youtube.com/channel/${channel.channelId}` : null;
                  
                  return (
                    <TableRow key={channel.id} data-testid={`row-channel-${channel.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedChannelIds.has(channel.id)}
                          onCheckedChange={() => toggleChannelSelection(channel.id)}
                          data-testid={`checkbox-channel-${channel.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={channel.thumbnailUrl || ''} alt={channel.channelTitle} />
                              <AvatarFallback>{channel.channelTitle.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {channel.hasActivity && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-chart-1 rounded-full flex items-center justify-center border-2 border-background">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate" data-testid={`text-channel-name-${channel.id}`}>
                              {channel.channelTitle}
                            </div>
                            {channel.channelDescription && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {channel.channelDescription}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-subscribers-${channel.id}`}>
                        {parseInt(channel.subscriberCount || '0').toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-videos-${channel.id}`}>
                        {parseInt(channel.videoCount || '0').toLocaleString()}
                      </TableCell>
                      <TableCell data-testid={`text-published-${channel.id}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{channel.publishedVideosCount}</span>
                          {channel.hasActivity && (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            channel.isConnected
                              ? "bg-chart-1 text-white"
                              : "bg-muted text-muted-foreground"
                          }
                          data-testid={`badge-status-${channel.id}`}
                        >
                          {channel.isConnected ? "Connected" : "Disconnected"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {youtubeUrl && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(youtubeUrl, '_blank')}
                                  data-testid={`button-view-youtube-${channel.id}`}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View on YouTube</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRefresh(channel.id)}
                                data-testid={`button-refresh-${channel.id}`}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refresh channel data</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleManage(channel.id)}
                                data-testid={`button-manage-${channel.id}`}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Channel settings</TooltipContent>
                          </Tooltip>
                          {channel.isConnected && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDisconnect(channel.id)}
                                  data-testid={`button-disconnect-${channel.id}`}
                                >
                                  <span className="text-xs">✕</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Disconnect channel</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        filteredChannels.length === 0 && searchQuery ? (
          <Card className="p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Channels Found</h3>
            <p className="text-muted-foreground">
              No channels matching "{searchQuery}"
            </p>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <Youtube className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Channels Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your first YouTube channel to start publishing videos
            </p>
            <Button onClick={handleConnect} data-testid="button-connect-first-channel">
              <Plus className="w-4 h-4 mr-2" />
              Connect Your First Channel
            </Button>
          </Card>
        )
      )}
    </div>
  );
}
