const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (toEmail, otpCode) => {
  await transporter.sendMail({
    from: `"KimmyStore" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your Password Reset OTP",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #f9a8d4, #ec4899); padding: 36px 40px;">
              <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:700; letter-spacing:1px;">
                🛍️ KimmyStore
              </h1>
              <p style="margin:8px 0 0; color:#fce7f3; font-size:14px;">
                Password Reset Request
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">

              <p style="margin:0 0 8px; font-size:15px; color:#374151;">Hi there 👋</p>
              <p style="margin:0 0 28px; font-size:15px; color:#6b7280; line-height:1.6;">
                We received a request to reset your password. Use the OTP code below to continue. 
                This code expires in <strong style="color:#111827;">10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <div style="
                      display: inline-block;
                      background: #fdf2f8;
                      border: 2px dashed #f9a8d4;
                      border-radius: 12px;
                      padding: 24px 48px;
                    ">
                      <p style="margin:0 0 4px; font-size:12px; color:#9ca3af; letter-spacing:2px; text-transform:uppercase;">Your OTP Code</p>
                      <p style="margin:0; font-size:42px; font-weight:800; letter-spacing:16px; color:#ec4899;">
                        ${otpCode}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="
                    background: #fff7ed;
                    border-left: 4px solid #fb923c;
                    border-radius: 8px;
                    padding: 14px 16px;
                  ">
                    <p style="margin:0; font-size:13px; color:#92400e;">
                      ⚠️ <strong>Never share this code</strong> with anyone. KimmyStore will never ask for your OTP.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:13px; color:#9ca3af; line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email. 
                Your password will remain unchanged.
              </p>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border:none; border-top:1px solid #f3f4f6; margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 40px;">
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                © 2026 KimmyStore · All rights reserved
              </p>
              <p style="margin:6px 0 0; font-size:12px; color:#d1d5db;">
                This is an automated email, please do not reply.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Card -->

      </td>
    </tr>
  </table>

</body>
</html>
    `,
  });
};

module.exports = { sendOtpEmail };