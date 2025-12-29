import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Save,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState({
    daily_email_limit: 100,
    sender_email: "",
    email_interval_minutes: 5,
    email_batch_size: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data)
        setSettings({
          daily_email_limit: data.daily_email_limit,
          sender_email: data.sender_email,
          email_interval_minutes: data.email_interval_minutes,
          email_batch_size: (data as any).email_batch_size ?? 10,
        });
      setIsLoading(false);
    }
    fetch();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .update({
        daily_email_limit: settings.daily_email_limit,
        email_interval_minutes: settings.email_interval_minutes,
        email_batch_size: settings.email_batch_size,
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      toast({ title: "Error saving settings", variant: "destructive" });
    } else {
      toast({ title: "Settings saved successfully" });
    }
    setIsSaving(false);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail)
      return toast({
        title: "Please enter an email address",
        variant: "destructive",
      });
    setTestLoading(true);
    // Call your backend API to send a test email
    const res = await fetch("/api/send-email.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: testEmail,
        subject: "Test Test",
        text: "just Testing",
      }),
    });
    if (res.ok) {
      toast({ title: "Test email sent!" });
    } else {
      toast({ title: "Failed to send test email", variant: "destructive" });
    }
    setTestLoading(false);
  };

  // Google Sheets Sync
  const handleSyncStudents = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch("/api/sync-students.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `Imported ${data.count} students from Google Sheets!` });
      } else {
        toast({ title: data.error || "Sync failed", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Sync failed", variant: "destructive" });
    }
    setSyncLoading(false);
  };

  if (isLoading)
    return (
      <AdminLayout title="Settings">
        <div>Loading...</div>
      </AdminLayout>
    );

  return (
    <AdminLayout
      title="Settings"
      description="Configure email automation settings"
    >
      <Card className="animate-fade-in max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>
            Configure your email automation parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Sheets Sync Section - now at the very top */}
          <div className="pb-8 mb-8 border-b">
            <Label>Sync Students from Google Sheets</Label>
            <div className="flex gap-2 mt-2">
              <Button onClick={handleSyncStudents} disabled={syncLoading}>
                {syncLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Imports or updates all students from the configured Google Sheet.
            </p>
          </div>
          {/* System Settings Section follows */}
          <div className="space-y-2">
            <Label>Sender Email (Read-only)</Label>
            <Input value={settings.sender_email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily_email_limit">Daily Email Limit</Label>
            <Input
              id="daily_email_limit"
              type="number"
              value={settings.daily_email_limit}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  daily_email_limit: parseInt(e.target.value) || 0,
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of emails that can be sent per day
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_batch_size">
              Emails Per Cron Job (Batch Size)
            </Label>
            <Input
              id="email_batch_size"
              type="number"
              value={settings.email_batch_size}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_batch_size: parseInt(e.target.value) || 1,
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              Number of emails to send each time the cron job runs
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_interval_minutes">
              Email Interval (minutes)
            </Label>
            <Input
              id="email_interval_minutes"
              type="number"
              value={settings.email_interval_minutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_interval_minutes: parseInt(e.target.value) || 1,
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              How often the cron job runs to check for pending emails
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
          {/* Test Email Section */}
          <div className="pt-8 mt-8 border-t">
            <Label htmlFor="test_email">Send Test Email</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="test_email"
                type="email"
                placeholder="Enter email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="max-w-xs"
              />
              <Button
                onClick={handleSendTestEmail}
                disabled={testLoading || !testEmail}
              >
                {testLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Sends a test email to the address above.
            </p>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
