import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function SentHistory() {
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("email_queue")
        .select("*, students(student_name)")
        .eq("status", "sent")
        .order("sent_at", { ascending: false });
      setEmails(data || []);
      setIsLoading(false);
    }
    fetch();
  }, []);

  // Filter emails by student name or matric number (order-insensitive)
  const filterWords = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const filteredEmails = emails.filter((item) => {
    const name = item.students?.student_name?.toLowerCase() || "";
    const matric = item.matric_number?.toLowerCase() || "";
    if (!filterWords.length) return true;
    if (matric.includes(filter.toLowerCase())) return true;
    return filterWords.every((word) => name.includes(word));
  });

  return (
    <AdminLayout
      title="Sent History"
      description="View all successfully sent emails"
    >
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Sent Emails
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
                No emails sent yet
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredEmails.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border bg-card p-3 flex flex-col gap-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="bg-success text-white">Sent</Badge>
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
                      <span className="font-semibold">Sent At:</span>{" "}
                      {item.sent_at
                        ? format(new Date(item.sent_at), "PPpp")
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
                  <TableHead>Sent At</TableHead>
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
                      No emails sent yet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmails.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className="bg-success text-white mr-2">
                          Sent
                        </Badge>
                        {item.students?.student_name || "-"}
                      </TableCell>
                      <TableCell>{item.recipient_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.email_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.sent_at
                          ? format(new Date(item.sent_at), "PPpp")
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
