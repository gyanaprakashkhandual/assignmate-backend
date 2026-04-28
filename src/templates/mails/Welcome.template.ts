export const welcomeTemplate = (name: string, email: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Assignmate</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Georgia',serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">

          <tr>
            <td style="padding:40px 48px 32px;border-bottom:1px solid #f0f0f0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="8" y="4" width="28" height="36" rx="3" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1.5"/>
                      <line x1="14" y1="14" x2="30" y2="14" stroke="#d1d5db" stroke-width="1" stroke-linecap="round"/>
                      <line x1="14" y1="19" x2="30" y2="19" stroke="#d1d5db" stroke-width="1" stroke-linecap="round"/>
                      <line x1="14" y1="24" x2="24" y2="24" stroke="#d1d5db" stroke-width="1" stroke-linecap="round"/>
                      <g transform="rotate(-40, 34, 34)">
                        <rect x="30" y="20" width="6" height="18" rx="1.5" fill="#111827"/>
                        <polygon points="30,38 36,38 33,44" fill="#374151"/>
                        <rect x="30" y="20" width="6" height="4" rx="1" fill="#9ca3af"/>
                      </g>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.5px;">Assign<span style="color:#9ca3af;">mate</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px 0;">
              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">Welcome aboard</p>
              <h1 style="margin:0 0 20px;font-size:28px;font-weight:700;color:#111827;line-height:1.2;">Hello, ${name} 👋</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
                Your Assignmate account is ready. You can now upload your handwriting, generate AI-powered assignments, and export beautiful handwritten PDFs — all in your own style.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 48px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:6px;border:1px solid #f0f0f0;">
                <tr>
                  <td style="padding:24px 28px;">

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="vertical-align:top;padding-right:14px;width:32px;">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="3" fill="#111827"/>
                            <path d="M8 12l3 3 5-5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Upload your handwriting</p>
                          <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">One photo is all it takes to clone your style</p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="vertical-align:top;padding-right:14px;width:32px;">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="3" fill="#111827"/>
                            <path d="M8 12l3 3 5-5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Generate your assignment</p>
                          <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">Type a question or topic and let AI do the rest</p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:top;padding-right:14px;width:32px;">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="3" fill="#111827"/>
                            <path d="M8 12l3 3 5-5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Download as PDF</p>
                          <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">Export a realistic handwritten PDF instantly</p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 48px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#111827;border-radius:6px;">
                    <a href="${process.env.FRONTEND_URL ?? '#'}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;font-family:'Georgia',serif;">
                      Get Started →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 48px;border-top:1px solid #f0f0f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:12px;color:#d1d5db;">Signed in as</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;">${email}</p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:12px;color:#d1d5db;">© 2025 Assignmate</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <p style="margin:20px 0 0;font-size:11px;color:#d1d5db;text-align:center;">
          You received this email because you just created an Assignmate account.
        </p>

      </td>
    </tr>
  </table>

</body>
</html>
`;