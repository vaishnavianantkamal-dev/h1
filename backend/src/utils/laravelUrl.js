// Port of Illuminate\Support\Str::isUrl (used by the `url` validation rule).
const PROTOCOLS = 'aaa|aaas|about|acap|acct|adt|afp|afs|aim|android|apt|attachment|barion|bitcoin|blob|callto|cap|chrome|cid|coap|coaps|content|crid|cvs|dav|dict|dns|example|facetime|fax|feed|file|finger|fish|ftp|geo|git|go|gopher|gtalk|h323|http|https|iax|icap|im|imap|info|ipp|ipps|irc|irc6|ircs|iris|itms|jabber|jar|ldap|ldaps|magnet|mailserver|mailto|maps|market|message|mid|mms|mongodb|msrp|msrps|news|nfs|nntp|notes|pop|proxy|redis|rediss|res|resource|rmi|rsync|rtmp|rtsp|rtsps|s3|service|session|sftp|sip|sips|skype|smb|sms|smtp|snmp|spotify|ssh|steam|svn|tag|tel|telnet|tftp|turn|turns|tv|udp|urn|vnc|webcal|ws|wss|xmpp';

const AUTH = String.raw`(?:[_.\p{L}\p{N}-]|%[0-9A-Fa-f]{2})+`;
const HOST = String.raw`(?:(?:[\p{L}\p{N}\p{S}\-_.])+(?:\.?(?:[\p{L}\p{N}]|xn--[\p{L}\p{N}-]+)+\.?)|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[[0-9a-f:.]+\])`;
const PATH = String.raw`(?:/(?:[\p{L}\p{N}\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*`;
const QUERY = String.raw`(?:\?(?:[\p{L}\p{N}\-._~!$&'\[\]()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?`;
const FRAG = String.raw`(?:#(?:[\p{L}\p{N}\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?`;

const cache = new Map();
function isUrl(value, protocols = []) {
  if (typeof value !== 'string') return false;
  const list = protocols.length ? protocols.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') : PROTOCOLS;
  let re = cache.get(list);
  if (!re) {
    re = new RegExp(`^(?:${list})://(?:(?:${AUTH}:)?(?:${AUTH})@)?${HOST}(?::[0-9]+)?${PATH}${QUERY}${FRAG}$`, 'iu');
    cache.set(list, re);
  }
  return re.test(value);
}

module.exports = { isUrl };
