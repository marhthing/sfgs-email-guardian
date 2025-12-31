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

export default function CancelledEmails() {
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const { toast } = useToast();

  const fetch = async () => {
    const { data } = await supabase
      .from("email_queue")
      .select("*, students(student_name, class), failed_at")
      .eq("status", "cancelled")
      .order("failed_at", { ascending: false })
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
      .update({
        status: "pending",
        error_message: null,
        failed_at: null,
        created_at: new Date().toISOString(),
      })
      .eq("id", id);
    toast({ title: "Email re-queued for retry" });
    fetch();
  };

  const filteredEmails = emails.filter((item) => {
    if (classFilter && item.students?.class !== classFilter) return false;
    return (
      item.students?.student_name
        ?.toLowerCase()
        .includes(filter.toLowerCase()) ||
      item.recipient_email?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  return (
    <AdminLayout
      title="Cancelled Emails"
      description="View all cancelled emails"
    >
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            Cancelled Emails
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
          </div>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Cancelled At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredEmails.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No cancelled emails
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmails.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className="bg-muted text-white mr-2">
                          Cancelled
                        </Badge>
                        {item.students?.student_name || "-"}
                      </TableCell>
                      <TableCell>{item.recipient_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.email_type}</Badge>
                      </TableCell>
                      <TableCell>{item.students?.class || "-"}</TableCell>
                      <TableCell>
                        {item.failed_at || item.created_at
                          ? format(
                              new Date(item.failed_at || item.created_at),
                              "PPpp"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRetry(item.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
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
