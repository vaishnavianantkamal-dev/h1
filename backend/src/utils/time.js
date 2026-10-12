// Carbon-like helpers. App timezone is Asia/Kolkata; process TZ is forced to it in server.js,
// so plain dayjs() behaves like Carbon::now().
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));
dayjs.extend(require('dayjs/plugin/customParseFormat'));
dayjs.extend(require('dayjs/plugin/isBetween'));
dayjs.extend(require('dayjs/plugin/isSameOrAfter'));
dayjs.extend(require('dayjs/plugin/isSameOrBefore'));
dayjs.extend(require('dayjs/plugin/weekOfYear'));
dayjs.extend(require('dayjs/plugin/duration'));

const now = () => dayjs();
const today = () => dayjs().format('YYYY-MM-DD');
const fmt = (d, f = 'YYYY-MM-DD HH:mm:ss') => (d ? dayjs(d).format(f) : null);

module.exports = { dayjs, now, today, fmt };
