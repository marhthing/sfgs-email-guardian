import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Mail, RotateCcw, X } from "lucide-react";
import { format } from "date-fns";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function Queue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emailToCancel, setEmailToCancel] = useState<any>(null);

  const fetchQueue = async () => {
    const { data } = await supabase
      .from("email_queue")
      .select("*, students(student_name)")
      .order("prioritized_at", { ascending: false, nullsFirst: true })
      .order("created_at", { ascending: false });
    setQueue(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleRetry = async (id: string) => {
    await supabase
      .from("email_queue")
      .update({ status: "pending", error_message: null })
      .eq("id", id);
    toast({ title: "Email re-queued" });
    fetchQueue();
  };

  const handleCancel = async (id: string) => {
    await supabase.from("email_queue").delete().eq("id", id);
    toast({ title: "Email cancelled" });
    fetchQueue();
  };

  const handlePrioritize = async (id: string, prioritized: boolean) => {
    await supabase
      .from("email_queue")
      .update({ prioritized_at: prioritized ? null : new Date().toISOString() })
      .eq("id", id);
    toast({
      title: prioritized ? "Email un-prioritized" : "Email prioritized",
    });
    fetchQueue();
  };

  function requestCancelEmail(email: any) {
    setEmailToCancel(email);
    setConfirmOpen(true);
  }

  const statusColors: Record<string, string> = {
    pending: "bg-warning",
    processing: "bg-info",
    sent: "bg-success",
    failed: "bg-destructive",
  };

  // Split queue into prioritized and normal
  const prioritized = queue.filter((item) => item.prioritized_at);
  const normal = queue.filter((item) => !item.prioritized_at);

  return (
    <AdminLayout
      title="Email Queue"
      description="Manage pending and processed emails"
    >
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Prioritized Emails Table */}
          {prioritized.length > 0 && (
            <div className="mb-8 border-2 border-yellow-400 rounded-lg">
              <div className="bg-yellow-100 px-4 py-2 rounded-t-lg font-semibold text-yellow-800">
                Prioritized Emails
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Matric</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prioritized.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.students?.student_name || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.matric_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.recipient_email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.email_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[item.status]}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.created_at), "PP")}
                      </TableCell>
                      <TableCell>
                        {item.status === "failed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetry(item.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant={
                                item.prioritized_at ? "default" : "outline"
                              }
                              className={
                                item.prioritized_at
                                  ? "bg-yellow-400 text-black"
                                  : ""
                              }
                              onClick={() =>
                                handlePrioritize(item.id, !!item.prioritized_at)
                              }
                            >
                              {item.prioritized_at
                                ? "Prioritized"
                                : "Prioritize"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => requestCancelEmail(item)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Normal Emails Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Matric</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : normal.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    No emails in queue
                  </TableCell>
                </TableRow>
              ) : (
                normal.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.students?.student_name || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.matric_number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.recipient_email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.email_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[item.status]}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.created_at), "PP")}
                    </TableCell>
                    <TableCell>
                      {item.status === "failed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRetry(item.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {item.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant={
                              item.prioritized_at ? "default" : "outline"
                            }
                            className={
                              item.prioritized_at
                                ? "bg-yellow-400 text-black"
                                : ""
                            }
                            onClick={() =>
                              handlePrioritize(item.id, !!item.prioritized_at)
                            }
                          >
                            {item.prioritized_at ? "Prioritized" : "Prioritize"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => requestCancelEmail(item)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        title="Cancel Email?"
        description={
          emailToCancel
            ? `Are you sure you want to cancel the email to '${emailToCancel.recipient_email}'? This action cannot be undone.`
            : ""
        }
        onConfirm={async () => {
          if (emailToCancel) await handleCancel(emailToCancel.id);
          setConfirmOpen(false);
          setEmailToCancel(null);
        }}
        onCancel={() => {
          setConfirmOpen(false);
          setEmailToCancel(null);
        }}
      />
    </AdminLayout>
  );
}
