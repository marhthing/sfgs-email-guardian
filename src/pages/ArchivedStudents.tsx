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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  student_name: string;
  matric_number: string;
  date_of_birth: string;
  parent_email_1: string | null;
  parent_email_2: string | null;
  class: string;
  archived?: boolean;
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

export default function ArchivedStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const fetchStudents = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("archived", true)
      .order("created_at", { ascending: false });
    setStudents((data || []).map((s: any) => ({ ...s, class: s.class || "" })));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleUnarchive = async (student: Student) => {
    const { error } = await supabase
      .from("students")
      .update({ archived: false })
      .eq("id", student.id);
    if (error) {
      toast({ title: "Failed to unarchive student", variant: "destructive" });
    } else {
      toast({ title: "Student unarchived" });
      fetchStudents();
    }
  };

  const filteredStudents = students.filter((student) => {
    const name = student.student_name.toLowerCase();
    const studentId = student.matric_number.replace(/\s+/g, "").toLowerCase();
    const searchValue = search.toLowerCase();
    if (classFilter && student.class !== classFilter) return false;
    if (!searchValue) return true;
    if (studentId.includes(searchValue.replace(/\s+/g, ""))) return true;
    const words = searchValue.split(/\s+/).filter(Boolean);
    return words.every((word) => name.includes(word));
  });

  return (
    <AdminLayout
      title="Archived Students"
      description="Manage archived students"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          placeholder="Filter by name or Student ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs border rounded px-2 py-1 text-sm"
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
      <div className="hidden md:block">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Archived Student List</CardTitle>
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
                      No archived students found
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
                          variant="secondary"
                          onClick={() => handleUnarchive(student)}
                        >
                          Unarchive
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
      {/* Mobile card view */}
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-3">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No archived students found
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
                    variant="secondary"
                    onClick={() => handleUnarchive(student)}
                  >
                    Unarchive
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
