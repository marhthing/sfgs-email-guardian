// birthdayTemplate.js
// Export a function that returns the HTML for the birthday email

export default function birthdayTemplate({ studentName }) {
  return `
    <div style="background: #f8f6f3; font-family: Georgia, 'Times New Roman', serif; padding: 0; margin: 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8f6f3;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              <!-- School Logo -->
              <tr>
                <td style="padding: 24px 0 0 0; text-align: center; background: #fff;">
                  <img src='https://portal.sfgs.com.ng/img/logo.JPG' alt="SFGS Logo" width="80" height="80" style="border-radius: 50%; box-shadow: 0 2px 8px rgba(74,15,63,0.10); margin-bottom: 8px;" />
                </td>
              </tr>
              <tr>
                <td style="background: linear-gradient(135deg, #4a0f3f 0%, #764ba2 100%); padding: 40px 40px 35px; text-align: center; position: relative;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: normal; letter-spacing: 1px;">
                    Happy Birthday
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 40px 30px; text-align: center;">
                  <p style="margin: 0 0 8px 0; color: #888888; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">
                    Celebrating
                  </p>
                  <p style="margin: 0; color: #4a0f3f; font-size: 28px; font-weight: bold;">
                    ${studentName || "your child"}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 40px 30px; text-align: center;">
                  <div style="font-size: 56px; line-height: 1;">🎂</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 40px 40px; text-align: center;">
                  <p style="margin: 0; color: #555555; font-size: 16px; line-height: 1.7;">
                    On behalf of everyone at <strong style='color:#4a0f3f;'>SURE FOUNDATION GROUP OF SCHOOL (SFGS)</strong>, we wish your child a wonderful birthday filled with joy and happiness.
                  </p>
                  <p style="margin: 20px 0 0 0; color: #555555; font-size: 16px; line-height: 1.7;">
                    May this new year bring growth, learning, and many cherished moments.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 40px 20px; text-align: center;">
                  <span style="font-size: 24px; margin: 0 8px; color: #4a0f3f;">🎈</span>
                  <span style="font-size: 20px; margin: 0 8px; color: #4a0f3f;">🎈</span>
                  <span style="font-size: 26px; margin: 0 8px; color: #4a0f3f;">🎈</span>
                  <span style="font-size: 22px; margin: 0 8px; color: #4a0f3f;">🎈</span>
                  <span style="font-size: 24px; margin: 0 8px; color: #4a0f3f;">🎈</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 40px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                    <tr>
                      <td style="border-top: 1px solid #eeeeee;"></td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 40px 40px; text-align: center;">
                  <p style="margin: 0; color: #888888; font-size: 14px;">
                    Warm regards,
                  </p>
                  <p style="margin: 8px 0 0 0; color: #4a0f3f; font-size: 16px; font-weight: bold;">
                    SURE FOUNDATION GROUP OF SCHOOL (SFGS)
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}
