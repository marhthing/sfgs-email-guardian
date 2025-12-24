import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

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

  // Get the next pending email
  const { data: pending } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
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

  try {
    await transporter.sendMail({
      from: process.env.VITE_SMTP_USER,
      to: pending.recipient_email,
      subject: pending.subject,
      text: pending.message,
      html: pending.attachments
        ? `<p>${pending.message}</p>${JSON.parse(pending.attachments).map((url) => `<p><a href='${url}'>Attachment</a></p>`).join('')}`
        : `<p>${pending.message}</p>`,
    });
    await supabase.from('email_queue').update({ status: 'sent', sent_at: now.toISOString() }).eq('id', pending.id);
    res.status(200).json({ success: true });
  } catch (err) {
    await supabase.from('email_queue').update({ status: 'failed', error_message: err.message }).eq('id', pending.id);
    res.status(500).json({ error: err.message });
  }
}
