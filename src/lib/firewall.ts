// First barrier: runs on every request (src/middleware.ts) before any page, action or API code.
// It turns away obvious junk cheaply. It is a filter, not the defence: queries stay parameterised
// (Prisma), output stays escaped (React + CSP) and every action re-checks who is calling.

export type Verdict = { status: number; reason: string } | null;

const KB = 1024;
const MB = 1024 * KB;
/** Forms that carry photos or documents. Everything else is plain text and stays small. */
const UPLOAD_PREFIXES = ["/account", "/driver", "/fleet", "/bookings"];
export const MAX_FORM_BYTES = 1 * MB;
export const MAX_UPLOAD_BYTES = 30 * MB;
const MAX_URL_LENGTH = 2048;

// Paths that only vulnerability scanners ask for: other platforms' admin pages and leaked files.
const SCANNER_PATHS = /\.(php\d?|asp|aspx|jsp|cgi|env|ini|sql|bak|old|swp|log)$|\/\.(git|env|svn|htaccess|aws|ssh)|\/(wp-|wordpress|phpmyadmin|cgi-bin|vendor\/phpunit)/i;
// Automated attack tools announce themselves.
const SCANNER_AGENTS = /sqlmap|nikto|nmap|masscan|acunetix|nessus|wpscan|dirbuster|gobuster|ffuf|zgrab|havij|openvas|nuclei/i;
// Attack signatures in the query string. Real visitors never send these.
const ATTACK_PATTERNS = [
  /<\s*script/i,
  /javascript\s*:/i,
  /on(error|load|mouseover)\s*=/i,
  /\bunion\b[\s\S]*\bselect\b/i,
  /\b(select|insert|update|delete|drop|alter)\b[\s\S]*\b(from|into|table|set)\b[\s\S]*(--|;|\/\*)/i,
  /'\s*(or|and)\s*'?\d*'?\s*=\s*'?\d/i,
  /\b(information_schema|sqlite_master|pg_catalog|sleep\s*\(|benchmark\s*\(|waitfor\s+delay)/i,
  /\.\.[\\/]/,
  /%00|\x00/,
];

function decode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

export function inspectRequest(req: {
  method: string;
  pathname: string;
  search: string;
  userAgent: string;
  contentLength: number | null;
}): Verdict {
  if (req.pathname.length + req.search.length > MAX_URL_LENGTH) return { status: 414, reason: "url too long" };
  if (SCANNER_AGENTS.test(req.userAgent)) return { status: 403, reason: "scanner user agent" };
  if (SCANNER_PATHS.test(req.pathname)) return { status: 404, reason: "scanner path" };

  const query = decode(decode(req.search));
  if (ATTACK_PATTERNS.some((p) => p.test(query) || p.test(decode(req.pathname)))) return { status: 400, reason: "attack pattern" };

  if (req.method !== "GET" && req.method !== "HEAD" && req.contentLength !== null) {
    const upload = UPLOAD_PREFIXES.some((p) => req.pathname === p || req.pathname.startsWith(`${p}/`));
    if (req.contentLength > (upload ? MAX_UPLOAD_BYTES : MAX_FORM_BYTES)) return { status: 413, reason: "body too large" };
  }
  return null;
}
