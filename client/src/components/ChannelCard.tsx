import { Users, Video, CheckCircle2, XCircle } from "lucide-react";
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
  connected: boolean;
  lastSync?: string;
  onManage?: () => void;
  onDisconnect?: () => void;
}

export default function ChannelCard({
  id,
  name,
  avatar,
  subscribers,
  videoCount,
  connected,
  lastSync,
  onManage,
  onDisconnect,
}: ChannelCardProps) {
  return (
    <Card className="p-6 hover-elevate" data-testid={`card-channel-${id}`}>
      <div className="flex items-start gap-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium truncate" data-testid={`text-channel-name-${id}`}>
                {name}
              </h3>
              {lastSync && (
                <p className="text-sm text-muted-foreground">Last synced {lastSync}</p>
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
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {subscribers}
            </div>
            <div className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              {videoCount} videos
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onManage}
              variant="outline"
              size="sm"
              data-testid={`button-manage-${id}`}
            >
              Manage
            </Button>
            {connected && (
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
