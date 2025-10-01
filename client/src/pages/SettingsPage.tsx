import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Key, Youtube, Bell, Save, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";

const credentialsFormSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
});

type CredentialsFormValues = z.infer<typeof credentialsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: credentials, isLoading } = useQuery({
    queryKey: ['/api/youtube/credentials'],
  });

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsFormSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
    },
  });

  useEffect(() => {
    if (credentials?.hasCredentials && credentials.clientId) {
      form.setValue("clientId", credentials.clientId);
    }
  }, [credentials, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: CredentialsFormValues) => {
      return await apiRequest('POST', '/api/youtube/credentials', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/youtube/credentials'] });
      toast({
        title: "Success",
        description: "YouTube API credentials saved successfully",
      });
      form.reset({
        clientId: credentials?.clientId || "",
        clientSecret: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save credentials",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', '/api/youtube/credentials');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/youtube/credentials'] });
      form.reset({ clientId: "", clientSecret: "" });
      toast({
        title: "Success",
        description: "YouTube API credentials deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CredentialsFormValues) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your account and YouTube API settings
        </p>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api" data-testid="tab-api">
            <Key className="w-4 h-4 mr-2" />
            API Configuration
          </TabsTrigger>
          <TabsTrigger value="channels" data-testid="tab-channels">
            <Youtube className="w-4 h-4 mr-2" />
            Channel Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          {isLoading ? (
            <>
              <Card className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-full mb-6" />
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </Card>
            </>
          ) : (
            <>
              {credentials?.hasCredentials && (
                <Card className="p-6 bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Credentials Configured</h3>
                      <p className="text-sm text-muted-foreground">
                        Your YouTube API credentials are set up and ready to use.
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Client ID:</span>{" "}
                          <code className="text-xs bg-muted px-1 rounded">{credentials.clientId}</code>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Client Secret:</span>{" "}
                          <code className="text-xs bg-muted px-1 rounded">{credentials.clientSecretMasked}</code>
                        </div>
                        {credentials.updatedAt && (
                          <div className="text-sm text-muted-foreground">
                            Last updated: {new Date(credentials.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">YouTube OAuth 2.0 Credentials</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Enter your OAuth 2.0 credentials from Google Cloud Console to enable YouTube channel connection and publishing.
                </p>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-client-id"
                              placeholder="Enter your OAuth 2.0 Client ID"
                              disabled={saveMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="clientSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Secret</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-client-secret"
                              type="password"
                              placeholder="Enter your OAuth 2.0 Client Secret"
                              disabled={saveMutation.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            Your secret key from Google Cloud Console
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button 
                        type="submit"
                        disabled={saveMutation.isPending}
                        data-testid="button-save-credentials"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {saveMutation.isPending ? "Saving..." : "Save Credentials"}
                      </Button>
                      
                      {credentials?.hasCredentials && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              type="button"
                              variant="destructive" 
                              disabled={deleteMutation.isPending}
                              data-testid="button-delete-credentials"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {deleteMutation.isPending ? "Deleting..." : "Delete"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete YouTube Credentials?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove your YouTube API credentials. You won't be able to connect channels or publish videos until you add new credentials.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </form>
                </Form>
              </Card>
            </>
          )}

          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="text-orange-900 dark:text-orange-100">Important: Redirect URI Must Match Exactly</AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              If you get a "redirect_uri_mismatch" error, make sure the redirect URI in your Google Cloud Console EXACTLY matches the one below (including https://).
            </AlertDescription>
          </Alert>

          <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-100">Error 403: access_denied? Add Yourself as a Test User!</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-200">
              If you get "Error 403: access_denied" or "app hasn't completed Google verification process", go to Google Cloud Console → OAuth consent screen → Add your email under "Test users", then try connecting again.
            </AlertDescription>
          </Alert>

          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-2">How to Get YouTube API Credentials</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
              <li>Create a new project or select an existing one</li>
              <li>Enable the YouTube Data API v3</li>
              <li>Go to OAuth consent screen → Under "Test users", click "ADD USERS" and add your email address</li>
              <li>Create OAuth 2.0 credentials (Web application)</li>
              <li className="flex flex-col gap-2">
                <span>Add this EXACT redirect URI (click to copy):</span>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-mono text-xs h-auto py-2 px-3"
                  onClick={() => {
                    const redirectUri = `${window.location.origin}/api/youtube/oauth/callback`;
                    navigator.clipboard.writeText(redirectUri);
                    toast({
                      title: "Copied!",
                      description: "Redirect URI copied to clipboard",
                    });
                  }}
                  data-testid="button-copy-redirect-uri"
                >
                  {window.location.origin}/api/youtube/oauth/callback
                </Button>
              </li>
              <li>Copy the Client ID and Client Secret and paste them above</li>
            </ol>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Default Channel Settings</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto-publish to all channels</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically publish videos to all connected channels
                  </p>
                </div>
                <Switch data-testid="switch-auto-publish" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Sync channel data</Label>
                  <p className="text-sm text-muted-foreground">
                    Keep channel statistics and video counts up to date
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-sync" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable scheduling</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow scheduling videos for future publication
                  </p>
                </div>
                <Switch data-testid="switch-scheduling" />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Upload complete</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when video uploads are complete
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-upload-notify" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Publish success</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when videos are successfully published
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-publish-notify" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Upload errors</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when uploads or publishes fail
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-error-notify" />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
