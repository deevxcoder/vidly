import VideoCard from "../VideoCard";

export default function VideoCardExample() {
  return (
    <div className="p-6 max-w-sm">
      <VideoCard
        id="1"
        title="How to Build a Full-Stack Application with React and Node.js"
        thumbnail="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop"
        duration="12:34"
        uploadDate="2 days ago"
        fileSize="245 MB"
        status="published"
        publishedChannels={3}
        onPublish={() => console.log("Publish clicked")}
        onEdit={() => console.log("Edit clicked")}
        onDelete={() => console.log("Delete clicked")}
      />
    </div>
  );
}
