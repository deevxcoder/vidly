import { Video, Youtube, Upload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Landing() {
  const features = [
    {
      icon: Video,
      title: "Manage Videos",
      description: "Organize and manage all your video content from one central dashboard",
    },
    {
      icon: Youtube,
      title: "Multi-Channel Publishing",
      description: "Publish videos across multiple YouTube channels simultaneously",
    },
    {
      icon: Upload,
      title: "Easy Uploads",
      description: "Drag and drop video uploads with progress tracking and queue management",
    },
    {
      icon: CheckCircle,
      title: "Status Tracking",
      description: "Monitor publishing status and manage drafts, published, and processing videos",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-6xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <div className="h-16 w-16 bg-primary rounded-lg flex items-center justify-center">
              <Youtube className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-platform-title">
            YouTube Video Management Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-platform-description">
            Streamline your content creation workflow with powerful tools to manage and publish videos across multiple YouTube channels
          </p>
          <div className="pt-4 flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => window.location.href = "/login"}
              data-testid="button-sign-in"
              className="text-lg px-8"
            >
              Sign In
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.href = "/signup"}
              data-testid="button-sign-up"
              className="text-lg px-8"
            >
              Sign Up
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 space-y-3" data-testid={`card-feature-${index}`}>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold" data-testid={`text-feature-title-${index}`}>
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid={`text-feature-description-${index}`}>
                {feature.description}
              </p>
            </Card>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p data-testid="text-footer-info">
            Sign in with your account to access your video management dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
