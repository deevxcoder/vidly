import { useState } from "react";
import { CheckCircle2, Youtube, Clock, Globe, Lock, Eye } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
}

export interface PublishOptions {
  channelIds: string[];
  privacyStatus: 'public' | 'unlisted' | 'private';
  scheduledTime?: string;
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
  onPublish?: (options: PublishOptions) => void;
}

export default function PublishModal({
  open,
  onOpenChange,
  video,
  channels,
  onPublish,
}: PublishModalProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [privacyStatus, setPrivacyStatus] = useState<'public' | 'unlisted' | 'private'>('public');
  const [enableScheduling, setEnableScheduling] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

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
    const publishOptions: PublishOptions = {
      channelIds: selectedChannels,
      privacyStatus,
      scheduledTime: enableScheduling && scheduledTime ? scheduledTime : undefined,
    };
    onPublish?.(publishOptions);
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
            <div>
              <Label className="text-base font-semibold mb-3 block">Privacy Settings</Label>
              <RadioGroup value={privacyStatus} onValueChange={(value: any) => !enableScheduling && setPrivacyStatus(value)} disabled={enableScheduling}>
                <div className={`flex items-center space-x-2 p-3 rounded-lg ${!enableScheduling ? 'hover-elevate cursor-pointer' : 'opacity-50 cursor-not-allowed'}`} onClick={() => !enableScheduling && setPrivacyStatus('public')} data-testid="radio-privacy-public">
                  <RadioGroupItem value="public" id="public" disabled={enableScheduling} data-testid="radio-item-public" />
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="public" className={`font-medium ${!enableScheduling ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Public</Label>
                    <p className="text-sm text-muted-foreground">Anyone can search for and view</p>
                  </div>
                </div>
                <div className={`flex items-center space-x-2 p-3 rounded-lg ${!enableScheduling ? 'hover-elevate cursor-pointer' : 'opacity-50 cursor-not-allowed'}`} onClick={() => !enableScheduling && setPrivacyStatus('unlisted')} data-testid="radio-privacy-unlisted">
                  <RadioGroupItem value="unlisted" id="unlisted" disabled={enableScheduling} data-testid="radio-item-unlisted" />
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="unlisted" className={`font-medium ${!enableScheduling ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Unlisted</Label>
                    <p className="text-sm text-muted-foreground">Anyone with the link can view</p>
                  </div>
                </div>
                <div className={`flex items-center space-x-2 p-3 rounded-lg ${!enableScheduling ? 'hover-elevate cursor-pointer' : 'opacity-50 cursor-not-allowed'}`} onClick={() => !enableScheduling && setPrivacyStatus('private')} data-testid="radio-privacy-private">
                  <RadioGroupItem value="private" id="private" disabled={enableScheduling} data-testid="radio-item-private" />
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="private" className={`font-medium ${!enableScheduling ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Private</Label>
                    <p className="text-sm text-muted-foreground">Only you can view</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule"
                  checked={enableScheduling}
                  onCheckedChange={(checked) => {
                    setEnableScheduling(!!checked);
                    if (checked) {
                      setPrivacyStatus('private');
                    }
                  }}
                  data-testid="checkbox-enable-scheduling"
                />
                <Label htmlFor="schedule" className="font-medium cursor-pointer">
                  Schedule for later
                </Label>
              </div>
              
              {enableScheduling && (
                <div className="space-y-2 pl-6">
                  <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Note: YouTube requires scheduled videos to be Private initially. The video will be published at your scheduled time.
                  </div>
                  <Label htmlFor="scheduled-time" className="text-sm">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Publish Date & Time
                  </Label>
                  <Input
                    id="scheduled-time"
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    data-testid="input-scheduled-time"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Video will be published at the scheduled time
                  </p>
                </div>
              )}
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
            disabled={selectedChannels.length === 0 || (enableScheduling && !scheduledTime)}
            data-testid="button-confirm-publish"
          >
            {enableScheduling ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Schedule for {selectedChannels.length} Channel{selectedChannels.length !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                <Youtube className="w-4 h-4 mr-2" />
                Publish to {selectedChannels.length} Channel{selectedChannels.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
