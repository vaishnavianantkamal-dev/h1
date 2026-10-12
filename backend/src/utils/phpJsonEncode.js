// PHP json_encode() with default flags: escapes "/" as "\/" and non-ASCII characters as \uXXXX.
module.exports = (v) => JSON.stringify(v)
  .split('/').join('\\/')
  .replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
