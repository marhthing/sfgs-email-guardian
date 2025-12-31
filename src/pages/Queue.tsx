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
import { Input } from "@/components/ui/input";

const CLASS_OPTIONS = [
  "JSS1",
  "JSS2",
  "JSS3",
  "SSS1",
  "SSS2A",
  "SSS2B",
  "SSS3A",
  "SSS3B",
];

export default function Queue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emailToCancel, setEmailToCancel] = useState<any>(null);
  const [cronEnabled, setCronEnabled] = useState<boolean | null>(null);
  const [cronLoading, setCronLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const fetchQueue = async () => {
    const { data } = await supabase
      .from("email_queue")
      .select("*, students(student_name, class)")
      .order("prioritized_at", { ascending: false, nullsFirst: true })
      .order("created_at", { ascending: false });
    setQueue(data || []);
    setIsLoading(false);
  };

  // Fetch cron_enabled status
  const fetchCronEnabled = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("cron_enabled")
      .order("updated_at", { ascending: false })
      .limit(1);
    setCronEnabled(data && data.length > 0 ? data[0].cron_enabled : null);
  };

  useEffect(() => {
    fetchQueue();
    fetchCronEnabled();
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
    await supabase
      .from("email_queue")
      .update({ status: "cancelled", failed_at: new Date().toISOString() })
      .eq("id", id);
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

  const handleToggleCron = async () => {
    setCronLoading(true);
    // Get the latest settings row
    const { data: settingsRows, error: fetchError } = await supabase
      .from("system_settings")
      .select("id, cron_enabled")
      .order("updated_at", { ascending: false })
      .limit(1);
    const latestId =
      settingsRows && settingsRows.length > 0 ? settingsRows[0].id : null;
    if (!latestId) {
      toast({ title: "No settings row found" });
      setCronLoading(false);
      return;
    }
    // Update by primary key
    const { error } = await supabase
      .from("system_settings")
      .update({ cron_enabled: !cronEnabled })
      .eq("id", latestId);
    if (!error) {
      setCronEnabled((prev) => !prev);
      toast({ title: `Email sending ${cronEnabled ? "stopped" : "started"}` });
    }
    setCronLoading(false);
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

  // Only show pending emails in the queue
  const pendingQueue = queue.filter((item) => item.status === "pending");
  // Split queue into prioritized and normal (pending only)
  const prioritized = pendingQueue.filter((item) => item.prioritized_at);
  const normal = pendingQueue.filter((item) => !item.prioritized_at);

  // Filter queue by student name or student ID (order-insensitive), type, and class
  const filterWords = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const filteredPrioritized = prioritized.filter((item) => {
    const name = item.students?.student_name?.toLowerCase() || "";
    const matric = item.matric_number?.toLowerCase() || "";
    if (typeFilter && item.email_type !== typeFilter) return false;
    if (classFilter && item.students?.class !== classFilter) return false;
    if (!filterWords.length) return true;
    if (matric.includes(filter.toLowerCase())) return true;
    return filterWords.every((word) => name.includes(word));
  });
  const filteredNormal = normal.filter((item) => {
    const name = item.students?.student_name?.toLowerCase() || "";
    const matric = item.matric_number?.toLowerCase() || "";
    if (typeFilter && item.email_type !== typeFilter) return false;
    if (classFilter && item.students?.class !== classFilter) return false;
    if (!filterWords.length) return true;
    if (matric.includes(filter.toLowerCase())) return true;
    return filterWords.every((word) => name.includes(word));
  });

  return (
    <AdminLayout
      title="Email Queue"
      description="Manage pending and processed emails"
    >
      {/* Filter controls - always visible, not inside Card on mobile */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter by name or Student ID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <label htmlFor="typeFilter" className="sr-only">
          Type
        </label>
        <select
          id="typeFilter"
          title="Type"
          className="border rounded px-2 py-1 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="pdf">PDF</option>
          <option value="birthday">Birthday</option>
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          title="Filter by class"
        >
          <option value="">All Classes</option>
          {CLASS_OPTIONS.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>
        {/* Removed duplicate Start/Stop button for md+ screens */}
      </div>
      {/* Card grid for mobile only (no outer Card) */}
      <div className="md:hidden">
        {/* Start/Stop button for mobile, above the grid */}
        <div className="mb-2 flex justify-end">
          <Button
            size="sm"
            className={
              cronEnabled
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }
            onClick={handleToggleCron}
            disabled={cronLoading}
          >
            {cronEnabled ? "Stop" : "Start"}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : filteredPrioritized.length + filteredNormal.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No emails in queue
            </div>
          ) : (
            [...filteredPrioritized, ...filteredNormal].map((item) => (
              <Card
                key={item.id}
                className={`flex flex-col h-full border p-3 shadow-sm ${
                  item.prioritized_at ? "border-yellow-400" : ""
                }`}
              >
                <CardHeader className="pb-2 px-0 pt-0">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span
                      className="font-bold text-sm truncate max-w-[160px]"
                      title={item.students?.student_name || "-"}
                    >
                      {item.students?.student_name || "-"}
                    </span>
                    {item.prioritized_at && (
                      <Badge className="bg-yellow-400 text-black ml-2">
                        Prioritized
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2 px-0 pb-0">
                  <div className="text-xs">
                    <span className="font-semibold">Student ID:</span>{" "}
                    {item.matric_number}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold">Recipient:</span>{" "}
                    {item.recipient_email}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold">Type:</span>{" "}
                    <Badge variant="outline">{item.email_type}</Badge>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold">Status:</span>{" "}
                    <Badge className={statusColors[item.status]}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold">Created:</span>{" "}
                    {format(new Date(item.created_at), "PPpp")}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold">Class:</span>{" "}
                    {item.students?.class || "-"}
                  </div>
                </CardContent>
                <div className="px-0 pb-0 flex flex-wrap gap-2 justify-end">
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
                        variant={item.prioritized_at ? "default" : "outline"}
                        className={
                          item.prioritized_at ? "bg-yellow-400 text-black" : ""
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
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
      {/* Table for md+ screens only, inside Card */}
      <div className="hidden md:block">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Queue
              <Button
                size="sm"
                className={
                  cronEnabled
                    ? "ml-4 bg-red-600 hover:bg-red-700"
                    : "ml-4 bg-green-600 hover:bg-green-700"
                }
                onClick={handleToggleCron}
                disabled={cronLoading}
              >
                {cronEnabled ? "Stop" : "Start"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Prioritized Emails Table */}
            {filteredPrioritized.length > 0 && (
              <div className="mb-8 border-2 border-yellow-400 rounded-lg">
                <div className="bg-yellow-100 px-4 py-2 rounded-t-lg font-semibold text-yellow-800">
                  Prioritized Emails
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrioritized.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold">
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
                          {format(new Date(item.created_at), "PPpp")}
                        </TableCell>
                        <TableCell>{item.students?.class || "-"}</TableCell>
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
                                  handlePrioritize(
                                    item.id,
                                    !!item.prioritized_at
                                  )
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
                  <TableHead>Student ID</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredNormal.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground"
                    >
                      No emails in queue
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNormal.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">
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
                        {format(new Date(item.created_at), "PPpp")}
                      </TableCell>
                      <TableCell>{item.students?.class || "-"}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Cancel Email?"
        description={
          emailToCancel
            ? `Are you sure you want to cancel the email to '${emailToCancel.recipient_email}'?`
            : ""
        }
        confirmLabel="Cancel"
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
