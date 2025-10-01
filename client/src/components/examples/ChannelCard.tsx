import ChannelCard from "../ChannelCard";

export default function ChannelCardExample() {
  return (
    <div className="p-6 max-w-2xl">
      <ChannelCard
        id="1"
        name="Tech Tutorials Pro"
        avatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
        subscribers="125K"
        videoCount={342}
        connected={true}
        lastSync="2 hours ago"
        onManage={() => console.log("Manage clicked")}
        onDisconnect={() => console.log("Disconnect clicked")}
      />
    </div>
  );
}
