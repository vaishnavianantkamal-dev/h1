// Port of resources/views/emails/layout.blade.php
const { esc } = require('../MailService');

function layout({ title, header, body, footer }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; }
        .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
        .card { background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: #fff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
        .header p { margin: 8px 0 0; opacity: 0.95; font-size: 14px; }
        .body { padding: 28px 24px; color: #374151; font-size: 15px; line-height: 1.6; }
        .body p { margin: 0 0 14px; }
        .body p:last-child { margin-bottom: 0; }
        .highlight { background: #f0fdfa; border-left: 4px solid #0d9488; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 18px 0; }
        .footer { padding: 20px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center; }
        .btn { display: inline-block; padding: 12px 24px; background: #0d9488; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
        .status-badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; }
        .status-approved { background: #d1fae5; color: #065f46; }
        .status-rejected { background: #fee2e2; color: #991b1b; }
        .reason-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 14px; margin-top: 12px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="card">
            <div class="header">
                ${header}
            </div>
            <div class="body">
                ${body}
            </div>
            ${footer ? `<div class="footer">
                ${footer}
            </div>` : ''}
        </div>
    </div>
</body>
</html>
`;
}

module.exports = { layout };
