import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  id: string;
  student_name: string;
  matric_number: string;
  date_of_birth: string;
}

type BirthdayCategory = "today" | "past" | "upcoming" | "all";

function getBirthdayCategory(birthday: string): BirthdayCategory {
  const today = new Date();
  const bday = new Date(birthday);
  const thisYear = new Date(
    today.getFullYear(),
    bday.getMonth(),
    bday.getDate()
  );
  if (
    thisYear.getDate() === today.getDate() &&
    thisYear.getMonth() === today.getMonth()
  ) {
    return "today";
  }
  if (thisYear < today) {
    return "past";
  }
  if (thisYear > today) {
    return "upcoming";
  }
  return "all";
}

const categoryLabels: Record<BirthdayCategory, string> = {
  today: "Today",
  past: "Past",
  upcoming: "Upcoming",
  all: "All",
};

const categoryColors: Record<BirthdayCategory, string> = {
  today: "bg-green-500",
  past: "bg-gray-400",
  upcoming: "bg-blue-500",
  all: "bg-yellow-500",
};

export default function BirthdayPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [birthdayFilter, setBirthdayFilter] =
    useState<BirthdayCategory>("today");

  useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("id, student_name, matric_number, date_of_birth");
      if (!error && data) {
        setStudents(data);
      }
      setLoading(false);
    }
    fetchStudents();
  }, []);

  // Filter by name or matric number (order-insensitive)
  const filterWords = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = students
    .filter((student) => {
      const name = student.student_name.toLowerCase();
      const matric = student.matric_number.toLowerCase();
      if (!filterWords.length) return true;
      if (matric.includes(filter.toLowerCase())) return true;
      return filterWords.every((word) => name.includes(word));
    })
    .filter((student) => {
      if (birthdayFilter === "all") return true;
      return getBirthdayCategory(student.date_of_birth) === birthdayFilter;
    });

  return (
    <AdminLayout
      title="Student Birthdays"
      description="View all student birthdays by category."
    >
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Filter by name or Student ID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <div className="mb-6 flex gap-2">
        {(["today", "past", "upcoming", "all"] as BirthdayCategory[]).map(
          (cat) => (
            <Button
              key={cat}
              variant={birthdayFilter === cat ? "default" : "outline"}
              onClick={() => setBirthdayFilter(cat)}
              className="capitalize"
            >
              {categoryLabels[cat]}
            </Button>
          )
        )}
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div>No students found.</div>
          ) : (
            filtered.map((student) => {
              const cat = getBirthdayCategory(student.date_of_birth);
              return (
                <div
                  key={student.id}
                  className="flex items-center gap-4 p-3 border rounded shadow-sm bg-card"
                >
                  <Badge className={categoryColors[cat]}>
                    {categoryLabels[cat]}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-semibold">
                      {student.student_name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Age{" "}
                        {Math.floor(
                          (new Date().getTime() -
                            new Date(student.date_of_birth).getTime()) /
                            (365.25 * 24 * 60 * 60 * 1000)
                        )}
                        )
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Student ID: {student.matric_number}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(student.date_of_birth).toLocaleDateString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </AdminLayout>
  );
}
