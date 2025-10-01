import { Users, Video, CheckCircle2, XCircle, ExternalLink, RefreshCw, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ChannelCardProps {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
  videoCount: number;
  publishedVideosCount?: number;
  connected: boolean;
  lastSync?: string;
  channelId?: string;
  description?: string;
  onManage?: () => void;
  onDisconnect?: () => void;
  onRefresh?: () => void;
}

export default function ChannelCard({
  id,
  name,
  avatar,
  subscribers,
  videoCount,
  publishedVideosCount = 0,
  connected,
  lastSync,
  channelId,
  description,
  onManage,
  onDisconnect,
  onRefresh,
}: ChannelCardProps) {
  const youtubeUrl = channelId ? `https://youtube.com/channel/${channelId}` : null;

  return (
    <Card className="p-6 hover-elevate" data-testid={`card-channel-${id}`}>
      <div className="flex items-start gap-4">
        <Avatar className="w-20 h-20">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate mb-1" data-testid={`text-channel-name-${id}`}>
                {name}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {description}
                </p>
              )}
            </div>
            <Badge
              className={
                connected
                  ? "bg-chart-1 text-white"
                  : "bg-muted text-muted-foreground"
              }
              data-testid={`badge-status-${id}`}
            >
              {connected ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{subscribers}</div>
                <div className="text-xs text-muted-foreground">Subscribers</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Video className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{videoCount}</div>
                <div className="text-xs text-muted-foreground">Total Videos</div>
              </div>
            </div>
          </div>

          {publishedVideosCount > 0 && (
            <div className="text-sm text-muted-foreground mb-3">
              <span className="font-medium text-foreground">{publishedVideosCount}</span> video{publishedVideosCount !== 1 ? 's' : ''} published from this app
            </div>
          )}

          {lastSync && (
            <div className="text-xs text-muted-foreground mb-3">
              Last synced {lastSync}
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            {youtubeUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(youtubeUrl, '_blank')}
                data-testid={`button-view-youtube-${id}`}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View on YouTube
              </Button>
            )}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                data-testid={`button-refresh-${id}`}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            )}
            {onManage && (
              <Button
                onClick={onManage}
                variant="ghost"
                size="sm"
                data-testid={`button-manage-${id}`}
              >
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
            )}
            {connected && onDisconnect && (
              <Button
                onClick={onDisconnect}
                variant="ghost"
                size="sm"
                data-testid={`button-disconnect-${id}`}
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
