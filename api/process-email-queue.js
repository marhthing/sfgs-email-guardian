import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import birthdayTemplate from '../templates/birthdayTemplate.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export default async function handler(req, res) {
  // Only allow POST or scheduled invocation
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Get email interval from settings
  const { data: settings } = await supabase.from('system_settings').select('email_interval_minutes').limit(1).maybeSingle();
  const intervalMinutes = settings?.email_interval_minutes || 5;

  // Get the last sent email
  const { data: lastSent } = await supabase
    .from('email_queue')
    .select('sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  let canSend = true;
  if (lastSent?.sent_at) {
    const lastSentDate = new Date(lastSent.sent_at);
    const diff = (now.getTime() - lastSentDate.getTime()) / 60000;
    canSend = diff >= intervalMinutes;
  }

  if (!canSend) {
    res.status(429).json({ error: `Must wait ${intervalMinutes} minutes between emails.` });
    return;
  }

  // Get the next pending email, prioritizing those with prioritized_at set
  const { data: pending } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .order('prioritized_at', { ascending: false, nullsFirst: true })
    .order('queued_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pending) {
    res.status(200).json({ message: 'No pending emails to send.' });
    return;
  }

  // Send the email
  const transporter = nodemailer.createTransport({
    host: process.env.VITE_SMTP_HOST,
    port: Number(process.env.VITE_SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.VITE_SMTP_USER,
      pass: process.env.VITE_SMTP_PASS,
    },
  });

  // Compose subject and message for birthday emails
  let subject = pending.subject;
  let message = pending.message;
  if (pending.email_type === 'birthday') {
    subject = `Happy Birthday from SFGS!`;
    message = birthdayTemplate({ studentName: pending.students?.student_name || 'your child' });
  }

  try {
    await transporter.sendMail({
      from: process.env.VITE_SMTP_USER,
      to: pending.recipient_email,
      subject,
      text: message.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
      html: `<p>${message}</p>`,
      attachments: pending.attachments
        ? JSON.parse(pending.attachments).map((url) => {
            // If the URL is a Supabase public URL, set a filename for the attachment
            const filename = url.split('/').pop()?.split('?')[0] || 'attachment.pdf';
            return { path: url, filename };
          })
        : [],
    });
    await supabase.from('email_queue').update({ status: 'sent', sent_at: now.toISOString() }).eq('id', pending.id);
    res.status(200).json({ success: true });
  } catch (err) {
    await supabase.from('email_queue').update({ status: 'failed', error_message: err.message }).eq('id', pending.id);
    res.status(500).json({ error: err.message });
  }
}
