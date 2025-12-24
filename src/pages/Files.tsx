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
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function Files() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<any>(null);

  async function fetchFiles() {
    const { data } = await supabase
      .from("uploaded_files")
      .select("*, students(student_name)")
      .order("uploaded_at", { ascending: false });
    setFiles(data || []);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  async function handleDeleteFileConfirmed(file: any) {
    // Find emails in queue referencing this file (by attachments array containing the file's storage_path)
    const { data: emails, error: emailErr } = await supabase
      .from("email_queue")
      .select("id, attachments");
    if (emailErr) {
      toast({ title: "Failed to check email queue", variant: "destructive" });
      return;
    }
    // Find emails where attachments includes the file's storage_path (attachments may be JSON string or array)
    const emailsToDelete = (emails || []).filter((e: any) => {
      if (!e.attachments) return false;
      if (typeof e.attachments === "string") {
        try {
          const arr = JSON.parse(e.attachments);
          return Array.isArray(arr) && arr.includes(file.storage_path);
        } catch {
          return false;
        }
      }
      return (
        Array.isArray(e.attachments) &&
        e.attachments.includes(file.storage_path)
      );
    });
    if (emailsToDelete.length > 0) {
      const ids = emailsToDelete.map((e: any) => e.id);
      await supabase.from("email_queue").delete().in("id", ids);
    }
    // Delete the file record
    const { error } = await supabase
      .from("uploaded_files")
      .delete()
      .eq("id", file.id);
    if (error) {
      toast({ title: "Failed to delete file", variant: "destructive" });
    } else {
      toast({ title: "File deleted" });
      fetchFiles();
    }
  }

  function requestDeleteFile(file: any) {
    setFileToDelete(file);
    setConfirmOpen(true);
  }

  return (
    <AdminLayout
      title="Uploaded Files"
      description="View all uploaded PDF files"
    >
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Uploaded Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Parsed Matric</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
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
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No files uploaded yet
                  </TableCell>
                </TableRow>
              ) : (
                files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-mono text-sm">
                      {file.original_file_name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {file.matric_number_parsed}
                    </TableCell>
                    <TableCell>{file.students?.student_name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          file.status === "matched" ? "default" : "secondary"
                        }
                        className={
                          file.status === "matched" ? "bg-success" : ""
                        }
                      >
                        {file.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(file.uploaded_at), "PP")}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => requestDeleteFile(file)}
                      >
                        Delete
                      </Button>
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
        title="Delete File?"
        description={
          fileToDelete
            ? `Are you sure you want to delete '${fileToDelete.original_file_name}'? This will also remove any queued emails sending this PDF.`
            : ""
        }
        onConfirm={async () => {
          if (fileToDelete) await handleDeleteFileConfirmed(fileToDelete);
          setConfirmOpen(false);
          setFileToDelete(null);
        }}
        onCancel={() => {
          setConfirmOpen(false);
          setFileToDelete(null);
        }}
      />
    </AdminLayout>
  );
}
