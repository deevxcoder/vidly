import { useState } from "react";
import UploadZone, { UploadFile } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, description, thumbnail, tags }: { file: File; title: string; description: string; thumbnail: File | null; tags: string[] }) => {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title);
      formData.append('description', description);
      if (thumbnail) {
        formData.append('thumbnail', thumbnail);
      }
      formData.append('tags', JSON.stringify(tags));

      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Video Uploaded",
        description: "Your video has been uploaded successfully",
      });
      setLocation('/videos');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    },
  });

  const handleFilesSelected = (newFiles: File[]) => {
    const file = newFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));

    const uploadFile: UploadFile = {
      id: `${Date.now()}`,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      progress: 0,
      status: "pending" as const,
    };

    setFiles([uploadFile]);
  };

  const handleCancel = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    setThumbnail(null);
    setThumbnailPreview("");
    setTags([]);
    setTagInput("");
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview("");
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

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select a video file to upload",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title Required",
        description: "Please enter a title for your video",
      });
      return;
    }

    setFiles(prev => prev.map(f => ({ ...f, status: "uploading" as const, progress: 50 })));
    uploadMutation.mutate({ file: selectedFile, title, description, thumbnail, tags });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Upload Video</h1>
        <p className="text-muted-foreground">
          Upload your videos and manage metadata before publishing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <UploadZone
            files={files}
            onFilesSelected={handleFilesSelected}
            onCancel={handleCancel}
          />
        </div>

        {selectedFile && (
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Video Metadata</h3>
              <form className="space-y-4" onSubmit={handleUpload}>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter video title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter video description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    data-testid="textarea-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail</Label>
                  <div className="space-y-2">
                    {thumbnailPreview ? (
                      <div className="relative">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full h-32 object-cover rounded-md"
                          data-testid="img-thumbnail-preview"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveThumbnail}
                          data-testid="button-remove-thumbnail"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor="thumbnail"
                        className="flex items-center justify-center gap-2 border-2 border-dashed rounded-md p-4 cursor-pointer hover-elevate"
                        data-testid="label-thumbnail-upload"
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-sm text-muted-foreground">Upload thumbnail</span>
                        <Input
                          id="thumbnail"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleThumbnailChange}
                          data-testid="input-thumbnail"
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
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
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={uploadMutation.isPending}
                  data-testid="button-save-metadata"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Video'}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
