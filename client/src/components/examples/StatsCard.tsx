import StatsCard from "../StatsCard";
import { Video, Upload, Youtube, CheckCircle } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Videos"
        value={48}
        icon={Video}
        description="In your library"
        trend={{ value: "12% from last month", isPositive: true }}
      />
      <StatsCard
        title="Published"
        value={32}
        icon={CheckCircle}
        description="Across all channels"
      />
      <StatsCard
        title="Pending"
        value={8}
        icon={Upload}
        description="Ready to publish"
      />
      <StatsCard
        title="Connected Channels"
        value={4}
        icon={Youtube}
        description="Active connections"
      />
    </div>
  );
}
