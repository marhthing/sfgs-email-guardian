import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import birthdayTemplate from '../templates/birthdayTemplate.js';
import fs from 'fs';

// Use service role key for server-side access
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // Only allow POST or scheduled invocation
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Get email interval from settings
  const { data: settings } = await supabase.from('system_settings').select('email_interval_minutes, email_daily_limit').limit(1).maybeSingle();
  const intervalMinutes = settings?.email_interval_minutes || 5;

  // Get daily email limit from settings
  const dailyLimit = settings?.email_daily_limit || 50; // default to 50 if not set

  // Count how many emails have been sent today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: sentToday } = await supabase
    .from('email_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', today.toISOString());

  if (sentToday >= dailyLimit) {
    await supabase.from('cron_log').insert({
      status: 'daily_limit_reached',
      message: `Daily email limit of ${dailyLimit} reached.`
    });
    res.status(200).json({ success: false, message: `Daily email limit of ${dailyLimit} reached.` });
    return;
  }

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
    const minutesLeft = Math.ceil(intervalMinutes - ((now.getTime() - new Date(lastSent.sent_at).getTime()) / 60000));
    await supabase.from('cron_log').insert({
      status: 'rate_limited',
      message: `Must wait ${minutesLeft} minute(s) before the next email can be sent.`
    });
    res.status(200).json({ success: false, message: `Must wait ${minutesLeft} minute(s) before the next email can be sent.` });
    return;
  }

  // Get the next pending email, prioritizing those with prioritized_at set
  const { data: pending } = await supabase
    .from('email_queue')
    .select('*, students:student_id(student_name)')
    .eq('status', 'pending')
    .order('prioritized_at', { ascending: false, nullsLast: true })
    .order('queued_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pending) {
    await supabase.from('cron_log').insert({
      status: 'no_pending',
      message: 'No pending emails to send.'
    });
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

  // Fallbacks if subject or message are still missing
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    subject = '[SFGS Notification]';
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    message = 'No message content provided.';
  }

  // Defensive: log pending if subject or message is blank
  if (!subject.trim() || !message.trim()) {
    console.warn('Email subject or message is blank. Pending object:', JSON.stringify(pending));
  }

  // Defensive: parse attachments safely
  let attachmentsArr = [];
  if (pending.attachments) {
    try {
      const parsed = JSON.parse(pending.attachments);
      if (Array.isArray(parsed)) {
        attachmentsArr = parsed;
      } else {
        console.warn('Attachments is not an array:', pending.attachments);
      }
    } catch (e) {
      console.warn('Failed to parse attachments JSON:', pending.attachments, e);
    }
  }

  try {
    let attachmentsToSend = [];
    if (attachmentsArr.length > 0) {
      for (let url of attachmentsArr) {
        let displayName = null;
        let buffer = null;
        // If not a URL, treat as Supabase storage key and get file buffer
        if (!url.startsWith('http')) {
          // Always use 'pdfs' as the bucket, and url as the fileKey (e.g. 'attachments/filename.pdf')
          const bucket = 'pdfs';
          const fileKey = url;
          // Lookup display name from uploaded_files
          const { data: fileMeta } = await supabase
            .from('uploaded_files')
            .select('original_file_name')
            .eq('storage_path', url)
            .maybeSingle();
          if (fileMeta?.original_file_name) {
            displayName = fileMeta.original_file_name;
          }
          // Download file from Supabase Storage (public bucket, but works for private too)
          const { data: fileData, error: fileError } = await supabase.storage.from(bucket).download(fileKey);
          if (fileData && !fileError) {
            buffer = Buffer.from(await fileData.arrayBuffer());
          }
          // Also get public URL for fallback links
          const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileKey);
          if (publicUrlData?.publicUrl) {
            url = publicUrlData.publicUrl;
          }
        }
        if (buffer) {
          // Attach from buffer
          // Always preserve the file extension from the original file name or storage path
          let filename = displayName || url.split('/').pop()?.split('?')[0] || 'attachment.pdf';
          // If filename does not have an extension, try to get it from the storage path
          if (!/\.[a-zA-Z0-9]+$/.test(filename)) {
            const extMatch = url.match(/\.[a-zA-Z0-9]+$/);
            if (extMatch) filename += extMatch[0];
          }
          attachmentsToSend.push({ filename, content: buffer });
        } else if (url.startsWith('http')) {
          // Fetch the file from the URL and attach as buffer (public bucket)
          try {
            const response = await fetch(url);
            if (response.ok) {
              const buffer = Buffer.from(await response.arrayBuffer());
              const filename = displayName || url.split('/').pop()?.split('?')[0] || 'attachment.pdf';
              attachmentsToSend.push({ filename, content: buffer });
            } else {
              attachmentsToSend.push(null);
            }
          } catch (e) {
            attachmentsToSend.push(null);
          }
        } else {
          attachmentsToSend.push(null);
        }
      }
      attachmentsToSend = attachmentsToSend.filter(Boolean);
    }

    // If there are NO attachments at all, do not add any links, just send the message as-is
    let finalMessage = message;
    if (attachmentsArr.length > 0 && attachmentsToSend.length === 0) {
      // Only if there were supposed to be attachments but none could be attached, add links
      const links = await Promise.all(attachmentsArr.map(async (url) => {
        let displayName = null;
        let link = null;
        if (!url.startsWith('http')) {
          const bucket = 'pdfs';
          const fileKey = url;
          // Lookup display name from uploaded_files
          const { data: fileMeta } = await supabase
            .from('uploaded_files')
            .select('original_file_name')
            .eq('storage_path', url)
            .maybeSingle();
          if (fileMeta?.original_file_name) {
            displayName = fileMeta.original_file_name;
          }
          // Get public URL
          const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileKey);
          if (publicUrlData?.publicUrl) {
            link = `<a href="${publicUrlData.publicUrl}">${displayName || fileKey}</a>`;
          }
        } else {
          // If already a URL, use as link
          link = `<a href="${url}">${displayName || url.split('/').pop()?.split('?')[0] || 'Download attachment'}</a>`;
        }
        // If no link could be generated, show a plain message
        if (!link) {
          link = `${displayName || url.split('/').pop()?.split('?')[0] || 'Attachment'} (Could not be delivered. Please contact admin.)`;
        }
        return link;
      }));
      finalMessage += `<br><br>Download attachments:<br>${links.join('<br>')}`;
    }
    // If there are no attachments at all, finalMessage remains as the original message

    await transporter.sendMail({
      from: process.env.VITE_SMTP_USER,
      to: pending.recipient_email,
      subject,
      text: (finalMessage || '').replace(/<br\s*\/?\>/gi, '\n').replace(/<[^>]+>/g, ''),
      html: `<p>${finalMessage || ''}</p>`,
      attachments: attachmentsToSend,
    });
    // Mark as sent in email_queue
    await supabase.from('email_queue').update({ status: 'sent', sent_at: now.toISOString() }).eq('id', pending.id);
    // Log to cron_log
    await supabase.from('cron_log').insert({
      status: 'success',
      message: `Email sent to ${pending.recipient_email}`,
      email_id: pending.id
    });
    // Log to system_logs
    await supabase.from('system_logs').insert({
      type: 'email',
      message: `Email sent to ${pending.recipient_email} (type: ${pending.email_type})`,
    });
    // Upsert daily count
    const todayStr = now.toISOString().slice(0, 10);
    const { data: dailyRow } = await supabase
      .from('email_daily_counts')
      .select('id, count')
      .eq('date', todayStr)
      .maybeSingle();
    if (dailyRow) {
      await supabase.from('email_daily_counts').update({ count: dailyRow.count + 1 }).eq('id', dailyRow.id);
    } else {
      await supabase.from('email_daily_counts').insert({ date: todayStr, count: 1 });
    }
    // If birthday email, log to birthday_emails_sent
    if (pending.email_type === 'birthday' && pending.student_id) {
      await supabase.from('birthday_emails_sent').insert({ student_id: pending.student_id, sent_date: todayStr });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    // Defensive: log error but don't block response if logging fails
    try {
      await supabase.from('email_queue').update({ status: 'failed', error_message: err.message }).eq('id', pending.id);
      await supabase.from('cron_log').insert({
        status: 'error',
        message: err.message,
        email_id: pending.id
      });
      await supabase.from('system_logs').insert({
        type: 'email',
        message: `Email failed to ${pending.recipient_email}: ${err.message}`,
      });
    } catch (logErr) {
      // If logging fails, just continue
    }
    res.status(500).json({ error: err.message });
  }
}
