import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface DashboardStats {
  totalStudents: number;
  emailsSentToday: number;
  emailsPending: number;
  emailsFailed: number;
  lastCronRun: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    emailsSentToday: 0,
    emailsPending: 0,
    emailsFailed: 0,
    lastCronRun: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date().toISOString().split("T")[0];

        const [
          studentsResult,
          sentTodayResult,
          pendingResult,
          failedResult,
          lastCronResult,
        ] = await Promise.all([
          supabase
            .from("students")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("email_queue")
            .select("id", { count: "exact", head: true })
            .eq("status", "sent")
            .gte("sent_at", `${today}T00:00:00`),
          supabase
            .from("email_queue")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("email_queue")
            .select("id", { count: "exact", head: true })
            .eq("status", "failed"),
          (supabase as any)
            .from("cron_log")
            .select("executed_at")
            .order("executed_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        setStats({
          totalStudents: studentsResult.count || 0,
          emailsSentToday: sentTodayResult.count || 0,
          emailsPending: pendingResult.count || 0,
          emailsFailed: failedResult.count || 0,
          lastCronRun: lastCronResult.data?.executed_at || null,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <AdminLayout
      title="Dashboard"
      description="Overview of your email automation system"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Students"
            value={isLoading ? "..." : stats.totalStudents}
            icon={Users}
            variant="info"
          />
          <StatCard
            title="Emails Sent Today"
            value={isLoading ? "..." : stats.emailsSentToday}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Emails Pending"
            value={isLoading ? "..." : stats.emailsPending}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Emails Failed"
            value={isLoading ? "..." : stats.emailsFailed}
            icon={XCircle}
            variant="destructive"
          />
        </div>

        {/* Last Cron Execution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Last Cron Execution
                </p>
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading..."
                    : stats.lastCronRun
                    ? format(new Date(stats.lastCronRun), "PPpp")
                    : "No cron jobs have run yet"}
                </p>
              </div>
              <div
                className={`h-3 w-3 rounded-full ${
                  stats.lastCronRun ? "bg-success" : "bg-muted"
                }`}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
