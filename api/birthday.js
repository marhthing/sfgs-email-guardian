// api/birthday.js
// Endpoint to queue birthday emails for students whose birthday is today

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // Allow GET or POST for cron compatibility
    if (req.method !== 'POST' && req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Get today's month and day
    const today = new Date();
    const month = today.getMonth() + 1; // JS months are 0-based
    const day = today.getDate();

    // Find students with birthday today
    const { data: students, error } = await supabase
      .from('students')
      .select('*'); // Removed .filter('birthday', 'neq', null) to avoid column error

    if (error) {
      console.error('Failed to fetch students:', error);
      return res.status(500).json({ error: 'Failed to fetch students', details: error.message || error });
    }

    // Filter students whose birthday matches today (using date_of_birth column)
    const birthdayStudents = students.filter(s => {
      if (!s.date_of_birth) return false;
      const bday = new Date(s.date_of_birth);
      return bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth();
    });

    // Queue birthday emails for each student
    let queued = 0;
    for (const student of birthdayStudents) {
      // Use parent_email_1 and parent_email_2 if present
      const parentEmails = [student.parent_email_1, student.parent_email_2].filter(Boolean);
      for (const parentEmail of parentEmails) {
        // Check if already queued today for this parent
        const { data: existing, error: existingError } = await supabase
          .from('email_queue')
          .select('id')
          .eq('matric_number', student.matric_number)
          .eq('email_type', 'birthday')
          .eq('recipient_email', parentEmail)
          .gte('created_at', today.toISOString().split('T')[0] + 'T00:00:00');
        if (existingError) {
          console.error('Failed to check existing birthday emails:', existingError);
          continue;
        }
        if (existing && existing.length > 0) continue;
        // Compose personalized birthday message
        const subject = `Happy Birthday from SFGS!`;
        const message = require('../templates/birthdayTemplate.js').default({ studentName: student.student_name });
        const { error: insertError } = await supabase.from('email_queue').insert({
          matric_number: student.matric_number,
          recipient_email: parentEmail,
          email_type: 'birthday',
          status: 'pending',
          created_at: new Date().toISOString(),
          student_id: student.id,
          subject,
          message
        });
        if (!insertError) {
          // Log to birthday_emails_sent to prevent duplicate for this student/parent today
          await supabase.from('birthday_emails_sent').insert({
            student_id: student.id,
            sent_date: today.toISOString().slice(0, 10)
          });
        }
        if (insertError) {
          console.error('Failed to insert birthday email:', insertError);
          continue;
        }
        queued++;
      }
    }

    res.status(200).json({ message: `Queued ${queued} birthday emails.` });
  } catch (error) {
    console.error('Birthday API error:', error);
    res.status(500).json({ error: error.message || 'Unknown error', details: error });
  }
}
