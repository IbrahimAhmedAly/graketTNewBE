export function getVerificationEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تأكيد حسابك</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="460" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#798AB8;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Graket App</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:20px;font-weight:600;text-align:center;">تأكيد بريدك الإلكتروني</h2>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;text-align:center;">أدخل الرمز التالي لتفعيل حسابك</p>

              <!-- OTP Code -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="background-color:#f0f2f8;border:2px solid #798AB8;border-radius:12px;padding:20px 32px;display:inline-block;">
                      <span style="font-size:36px;font-weight:700;color:#798AB8;letter-spacing:12px;font-family:'Courier New',monospace;">${code}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;text-align:center;">صلاحية الرمز 30 دقيقة</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding-top:24px;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
