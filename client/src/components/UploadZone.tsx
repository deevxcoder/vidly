import { useState, useCallback } from "react";
import { Upload, X, File } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface UploadFile {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: "uploading" | "complete" | "error";
}

export interface UploadZoneProps {
  onFilesSelected?: (files: File[]) => void;
  files?: UploadFile[];
  onCancel?: (id: string) => void;
}

export default function UploadZone({ onFilesSelected, files = [], onCancel }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected?.(droppedFiles);
      console.log("Files dropped:", droppedFiles);
    },
    [onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      onFilesSelected?.(selectedFiles);
      console.log("Files selected:", selectedFiles);
    },
    [onFilesSelected]
  );

  return (
    <div className="space-y-6">
      <Card
        className={`p-12 border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="upload-zone"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Drop your videos here</h3>
            <p className="text-sm text-muted-foreground">
              or click to browse from your computer
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: MP4, MOV, AVI, MKV (Max 2GB)
            </p>
          </div>
          <Button asChild data-testid="button-browse">
            <label htmlFor="file-upload" className="cursor-pointer">
              Browse Files
              <input
                id="file-upload"
                type="file"
                className="hidden"
                multiple
                accept="video/*"
                onChange={handleFileInput}
              />
            </label>
          </Button>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Upload Queue</h3>
          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.id} className="p-4" data-testid={`upload-file-${file.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <File className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid={`text-filename-${file.id}`}>
                          {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{file.size}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onCancel?.(file.id)}
                        data-testid={`button-cancel-${file.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Progress value={file.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {file.status === "uploading" && `${file.progress}% uploaded`}
                        {file.status === "complete" && "Upload complete"}
                        {file.status === "error" && "Upload failed"}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
