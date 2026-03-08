// Patterns that match Log4Shell and its common obfuscations
const LOG4SHELL_PATTERNS = [
  /\$\{jndi:/i,                          // basic pattern
  /\$\{j\$\{\}ndi:/i,                   // obfuscated: j${}ndi
  /\$\{jndi:(ldap|rmi|dns|iiop|ldaps|dnsca):\/\//i,  // protocols
  /\$\{(\$\{\::-j\}|\$\{upper:j\})/i,  // case obfuscation
  /\$\{lower:j\}\$\{lower:n\}\$\{lower:d\}\$\{lower:i\}/i
]

// Headers attackers commonly inject Log4Shell into
const SCANNED_HEADERS = [
  "user-agent",
  "x-api-version",
  "x-forwarded-for-original",
  "referer",
  "accept-language",
  "x-client-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "x-originating-ip",
  "authorization"
]

export function detectLog4Shell(headers) {
  const matches = []

  for (const headerName of SCANNED_HEADERS) {
    const value = headers.get(headerName)
    if (!value) continue

    for (const pattern of LOG4SHELL_PATTERNS) {
      pattern.lastIndex = 0
      if (pattern.test(value)) {
        matches.push({
          header: headerName,
          value: value.substring(0, 500),
          pattern: pattern.toString()
        })
        break // one match per header is enough
      }
    }
  }

  // Also scan all headers for any jndi pattern as catch-all
  for (const [name, value] of headers.entries()) {
    if (SCANNED_HEADERS.includes(name)) continue
    if (/\$\{jndi:/i.test(value)) {
      matches.push({
        header: name,
        value: value.substring(0, 500),
        pattern: "catch-all jndi pattern"
      })
    }
  }

  return {
    detected: matches.length > 0,
    matches,
    match_count: matches.length
  }
}

export function extractJNDIUrl(value) {
  // Extract the JNDI callback URL from the payload
  const match = value.match(
    /\$\{jndi:([^}]+)\}/i
  )
  return match ? match[1] : null
}
