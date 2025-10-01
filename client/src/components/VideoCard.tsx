import { Play, MoreVertical, Clock, HardDrive, ImageOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  uploadDate: string;
  fileSize: string;
  status: "published" | "processing" | "failed" | "draft" | "premiere_scheduled";
  publishedChannels?: number;
  onPublish?: () => void;
  onPremiere?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusConfig = {
  published: { label: "Published", className: "bg-chart-1 text-white" },
  processing: { label: "Processing", className: "bg-chart-2 text-white" },
  failed: { label: "Failed", className: "bg-destructive text-destructive-foreground" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  premiere_scheduled: { label: "Premiere Scheduled", className: "bg-chart-3 text-white" },
};

export default function VideoCard({
  id,
  title,
  thumbnail,
  duration,
  uploadDate,
  fileSize,
  status,
  publishedChannels = 0,
  onPublish,
  onPremiere,
  onEdit,
  onDelete,
}: VideoCardProps) {
  const [imageError, setImageError] = useState(false);
  const statusInfo = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  
  return (
    <Card className="overflow-hidden hover-elevate group" data-testid={`card-video-${id}`}>
      <div className="relative aspect-video bg-muted overflow-hidden">
        {imageError || !thumbnail ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ImageOff className="w-12 h-12 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            data-testid={`img-thumbnail-${id}`}
          />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-6 h-6 text-primary-foreground fill-current" />
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <Badge className={statusInfo.className} data-testid={`badge-status-${id}`}>
            {statusInfo.label}
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {duration}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-medium line-clamp-2 flex-1" data-testid={`text-title-${id}`}>
            {title}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" data-testid={`button-menu-${id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPublish} data-testid={`button-publish-${id}`}>
                Publish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPremiere} data-testid={`button-premiere-${id}`}>
                Schedule Premiere
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} data-testid={`button-edit-${id}`}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} data-testid={`button-delete-${id}`}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {uploadDate}
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-4 h-4" />
            {fileSize}
          </div>
        </div>
        {publishedChannels > 0 && (
          <div className="text-sm text-muted-foreground">
            Published to {publishedChannels} channel{publishedChannels !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </Card>
  );
}
