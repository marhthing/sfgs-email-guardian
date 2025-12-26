import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { XCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";

export default function FailedEmails() {
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

  const fetch = async () => {
    const { data } = await supabase
      .from("email_queue")
      .select("*, students(student_name)")
      .eq("status", "failed")
      .order("created_at", { ascending: false });
    setEmails(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleRetry = async (id: string) => {
    await supabase
      .from("email_queue")
      .update({ status: "pending", error_message: null })
      .eq("id", id);
    toast({ title: "Email re-queued for retry" });
    fetch();
  };

  const filteredEmails = emails.filter(
    (email) =>
      email.students?.student_name
        ?.toLowerCase()
        .includes(filter.toLowerCase()) ||
      email.recipient_email?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <AdminLayout
      title="Failed Emails"
      description="View and retry failed email deliveries"
    >
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Failed Emails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Input
              placeholder="Filter by name or Student ID..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>
          {/* Card grid for mobile, table for desktop */}
          <div className="block md:hidden">
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No failed emails
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredEmails.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border bg-card p-3 flex flex-col gap-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="bg-destructive text-white">
                        Failed
                      </Badge>
                      <span
                        className="font-bold text-sm truncate"
                        title={item.students?.student_name || "-"}
                      >
                        {item.students?.student_name || "-"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground break-all">
                      <span className="font-semibold">Recipient:</span>{" "}
                      {item.recipient_email}
                    </div>
                    <div className="text-xs">
                      <Badge variant="outline">{item.email_type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold">Failed At:</span>{" "}
                      {item.failed_at
                        ? format(new Date(item.failed_at), "PPpp")
                        : "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="w-full overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Failed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredEmails.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No failed emails
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmails.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className="bg-destructive text-white mr-2">
                          Failed
                        </Badge>
                        {item.students?.student_name || "-"}
                      </TableCell>
                      <TableCell>{item.recipient_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.email_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.failed_at
                          ? format(new Date(item.failed_at), "PPpp")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
