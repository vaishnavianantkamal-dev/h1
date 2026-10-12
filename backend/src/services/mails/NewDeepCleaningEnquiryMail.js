// Port of app/Mail/NewDeepCleaningEnquiryMail.php + emails/new_deep_cleaning_enquiry.blade.php
// Usage: await send(enquiry, to)   (to = admin recipient(s))
const { sendMail } = require('../MailService');
const { render } = require('./_enquiryTemplate');

function build(enquiry) {
  return {
    subject: 'New Deep Cleaning Enquiry Received',
    html: render({
      pageTitle: 'New Deep Cleaning Enquiry',
      heading: '\u{1F9F9} New Deep Cleaning Enquiry',
      intro: 'Hello, a new enquiry has been submitted.\n                                Please find the details below.',
      brand: 'Hobit Club',
    }, enquiry),
  };
}

async function send(enquiry, to) {
  const { subject, html } = build(enquiry);
  return sendMail({ to, subject, html });
}

module.exports = { send, build };
