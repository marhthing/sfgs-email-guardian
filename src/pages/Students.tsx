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

interface Student {
  id: string;
  student_name: string;
  matric_number: string;
  date_of_birth: string;
  parent_email_1: string | null;
  parent_email_2: string | null;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<Partial<Student>>({});
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

  const fetchStudents = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    setStudents(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

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
    if (!form.student_name || !form.matric_number || !form.date_of_birth) {
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
      subject: `Message for ${student.student_name}` || "No subject",
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
    let attachmentPaths: string[] = [];
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

  // Combined filter for name or student ID (order-insensitive for name, ignores spaces for student ID)
  const filteredStudents = students.filter((student) => {
    const name = student.student_name.toLowerCase();
    const studentId = student.matric_number.replace(/\s+/g, "").toLowerCase();
    const searchValue = search.toLowerCase();
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
                </CardContent>
                <div className="px-0 pb-0 flex flex-wrap gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(student)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(student)}
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEmailModal(student)}
                  >
                    Send Email
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
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
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
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(student)}
                        >
                          Edit
                        </Button>{" "}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(student)}
                        >
                          Delete
                        </Button>{" "}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEmailModal(student)}
                        >
                          Send Email
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
            <div>
              <Label>Message</Label>
              <Textarea
                name="message"
                value={emailForm.message}
                onChange={handleEmailFormChange}
                rows={5}
              />
            </div>
            <div>
              <Label>Attachments</Label>
              <Input type="file" multiple onChange={handleAttachmentChange} />
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
    </AdminLayout>
  );
}
