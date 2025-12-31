// birthdayTemplate.js
// Export a function that returns the HTML for the birthday certificate

export default function birthdayTemplate({ studentName }) {
  return `
    <div style="background: #f5f5f5; font-family: 'Georgia', 'Times New Roman', serif; padding: 20px 15px; margin: 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 700px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
        
        <!-- Decorative Top Border -->
        <tr>
          <td style="background: linear-gradient(135deg, #4a0f3f 0%, #764ba2 50%, #4a0f3f 100%); height: 12px;"></td>
        </tr>
        
        <!-- Ornamental Top Design -->
        <tr>
          <td style="padding: 0; text-align: center; background: #ffffff;">
            <div style="width: 100%; height: 2px; background: linear-gradient(to right, transparent, #d4af37, transparent);"></div>
          </td>
        </tr>
        
        <!-- School Logo -->
        <tr>
          <td style="padding: 20px 0 10px 0; text-align: center; background: #ffffff;">
            <img src='https://portal.sfgs.com.ng/img/logo.JPG' alt="SFGS Logo" width="70" height="70" style="border-radius: 50%; box-shadow: 0 4px 16px rgba(74,15,63,0.15); border: 3px solid #4a0f3f;" />
          </td>
        </tr>
        
        <!-- School Name -->
        <tr>
          <td style="padding: 8px 30px 15px; text-align: center; background: #ffffff;">
            <h2 style="margin: 0; color: #4a0f3f; font-size: 18px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
              Sure Foundation Group of School
            </h2>
            <div style="width: 100px; height: 2px; background: #d4af37; margin: 8px auto 0;"></div>
          </td>
        </tr>
        
        <!-- Certificate Badge -->
        <tr>
          <td style="padding: 15px 30px 10px; text-align: center; background: #ffffff;">
            <div style="display: inline-block; background: linear-gradient(135deg, #4a0f3f 0%, #764ba2 100%); padding: 25px 40px; border-radius: 50%; box-shadow: 0 6px 20px rgba(74,15,63,0.25);">
              <div style="font-size: 48px; line-height: 1;">🎂</div>
            </div>
          </td>
        </tr>
        
        <!-- Happy Birthday Title -->
        <tr>
          <td style="padding: 15px 30px 10px; text-align: center; background: #ffffff;">
            <h1 style="margin: 0; color: #4a0f3f; font-size: 36px; font-weight: normal; letter-spacing: 3px; font-family: 'Georgia', serif;">
              Happy Birthday
            </h1>
          </td>
        </tr>
        
        <!-- Celebrating Label -->
        <tr>
          <td style="padding: 10px 30px 5px; text-align: center; background: #ffffff;">
            <p style="margin: 0; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">
              ✨ Celebrating ✨
            </p>
          </td>
        </tr>
        
        <!-- Student Name -->
        <tr>
          <td style="padding: 5px 30px 15px; text-align: center; background: #ffffff;">
            <div style="display: inline-block; border-bottom: 2px solid #d4af37; padding: 0 20px 5px;">
              <p style="margin: 0; color: #4a0f3f; font-size: 28px; font-weight: bold; font-style: italic;">
                ${studentName || "your child"}
              </p>
            </div>
          </td>
        </tr>
        
        <!-- Decorative Divider -->
        <tr>
          <td style="padding: 10px 50px;">
            <div style="width: 100%; height: 1px; background: linear-gradient(to right, transparent, #d4af37, transparent);"></div>
          </td>
        </tr>
        
        <!-- Birthday Message -->
        <tr>
          <td style="padding: 15px 50px; text-align: center; background: #ffffff;">
            <p style="margin: 0 0 10px 0; color: #333333; font-size: 15px; line-height: 1.6; font-weight: 400;">
              On behalf of everyone at <strong style='color:#4a0f3f; font-weight: 600;'>SURE FOUNDATION GROUP OF SCHOOL (SFGS)</strong>, we wish your child a wonderful birthday filled with joy and happiness.
            </p>
            <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.6; font-style: italic;">
              May this new year bring growth, learning, and many cherished moments.
            </p>
          </td>
        </tr>
        
        <!-- Balloons -->
        <tr>
          <td style="padding: 15px 30px 20px; text-align: center; background: #ffffff;">
            <div style="font-size: 0;">
              <span style="display: inline-block; font-size: 24px; margin: 0 6px; color: #4a0f3f;">🎈</span>
              <span style="display: inline-block; font-size: 20px; margin: 0 6px; color: #764ba2;">🎈</span>
              <span style="display: inline-block; font-size: 28px; margin: 0 6px; color: #4a0f3f;">🎈</span>
              <span style="display: inline-block; font-size: 22px; margin: 0 6px; color: #764ba2;">🎈</span>
              <span style="display: inline-block; font-size: 24px; margin: 0 6px; color: #4a0f3f;">🎈</span>
            </div>
          </td>
        </tr>
        
        <!-- Decorative Divider -->
        <tr>
          <td style="padding: 10px 50px;">
            <div style="width: 100%; height: 2px; background: linear-gradient(to right, transparent, #d4af37, transparent);"></div>
          </td>
        </tr>
        
        <!-- Signature Section -->
        <tr>
          <td style="padding: 20px 50px 25px; text-align: center; background: #fafafa;">
            <p style="margin: 0 0 8px 0; color: #888888; font-size: 13px; letter-spacing: 1px;">
              Warm regards,
            </p>
            <p style="margin: 0; color: #4a0f3f; font-size: 16px; font-weight: bold; letter-spacing: 1px;">
              SURE FOUNDATION GROUP OF SCHOOL
            </p>
            <p style="margin: 5px 0 0 0; color: #764ba2; font-size: 13px; font-weight: 600; letter-spacing: 1px;">
              (SFGS)
            </p>
          </td>
        </tr>
        
        <!-- Decorative Bottom Border -->
        <tr>
          <td style="background: linear-gradient(135deg, #4a0f3f 0%, #764ba2 50%, #4a0f3f 100%); height: 12px;"></td>
        </tr>
        
      </table>
    </div>
  `;
}