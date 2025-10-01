import { useState } from "react";
import { CheckCircle2, Youtube } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
}

export interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    title: string;
    thumbnail: string;
  };
  channels: Channel[];
  onPublish?: (channelIds: string[]) => void;
}

export default function PublishModal({
  open,
  onOpenChange,
  video,
  channels,
  onPublish,
}: PublishModalProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const selectAll = () => {
    setSelectedChannels(channels.map((c) => c.id));
  };

  const deselectAll = () => {
    setSelectedChannels([]);
  };

  const handlePublish = () => {
    onPublish?.(selectedChannels);
    console.log("Publishing to channels:", selectedChannels);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="modal-publish">
        <DialogHeader>
          <DialogTitle>Publish Video</DialogTitle>
          <DialogDescription>
            Select the channels where you want to publish this video
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
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Select Channels ({selectedChannels.length}/{channels.length})
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  data-testid="button-select-all"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  data-testid="button-deselect-all"
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer"
                    onClick={() => toggleChannel(channel.id)}
                    data-testid={`channel-option-${channel.id}`}
                  >
                    <Checkbox
                      checked={selectedChannels.includes(channel.id)}
                      onCheckedChange={() => toggleChannel(channel.id)}
                      data-testid={`checkbox-channel-${channel.id}`}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={channel.avatar} alt={channel.name} />
                      <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{channel.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {channel.subscribers} subscribers
                      </p>
                    </div>
                    {selectedChannels.includes(channel.id) && (
                      <CheckCircle2 className="w-5 h-5 text-chart-1 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={selectedChannels.length === 0}
            data-testid="button-confirm-publish"
          >
            <Youtube className="w-4 h-4 mr-2" />
            Publish to {selectedChannels.length} Channel{selectedChannels.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
