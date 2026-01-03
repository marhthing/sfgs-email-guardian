import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

interface Student {
  id: string;
  student_name: string;
  matric_number: string;
  date_of_birth: string;
  parent_email_1: string | null;
  parent_email_2: string | null;
  class: string; // Add class field
  archived?: boolean; // Add archived field
}

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

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<Partial<Student & { archived?: boolean }>>(
    {}
  );
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    from: import.meta.env.VITE_SMTP_USER || "",
    subject: "",
    message: "",
    attachments: [] as File[],
  });
  const [emailingStudent, setEmailingStudent] = useState<Student | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [classFilter, setClassFilter] = useState("");
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionStudent, setActionStudent] = useState<Student | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalCount, setTotalCount] = useState(0);

  const fetchStudents = async () => {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    // Use explicit column list to avoid deep type instantiation
    const { data, count } = await supabase
      .from("students")
      .select(
        "id, student_name, matric_number, date_of_birth, parent_email_1, parent_email_2, class, archived",
        { count: "exact" }
      )
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .range(from, to);
    setStudents(
      (data || []).map(
        (s: Omit<Student, "class"> & { class: string | null }) => ({
          ...s,
          class: s.class || "",
        })
      )
    );
    setTotalCount(count || 0);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line
  }, [page]);

  const openAddModal = () => {
    setEditingStudent(null);
    setForm({});
    setShowModal(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setForm(student);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setForm({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (
      !form.student_name ||
      !form.matric_number ||
      !form.date_of_birth ||
      !form.class
    ) {
      toast({
        title: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    if (editingStudent) {
      // Update
      const { error } = await supabase
        .from("students")
        .update(form)
        .eq("id", editingStudent.id);
      if (error) {
        toast({ title: "Failed to update student", variant: "destructive" });
      } else {
        toast({ title: "Student updated" });
        fetchStudents();
        closeModal();
      }
    } else {
      // Add
      // Only send required fields for insert
      const { error } = await supabase.from("students").insert({
        student_name: form.student_name!,
        matric_number: form.matric_number!,
        date_of_birth: form.date_of_birth!,
        parent_email_1: form.parent_email_1 || null,
        parent_email_2: form.parent_email_2 || null,
        class: form.class!,
        archived: false,
      });
      if (error) {
        toast({ title: "Failed to add student", variant: "destructive" });
      } else {
        toast({ title: "Student added" });
        fetchStudents();
        closeModal();
      }
    }
  };

  const handleDelete = async (student: Student) => {
    setStudentToDelete(student);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    setShowDeleteDialog(false);
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentToDelete.id);
    if (error) {
      toast({ title: "Failed to delete student", variant: "destructive" });
    } else {
      toast({ title: "Student deleted" });
      fetchStudents();
    }
    setStudentToDelete(null);
  };

  const openEmailModal = (student: Student) => {
    let to = "";
    if (student.parent_email_1 && student.parent_email_2) {
      to = `${student.parent_email_1},${student.parent_email_2}`;
    } else if (student.parent_email_1) {
      to = student.parent_email_1;
    } else if (student.parent_email_2) {
      to = student.parent_email_2;
    }
    setEmailForm({
      to,
      from: import.meta.env.VITE_SMTP_USER || "",
      subject: `SURE FOUNDATION MONTHLY FEEDBACK FOR ${student.student_name.toUpperCase()}`,
      message: "",
      attachments: [],
    });
    setEmailingStudent(student);
    setShowEmailModal(true);
  };

  const handleEmailFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEmailForm({ ...emailForm, [e.target.name]: e.target.value });
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEmailForm({ ...emailForm, attachments: Array.from(e.target.files) });
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    const attachmentPaths: string[] = [];
    // Upload attachments to Supabase Storage if any
    if (emailForm.attachments.length > 0) {
      for (const file of emailForm.attachments) {
        const storagePath = `attachments/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("pdfs")
          .upload(storagePath, file);
        if (error) {
          toast({
            title: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
          setIsSending(false);
          return;
        }
        attachmentPaths.push(storagePath);
        // Save file record in uploaded_files table
        await supabase.from("uploaded_files").insert({
          original_file_name: `${emailingStudent?.student_name}.${new Date()
            .toISOString()
            .replace(/[:.]/g, "-")}`,
          matric_number_raw: emailingStudent?.matric_number || "",
          matric_number_parsed: emailingStudent?.matric_number || "",
          student_id: emailingStudent?.id || null,
          status: "matched",
          storage_path: storagePath,
          uploaded_at: new Date().toISOString(),
        });
      }
    }
    // Only queue the email, do not send immediately
    try {
      const now = new Date().toISOString();
      const recipients = emailForm.to
        ? emailForm.to
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean)
        : [];
      let allSuccess = true;
      for (const recipient of recipients) {
        // Always explicitly set subject and message
        const subject =
          emailForm.subject && emailForm.subject.trim() !== ""
            ? emailForm.subject
            : "No subject";
        const message =
          emailForm.message && emailForm.message.trim() !== ""
            ? emailForm.message
            : "(No message)";
        const insertObj = {
          student_id: emailingStudent?.id || null,
          matric_number: emailingStudent?.matric_number || "",
          recipient_email: recipient,
          status: "pending" as const,
          sent_at: null,
          email_type: "pdf" as const,
          subject,
          message,
          attachments:
            attachmentPaths.length > 0 ? JSON.stringify(attachmentPaths) : null,
        };
        const { error } = await supabase.from("email_queue").insert(insertObj);
        if (error) allSuccess = false;
      }
      if (allSuccess) {
        toast({ title: "Email queued!" });
        setShowEmailModal(false);
      } else {
        toast({
          title: "Failed to queue email",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Failed to queue email", variant: "destructive" });
    }
    setIsSending(false);
  };

  // Archive logic
  const handleArchive = async (student: Student) => {
    const { error } = await supabase
      .from("students")
      .update({ archived: true })
      .eq("id", student.id);
    if (error) {
      toast({ title: "Failed to archive student", variant: "destructive" });
    } else {
      toast({ title: "Student archived" });
      fetchStudents();
    }
  };

  // Open action modal
  const openActionModal = (student: Student) => {
    setActionStudent(student);
    setShowActionModal(true);
  };
  const closeActionModal = () => {
    setShowActionModal(false);
    setActionStudent(null);
  };

  // Combined filter for name, student ID, and class
  const filteredStudents = students.filter((student) => {
    const name = student.student_name.toLowerCase();
    const studentId = student.matric_number.replace(/\s+/g, "").toLowerCase();
    const searchValue = search.toLowerCase();
    if (classFilter && student.class !== classFilter) return false;
    if (!searchValue) return true;
    // Student ID: ignore spaces
    if (studentId.includes(searchValue.replace(/\s+/g, ""))) return true;
    // Name: order-insensitive word match
    const words = searchValue.split(/\s+/).filter(Boolean);
    return words.every((word) => name.includes(word));
  });

  return (
    <AdminLayout title="Students" description="Manage student records">
      <ConfirmDialog
        open={showDeleteDialog}
        title={
          studentToDelete
            ? `Delete student ${studentToDelete.student_name}?`
            : "Delete student?"
        }
        description="This action cannot be undone. The student and all related data will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setStudentToDelete(null);
        }}
      />
      {/* Filter/search input always visible */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter by name or Student ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        {/* Add Student button for mobile */}
        <div className="md:hidden ml-auto">
          <Button onClick={openAddModal}>Add Student</Button>
        </div>
      </div>
      {/* Card grid for mobile only (no outer Card) */}
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-3">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No students found
            </div>
          ) : (
            filteredStudents.map((student) => (
              <Card
                key={student.id}
                className="flex flex-col h-full border p-3 shadow-sm"
              >
                <CardHeader className="pb-2 px-0 pt-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-sm truncate max-w-[160px]"
                      title={student.student_name}
                    >
                      Name: {student.student_name}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2 px-0 pb-0">
                  <div className="text-xs">
                    <span className="font-semibold">Student ID:</span>{" "}
                    {student.matric_number}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold">DOB:</span>{" "}
                    {student.date_of_birth}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold">Parent Email 1:</span>{" "}
                    {student.parent_email_1 || "-"}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold">Parent Email 2:</span>{" "}
                    {student.parent_email_2 || "-"}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold">Class:</span>{" "}
                    {student.class || "-"}
                  </div>
                </CardContent>
                <div className="px-0 pb-0 flex flex-wrap gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openActionModal(student)}
                  >
                    Action
                  </Button>
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
            <CardTitle className="flex items-center gap-2 justify-between">
              <span>Student List</span>
              <Button onClick={openAddModal}>Add Student</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Parent Email 1</TableHead>
                  <TableHead>Parent Email 2</TableHead>
                  <TableHead>Class</TableHead>
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
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-bold">
                        {student.student_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {student.matric_number}
                      </TableCell>
                      <TableCell>{student.date_of_birth}</TableCell>
                      <TableCell>{student.parent_email_1 || "-"}</TableCell>
                      <TableCell>{student.parent_email_2 || "-"}</TableCell>
                      <TableCell>{student.class || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionModal(student)}
                        >
                          Action
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex justify-center mt-4">
              {totalCount > pageSize && (
                <Pagination>
                  <PaginationPrevious
                    onClick={
                      page === 1
                        ? undefined
                        : () => setPage((p) => Math.max(1, p - 1))
                    }
                    aria-disabled={page === 1}
                    tabIndex={page === 1 ? -1 : 0}
                    className={
                      page === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                  <span className="px-4 py-2 text-sm flex items-center">
                    Page {page} of{" "}
                    {Math.max(1, Math.ceil(totalCount / pageSize))}
                  </span>
                  <PaginationNext
                    onClick={
                      page * pageSize >= totalCount
                        ? undefined
                        : () => setPage((p) => p + 1)
                    }
                    aria-disabled={page * pageSize >= totalCount}
                    tabIndex={page * pageSize >= totalCount ? -1 : 0}
                    className={
                      page * pageSize >= totalCount
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </Pagination>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? "Edit Student" : "Add Student"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                name="student_name"
                value={form.student_name || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label>Student ID</Label>
              <Input
                name="matric_number"
                value={form.matric_number || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                name="date_of_birth"
                type="date"
                value={form.date_of_birth || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label>Parent Email 1</Label>
              <Input
                name="parent_email_1"
                value={form.parent_email_1 || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Parent Email 2</Label>
              <Input
                name="parent_email_2"
                value={form.parent_email_2 || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Class</Label>
              <select
                name="class"
                value={form.class || ""}
                onChange={(e) => setForm({ ...form, class: e.target.value })}
                required
                className="border rounded px-2 py-1 w-full"
                title="Student class"
              >
                <option value="">Select class...</option>
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={handleSave}>
              {editingStudent ? "Update" : "Add"}
            </Button>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to Parent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sender Email</Label>
              <Input name="from" value={emailForm.from} disabled />
            </div>
            <div>
              <Label>Receiver Email(s)</Label>
              <Input name="to" value={emailForm.to} disabled />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                name="subject"
                value={emailForm.subject}
                onChange={handleEmailFormChange}
              />
            </div>
            {/* <div>
              <Label>Message</Label>
              <Textarea
                name="message"
                value={emailForm.message}
                onChange={handleEmailFormChange}
                rows={5}
              />
            </div> */}
            <div>
              <Label>Attachments</Label>
              <Input
                type="file"
                multiple
                onChange={handleAttachmentChange}
                className="bg-gray-400 text-gray-500"
              />
              {emailForm.attachments.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected files:{" "}
                  {emailForm.attachments.map((f) => f.name).join(", ")}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={handleSendEmail} disabled={isSending}>
              {isSending ? "Sending..." : "Send"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowEmailModal(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actions for {actionStudent?.student_name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                closeActionModal();
                openEditModal(actionStudent!);
              }}
              variant="outline"
            >
              Edit
            </Button>
            <Button
              onClick={() => {
                closeActionModal();
                handleDelete(actionStudent!);
              }}
              variant="destructive"
            >
              Delete
            </Button>
            <Button
              onClick={() => {
                closeActionModal();
                openEmailModal(actionStudent!);
              }}
              variant="secondary"
            >
              Send Email
            </Button>
            <Button
              onClick={() => {
                closeActionModal();
                handleArchive(actionStudent!);
              }}
              variant="ghost"
            >
              Archive
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeActionModal}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
