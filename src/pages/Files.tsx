import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Files() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

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

  // Combined filter for name or matric number (order-insensitive for name, ignores spaces for matric)
  const filteredFiles = files.filter((file) => {
    const matric =
      file.matric_number_parsed?.replace(/\s+/g, "").toLowerCase() || "";
    const name = file.students?.student_name?.toLowerCase() || "";
    const searchValue = search.toLowerCase();
    const uploadedDate = file.uploaded_at
      ? new Date(file.uploaded_at).toISOString().slice(0, 10)
      : "";
    if (dateFilter && uploadedDate !== dateFilter) return false;
    if (!searchValue) return true;
    // Matric: ignore spaces
    if (matric.includes(searchValue.replace(/\s+/g, ""))) return true;
    // Name: order-insensitive word match
    const words = searchValue.split(/\s+/).filter(Boolean);
    return words.every((word) => name.includes(word));
  });

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
      <Card className="animate-fade-in shadow-none border-none bg-transparent p-0">
        <CardHeader className="px-2 pt-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <FileText className="h-5 w-5" />
            All Uploaded Files
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pt-0 pb-2">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              placeholder="Filter by name or Student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="max-w-xs"
              title="Filter by uploaded date"
            />
          </div>
          {/* Card grid for mobile only */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No files uploaded yet
              </div>
            ) : (
              filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  className="flex flex-col h-full border p-3 shadow-sm"
                >
                  <CardHeader className="pb-2 px-0 pt-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span
                        className="font-mono text-xs truncate max-w-[160px] font-bold"
                        title={file.original_file_name}
                      >
                        {file.original_file_name}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-2 px-0 pb-0">
                    <div className="text-xs">
                      <span className="font-semibold">Student ID:</span>{" "}
                      {file.matric_number_parsed}
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold">Student:</span>{" "}
                      {file.students?.student_name || "-"}
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold">Status:</span>{" "}
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
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold">Uploaded:</span>{" "}
                      {format(new Date(file.uploaded_at), "PP")}
                    </div>
                  </CardContent>
                  <div className="px-0 pb-0 flex justify-end">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => requestDeleteFile(file)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
          {/* Table for md+ screens only */}
          <div className="w-full overflow-x-auto hidden md:block">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">File Name</TableHead>
                  <TableHead className="whitespace-nowrap">
                    Student ID
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Student</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Uploaded</TableHead>
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredFiles.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No files uploaded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFiles.map((file) => (
                    <TableRow key={file.id} className="break-words">
                      <TableCell className="font-mono text-xs md:text-sm max-w-[120px] truncate whitespace-nowrap">
                        {file.original_file_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs md:text-sm max-w-[100px] truncate whitespace-nowrap">
                        {file.matric_number_parsed}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm max-w-[120px] truncate whitespace-nowrap">
                        {file.students?.student_name || "-"}
                      </TableCell>
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
                      <TableCell className="text-xs md:text-sm whitespace-nowrap">
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
          </div>
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
