// birthdayTemplate.js
// Export a function that returns the HTML for the birthday email

export default function birthdayTemplate({ studentName }) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%); border-radius: 16px; box-shadow: 0 4px 24px rgba(80, 112, 255, 0.08); padding: 32px 24px; max-width: 480px; margin: 32px auto; border: 1px solid #e0e7ff;">
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="32" fill="#6366F1"/>
          <path d="M32 16V32" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
          <circle cx="32" cy="40" r="8" fill="#fff"/>
          <circle cx="32" cy="40" r="5" fill="#6366F1"/>
        </svg>
      </div>
      <h2 style="color: #4338ca; font-size: 1.7rem; font-weight: 700; text-align: center; margin-bottom: 12px; letter-spacing: 0.5px;">Happy Birthday from SFGS!</h2>
      <p style="color: #334155; font-size: 1.1rem; text-align: center; margin-bottom: 18px;">Dear Parent/Guardian,</p>
      <div style="background: #f1f5f9; border-radius: 10px; padding: 18px 16px; margin-bottom: 18px; border-left: 4px solid #6366F1;">
        <p style="color: #6366F1; font-size: 1.15rem; font-weight: 500; margin: 0;">
          We are delighted to celebrate your child's special day!<br>
          <span style="color: #0ea5e9; font-weight: 700;">Wishing ${
            studentName || "your child"
          } a wonderful birthday and a fantastic year ahead.</span>
        </p>
      </div>
      <p style="color: #64748b; font-size: 1rem; text-align: center; margin-bottom: 0;">Best wishes,<br><span style="color: #6366F1; font-weight: 600;">SFGS Team</span></p>
    </div>
  `;
}
