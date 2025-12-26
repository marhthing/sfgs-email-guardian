import { createClient } from '@supabase/supabase-js';
import birthdayTemplate from '../templates/birthdayTemplate.js';
import { sendBrevoEmail } from '../utils/sendBrevoEmail.js';

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

  // Get email settings - get the FIRST row ordered by updated_at (most recent)
  const { data: settingsArray, error: settingsError } = await supabase
    .from('system_settings')
    .select('id, daily_email_limit, email_batch_size, email_interval_minutes, updated_at, cron_enabled')
    .order('updated_at', { ascending: false });

  const settings = settingsArray?.[0] || null;

  // Get daily email limit, batch size, and interval from settings
  const dailyLimit = settings?.daily_email_limit || 100;
  const maxBatchSize = settings?.email_batch_size || 10;
  const intervalMinutes = settings?.email_interval_minutes || 5;

  // Check if enough time has passed since last email was sent
  const { data: lastSentEmail } = await supabase
    .from('email_queue')
    .select('sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSentEmail?.sent_at) {
    const lastSentTime = new Date(lastSentEmail.sent_at);
    const now = new Date();
    const minutesSinceLastSend = (now.getTime() - lastSentTime.getTime()) / (1000 * 60);
    
    if (minutesSinceLastSend < intervalMinutes) {
      const waitMinutes = (intervalMinutes - minutesSinceLastSend).toFixed(1);
      await supabase.from('cron_log').insert({
        status: 'interval_not_met',
        message: `Waiting for interval. Last email sent ${minutesSinceLastSend.toFixed(1)} minutes ago. Need to wait ${waitMinutes} more minutes.`
      });
      res.status(200).json({ 
        success: false, 
        message: `Email interval not met. Wait ${waitMinutes} more minutes.`,
        lastSent: lastSentTime.toISOString(),
        intervalMinutes
      });
      return;
    }
  }

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
      message: `Daily email limit of ${dailyLimit} reached. Sent: ${sentToday}`
    });
    res.status(200).json({ success: false, message: `Daily email limit of ${dailyLimit} reached. Already sent: ${sentToday}` });
    return;
  }

  // Calculate how many emails we can still send today
  const remainingToday = dailyLimit - sentToday;
  const batchSize = Math.min(maxBatchSize, remainingToday);

  // Get batch of pending emails to send
  // Always prioritize emails with prioritized_at set (not null), then FIFO for the rest
  const { data: prioritizedEmails } = await supabase
    .from('email_queue')
    .select('*, students:student_id(student_name)')
    .eq('status', 'pending')
    .not('prioritized_at', 'is', null)
    .order('prioritized_at', { ascending: true }) // oldest prioritized first
    .limit(batchSize);

  let remaining = batchSize - (prioritizedEmails?.length || 0);
  let normalEmails = [];
  if (remaining > 0) {
    const { data: normalBatch } = await supabase
      .from('email_queue')
      .select('*, students:student_id(student_name)')
      .eq('status', 'pending')
      .is('prioritized_at', null)
      .order('queued_at', { ascending: true })
      .limit(remaining);
    normalEmails = normalBatch || [];
  }
  let pendingEmails = [...(prioritizedEmails || []), ...normalEmails];

  // Separate birthday and non-birthday emails
  const birthdayEmails = pendingEmails.filter(e => e.email_type === 'birthday');
  let nonBirthdayEmails = pendingEmails.filter(e => e.email_type !== 'birthday');

  // If cron is disabled, skip non-birthday emails (but keep birthday emails in the queue and process them)
  if (settings && settings.cron_enabled === false) {
    if (nonBirthdayEmails.length > 0) {
      await supabase.from('cron_log').insert({
        status: 'cron_disabled',
        message: 'Cron job is currently disabled by admin. Only birthday emails will be sent.'
      });
    }
    nonBirthdayEmails = [];
  }

  pendingEmails = [...birthdayEmails, ...nonBirthdayEmails];

  if (!pendingEmails || pendingEmails.length === 0) {
    await supabase.from('cron_log').insert({
      status: 'no_pending',
      message: 'No pending emails to send.'
    });
    res.status(200).json({ message: 'No pending emails to send.' });
    return;
  }

  // Process each email in the batch
  let sentCount = 0;
  let failedCount = 0;
  const errors = [];

  for (const pending of pendingEmails) {
    try {
      const now = new Date(); // Define now for each email
      
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

      // Defensive: parse attachments safely
      let attachmentsArr = [];
      if (pending.attachments) {
        try {
          const parsed = JSON.parse(pending.attachments);
          if (Array.isArray(parsed)) {
            attachmentsArr = parsed;
          }
        } catch (e) {}
      }
    let brevoAttachments = [];
    if (attachmentsArr.length > 0) {
      for (let url of attachmentsArr) {
        let displayName = null;
        let buffer = null;

        // If not a URL, treat as Supabase storage key and get file buffer
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

          // Download file from Supabase Storage
          const { data: fileData, error: fileError } = await supabase.storage.from(bucket).download(fileKey);
          if (fileData && !fileError) {
            buffer = Buffer.from(await fileData.arrayBuffer());
          }

          // Also get public URL for fallback links
          const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileKey);
          if (publicUrlData?.publicUrl) {
            url = publicUrlData.publicUrl;
          }
        } else {
          // If it's a URL, fetch it
          try {
            const response = await fetch(url);
            if (response.ok) {
              buffer = Buffer.from(await response.arrayBuffer());
            }
          } catch (e) {}
        }

        if (buffer) {
          // Convert buffer to base64 for Brevo
          const base64Content = buffer.toString('base64');
          let filename = displayName || url.split('/').pop()?.split('?')[0] || 'attachment.pdf';

          // Ensure filename has an extension
          if (!/\.[a-zA-Z0-9]+$/.test(filename)) {
            const extMatch = url.match(/\.[a-zA-Z0-9]+$/);
            if (extMatch) filename += extMatch[0];
            else filename += '.pdf'; // default to .pdf
          }

          brevoAttachments.push({
            content: base64Content,
            name: filename
          });
        }
      }
    }

    // Prepare HTML content
    let htmlContent = message;

    // If there were supposed to be attachments but none could be attached, add download links
    if (attachmentsArr.length > 0 && brevoAttachments.length === 0) {
      const links = await Promise.all(attachmentsArr.map(async (url) => {
        let displayName = null;
        let link = null;
        if (!url.startsWith('http')) {
          const bucket = 'pdfs';
          const fileKey = url;
          const { data: fileMeta } = await supabase
            .from('uploaded_files')
            .select('original_file_name')
            .eq('storage_path', url)
            .maybeSingle();
          if (fileMeta?.original_file_name) {
            displayName = fileMeta.original_file_name;
          }
          const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileKey);
          if (publicUrlData?.publicUrl) {
            link = `<a href="${publicUrlData.publicUrl}">${displayName || fileKey}</a>`;
          }
        } else {
          link = `<a href="${url}">${displayName || url.split('/').pop()?.split('?')[0] || 'Download attachment'}</a>`;
        }
        if (!link) {
          link = `${displayName || url.split('/').pop()?.split('?')[0] || 'Attachment'} (Could not be delivered. Please contact admin.)`;
        }
        return link;
      }));
      htmlContent += `<br><br>Download attachments:<br>${links.join('<br>')}`;
    }

      // Send email via Brevo
      await sendBrevoEmail({
        toEmail: pending.recipient_email,
        toName: '',
        subject,
        htmlContent,
        attachments: brevoAttachments
      });

      // Mark as sent in email_queue
      await supabase.from('email_queue').update({ status: 'sent', sent_at: now.toISOString() }).eq('id', pending.id);

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

      sentCount++;
    } catch (err) {
      failedCount++;
      errors.push({ email: pending.recipient_email, error: err.message });
      
      // Log error
      try {
        await supabase.from('email_queue').update({ status: 'failed', error_message: err.message }).eq('id', pending.id);
        await supabase.from('system_logs').insert({
          type: 'email',
          message: `Email failed to ${pending.recipient_email}: ${err.message}`,
        });
      } catch (logErr) {}
    }
  }

  // Log batch results to cron_log
  await supabase.from('cron_log').insert({
    status: failedCount === 0 ? 'success' : 'partial_success',
    message: `Batch complete: ${sentCount} sent, ${failedCount} failed (limit: ${dailyLimit}, batch: ${maxBatchSize})`
  });

  res.status(200).json({ 
    success: true, 
    sent: sentCount, 
    failed: failedCount,
    settings: { dailyLimit, batchSize: maxBatchSize, actualBatchSize: batchSize },
    errors: errors.length > 0 ? errors : undefined
  });
}