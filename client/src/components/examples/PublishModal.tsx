import { useState } from "react";
import PublishModal from "../PublishModal";
import { Button } from "@/components/ui/button";

export default function PublishModalExample() {
  const [open, setOpen] = useState(false);

  const mockVideo = {
    id: "1",
    title: "How to Build a Full-Stack Application with React and Node.js",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop",
  };

  const mockChannels = [
    {
      id: "1",
      name: "Tech Tutorials Pro",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      subscribers: "125K",
    },
    {
      id: "2",
      name: "Code Masters",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop",
      subscribers: "87K",
    },
    {
      id: "3",
      name: "Dev Academy",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
      subscribers: "54K",
    },
  ];

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)} data-testid="button-open-modal">
        Open Publish Modal
      </Button>
      <PublishModal
        open={open}
        onOpenChange={setOpen}
        video={mockVideo}
        channels={mockChannels}
        onPublish={(ids) => console.log("Publishing to:", ids)}
      />
    </div>
  );
}
