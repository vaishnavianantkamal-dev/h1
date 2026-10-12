// Port of app/Helpers/PhoneHelper.php
/** Normalize Indian mobile number: "+91 98765-43210" -> "9876543210" */
function normalize(number) {
  if (!number) return null;
  return String(number).replace(/[^0-9]/g, '').slice(-10);
}

module.exports = { normalize };
