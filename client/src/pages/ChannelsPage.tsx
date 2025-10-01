import ChannelCard from "@/components/ChannelCard";
import { Button } from "@/components/ui/button";
import { Plus, Youtube, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { YoutubeChannel } from "@shared/schema";

export default function ChannelsPage() {
  const { toast } = useToast();

  const { data: channels, isLoading } = useQuery<YoutubeChannel[]>({
    queryKey: ['/api/youtube/channels'],
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

  const handleManage = (channelId: string) => {
    toast({
      title: "Channel Settings",
      description: "Channel-specific settings will be available in a future update. Use Settings page for general configuration.",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Connected Channels</h1>
          <p className="text-muted-foreground">
            Manage your YouTube channels and connections
          </p>
        </div>
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
              <li>Manage channel-specific settings</li>
            </ul>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : channels && channels.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              id={channel.id}
              name={channel.channelTitle}
              avatar={channel.thumbnailUrl || ''}
              subscribers={channel.subscriberCount || '0'}
              videoCount={parseInt(channel.videoCount || '0')}
              connected={channel.isConnected || false}
              onManage={() => handleManage(channel.id)}
              onDisconnect={() => handleDisconnect(channel.id)}
            />
          ))}
        </div>
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
      )}
    </div>
  );
}
