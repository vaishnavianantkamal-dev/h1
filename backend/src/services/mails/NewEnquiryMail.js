// Port of app/Mail/NewEnquiryMail.php + emails/new_enquiry.blade.php
// Usage: await send(enquiry, to)   (to = admin recipient(s), as in Mail::to($x)->send(new NewEnquiryMail($enquiry)))
const { sendMail } = require('../MailService');
const { render } = require('./_enquiryTemplate');

function build(enquiry) {
  return {
    subject: 'New Instant Cook Enquiry Received',
    html: render({
      pageTitle: 'New Instant Cook Enquiry',
      heading: '\u{1F373} New Instant Cook Enquiry',
      intro: 'Hello, a new enquiry has been submitted on\n                                <!--<strong>' + require('../../config').appName + '</strong>.-->\n                                Please find the details below.',
      brand: 'Instant Cook',
    }, enquiry),
  };
}

async function send(enquiry, to) {
  const { subject, html } = build(enquiry);
  return sendMail({ to, subject, html });
}

module.exports = { send, build };
