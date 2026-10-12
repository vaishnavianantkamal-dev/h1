// Shared markup of emails/new_enquiry.blade.php and emails/new_deep_cleaning_enquiry.blade.php
// (the two views differ only in title/heading/intro/footer-brand).
const dayjs = require('dayjs');
const { esc } = require('../MailService');

const label = (t) => `<p style="margin: 0; font-size: 12px; color: #999999; text-transform: uppercase; letter-spacing: 1px;">
                                            ${t}
                                        </p>`;
const divider = '<tr><td style="border-bottom: 1px solid #f0f0f0; padding: 6px 0;"></td></tr>';

function render({ pageTitle, heading, intro, brand }, enquiry) {
  const receivedOn = enquiry.created_at ? dayjs(enquiry.created_at).format('DD MMM YYYY, hh:mm A') : '';
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${pageTitle}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px 0;">

                <table width="600" cellpadding="0" cellspacing="0" border="0"
                    style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">

                    <tr>
                        <td style="background-color: #3d8bff; padding: 24px 30px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-family: Arial, sans-serif;">
                                ${heading}
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 24px 30px 8px 30px;">
                            <p style="margin: 0; color: #444444; font-size: 15px;">
                                ${intro}
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 12px 30px;">
                            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;" />
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 0 30px 20px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">

                                <tr>
                                    <td style="padding: 10px 0 4px 0;">
                                        ${label('Full Name')}
                                        <p style="margin: 4px 0 0 0; font-size: 15px; color: #222222; font-weight: bold;">
                                            ${esc(enquiry.name)}
                                        </p>
                                    </td>
                                </tr>

                                ${divider}

                                <tr>
                                    <td style="padding: 10px 0 4px 0;">
                                        ${label('Contact Number')}
                                        <p style="margin: 4px 0 0 0; font-size: 15px; color: #222222; font-weight: bold;">
                                            ${esc(enquiry.contact_no)}
                                        </p>
                                    </td>
                                </tr>

                                ${divider}

                                <tr>
                                    <td style="padding: 10px 0 4px 0;">
                                        ${label('Email Address')}
                                        <p style="margin: 4px 0 0 0; font-size: 15px; color: #222222; font-weight: bold;">
                                            <a href="mailto:${esc(enquiry.email)}"
                                               style="color: #3d8bff; text-decoration: none;">
                                                ${esc(enquiry.email)}
                                            </a>
                                        </p>
                                    </td>
                                </tr>

                                ${divider}

                                <tr>
                                    <td style="padding: 10px 0 4px 0;">
                                        ${label('Requirements')}
                                        <div style="margin-top: 8px; background-color: #fff8f1; border-left: 4px solid #3d8bff;
                                                    padding: 12px 16px; border-radius: 4px; font-size: 14px;
                                                    color: #333333; line-height: 1.6;">
                                            ${esc(enquiry.requirements)}
                                        </div>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #fafafa; border-top: 1px solid #eeeeee; padding: 14px 30px;">
                            <p style="margin: 0; font-size: 13px; color: #888888;">
                                \u{1F4C5} Received on:
                                <strong style="color: #555555;">
                                    ${esc(receivedOn)}
                                </strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #3d8bff; padding: 16px 30px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #ffffff;">
                                © ${new Date().getFullYear()} ${brand} &bull; hobit.club &bull;
                                <a href="mailto:noreply@hobit.club"
                                   style="color: #ffffff; text-decoration: underline;">
                                   noreply@hobit.club
                                </a>
                            </p>
                            <p style="margin: 6px 0 0 0; font-size: 11px; color: #ffccaa;">
                                You are receiving this email because you are registered as an admin on Hobit Club.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>`;
}

module.exports = { render };
