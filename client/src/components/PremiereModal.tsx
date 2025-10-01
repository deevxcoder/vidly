import { useState } from "react";
import { Calendar, Youtube } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
}

export interface PremiereModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    title: string;
    thumbnail: string;
  };
  channels: Channel[];
  onSchedule?: (channelId: string, scheduledTime: string) => void;
}

export default function PremiereModal({
  open,
  onOpenChange,
  video,
  channels,
  onSchedule,
}: PremiereModalProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");

  const handleSchedule = () => {
    if (selectedChannel && scheduledTime) {
      onSchedule?.(selectedChannel, scheduledTime);
      onOpenChange(false);
      setSelectedChannel("");
      setScheduledTime("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="modal-premiere">
        <DialogHeader>
          <DialogTitle>Schedule Premiere</DialogTitle>
          <DialogDescription>
            Schedule your video to premiere on YouTube at a specific date and time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-4 p-4 bg-muted rounded-lg">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-32 h-18 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-2">{video.title}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Select Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger id="channel" data-testid="select-premiere-channel">
                  <SelectValue placeholder="Choose a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id} data-testid={`select-item-channel-${channel.id}`}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={channel.avatar} alt={channel.name} />
                          <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {channel.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled-time">Premiere Date & Time</Label>
              <Input
                id="scheduled-time"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                data-testid="input-premiere-time"
              />
              <p className="text-sm text-muted-foreground">
                Note: Premieres will be private until they start
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!selectedChannel || !scheduledTime}
            data-testid="button-confirm-premiere"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Premiere
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
