import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { to, subject, text, html } = req.body;

  if (!to || !subject || (!text && !html)) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

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
      from: `"${process.env.VITE_SMTP_FROM_NAME}" <${process.env.VITE_SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
