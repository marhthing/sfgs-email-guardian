import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const RANGE = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A1:Z";
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY)
    return res.status(500).json({ error: "Google Sheets credentials not set" });

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.readonly"
    ],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const { adminEmail, force } = req.body || {};
  const SYNC_INTERVAL_MINUTES = 30;

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Only throttle if not force
  if (!force) {
    // Check last sync
    const { data: lastSync, error: lastSyncError } = await supabase
      .from("student_sync_history")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastSyncError) {
      return res.status(500).json({ error: lastSyncError.message });
    }
    if (lastSync && lastSync.synced_at) {
      const last = new Date(lastSync.synced_at);
      const now = new Date();
      const diffMinutes = (now - last) / 60000;
      if (diffMinutes < SYNC_INTERVAL_MINUTES) {
        const nextSync = new Date(last.getTime() + SYNC_INTERVAL_MINUTES * 60000);
        return res.status(200).json({
          success: false,
          message: `Sync skipped. Next sync available at ${nextSync.toLocaleString()}`
        });
      }
    }
  }

  try {
    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });
    const rows = sheetRes.data.values;
    if (!rows || rows.length < 2) {
      // No data found, but this is not a client error
      await supabase.from("student_sync_history").insert({
        admin_email: adminEmail || "system",
        status: "success",
        count: 0,
        message: "No data found in sheet."
      });
      return res.status(200).json({ success: true, count: 0, message: "No data found in sheet." });
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const students = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        const key = h.trim().toLowerCase();
        if (key === "student id") obj["matric_number"] = row[i] || "";
        else if (key === "full name") obj["student_name"] = row[i] || "";
        else if (key === "parent email 1") obj["parent_email_1"] = row[i] || "";
        else if (key === "parent email 2") obj["parent_email_2"] = row[i] || "";
        else if (key === "date of birth") obj["date_of_birth"] = row[i] || "";
        else if (key === "class") obj["class"] = row[i] || "";
      });
      return obj;
    });

    // Filter out students whose matric_number already exists in Supabase
    const { data: existingStudents, error: fetchError } = await supabase
      .from("students")
      .select("matric_number");
    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }
    const existingMatricNumbers = new Set((existingStudents || []).map(s => s.matric_number));
    const newStudents = students.filter(s => s.matric_number && !existingMatricNumbers.has(s.matric_number));

    if (newStudents.length === 0) {
      // Log sync attempt (even if no new students)
      await supabase.from("student_sync_history").insert({
        admin_email: adminEmail || "system",
        status: "success",
        count: 0,
        message: "No new students to import."
      });
      return res.status(200).json({
        success: true,
        count: 0,
        message: "No new students to import."
      });
    }

    const { error } = await supabase.from("students").upsert(newStudents, { onConflict: "matric_number" });
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Log sync attempt (success)
    await supabase.from("student_sync_history").insert({
      admin_email: adminEmail || "system",
      status: "success",
      count: newStudents.length,
      message: `Successfully synced ${newStudents.length} new students`
    });
    return res.status(200).json({
      success: true,
      count: newStudents.length,
      message: `Successfully synced ${newStudents.length} new students`
    });
  } catch (err) {
    // Log sync attempt (failure)
    await supabase.from("student_sync_history").insert({
      admin_email: req.body?.adminEmail || "system",
      status: "error",
      count: 0,
      message: err.message || err.toString()
    });
    return res.status(500).json({ error: err.message || err.toString() });
  }
}