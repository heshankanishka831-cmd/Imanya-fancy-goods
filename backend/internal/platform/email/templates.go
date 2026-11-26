package email

import (
	"fmt"
	"html"
)

const (
	PurposeRegister    = "REGISTER"
	PurposeChangeEmail = "CHANGE_EMAIL"
)

// BuildOTPEmailContent renders responsive HTML and plain-text OTP email bodies
func BuildOTPEmailContent(brandName, recipientName, otpCode, purpose string, expiryMinutes int) (subject string, htmlBody string, textBody string) {
	if brandName == "" {
		brandName = "Imanya Fancy Goods"
	}
	if recipientName == "" {
		recipientName = "Valued Customer"
	}

	safeBrand := html.EscapeString(brandName)
	safeName := html.EscapeString(recipientName)
	safeOTP := html.EscapeString(otpCode)

	heading := "Verify Your Email Address"
	intro := fmt.Sprintf("Thank you for registering with %s. Enter the 6-digit verification code below to verify your email address and activate your customer account.", safeBrand)
	plainIntro := fmt.Sprintf("Thank you for registering with %s. Enter the 6-digit verification code below to verify your email address and activate your customer account.", brandName)
	subject = fmt.Sprintf("%s — Email Verification Code (%d-min expiry)", brandName, expiryMinutes)

	if purpose == PurposeChangeEmail {
		heading = "Confirm Your New Email Address"
		intro = fmt.Sprintf("You requested to update the login email address for your %s customer profile. Enter the 6-digit verification code below to confirm this change.", safeBrand)
		plainIntro = fmt.Sprintf("You requested to update the login email address for your %s customer profile. Enter the 6-digit verification code below to confirm this change.", brandName)
		subject = fmt.Sprintf("%s — Confirm New Email Address", brandName)
	}

	htmlBody = fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>%s</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(15,23,42,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1C4263 0%%,#2C6291 100%%);background-color:#1C4263;padding:28px 28px 24px 28px;text-align:center;">
              <div style="font-size:20px;font-weight:800;letter-spacing:0.6px;color:#ffffff;text-transform:uppercase;">%s</div>
              <div style="font-size:12px;color:#cbd5e1;margin-top:4px;font-weight:600;">Customer Account Verification</div>
            </td>
          </tr>
          <!-- Main Body -->
          <tr>
            <td style="padding:32px 28px 24px 28px;">
              <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:800;color:#0f172a;line-height:1.3;">%s</h1>
              <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#334155;">Hello <strong>%s</strong>,</p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#334155;">%s</p>

              <!-- OTP Box -->
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px 0;">
                <tr>
                  <td align="center" style="background-color:#ebf2f7;border:2px dashed #2C6291;border-radius:14px;padding:20px 16px;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#2C6291;margin-bottom:8px;">One-Time Verification Code</div>
                    <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:900;letter-spacing:8px;color:#1C4263;line-height:1;">%s</div>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <p style="margin:0 0 18px 0;font-size:13px;line-height:1.5;color:#475569;text-align:center;">
                This code will expire in <strong style="color:#0f172a;">%d minutes</strong>.
              </p>

              <!-- Security Warning -->
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;font-size:12px;line-height:1.5;color:#92400e;">
                    <strong>Security Notice:</strong> Never share this verification code with anyone, including store staff. If you did not request this email verification, you can safely ignore this message.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;text-align:center;font-size:11px;color:#64748b;line-height:1.5;">
              Automated security email from <strong>%s</strong>. Please do not reply directly to this message.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, safeBrand, safeBrand, heading, safeName, intro, safeOTP, expiryMinutes, safeBrand)

	textBody = fmt.Sprintf(
		"%s — %s\n\nHello %s,\n\n%s\n\nYour 6-digit verification code is: %s\n\nThis code expires in %d minutes.\n\nSECURITY WARNING: Never share this OTP code with anyone. If you did not initiate this request, please ignore this email.\n\n— %s",
		brandName,
		heading,
		recipientName,
		plainIntro,
		otpCode,
		expiryMinutes,
		brandName,
	)

	return subject, htmlBody, textBody
}
