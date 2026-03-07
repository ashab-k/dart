/**
 * enrichment.js — DART Backend
 *
 * Provides four async enrichment functions that call external threat
 * intelligence APIs. Each is wrapped in try/catch with a safe fallback
 * so that a single API failure never breaks the pipeline.
 *
 * enrichAll(ip) runs all four in parallel via Promise.all.
 * If the IP is internal/Docker, it's swapped for a known-bad IP.
 *
 * When API keys are placeholder values ("your_key_here"), the system
 * falls back to curated mock data for known IPs so the demo still
 * produces realistic enrichment results.
 */

// ----- Environment variables with fallback defaults -----
const GREYNOISE_API_KEY = process.env.GREYNOISE_API_KEY || "";
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY || "";
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";

// Check if keys are real or placeholder
const hasGreyNoise = GREYNOISE_API_KEY && GREYNOISE_API_KEY !== "your_key_here";
const hasAbuseIPDB = ABUSEIPDB_API_KEY && ABUSEIPDB_API_KEY !== "your_key_here";
const hasVirusTotal = VIRUSTOTAL_API_KEY && VIRUSTOTAL_API_KEY !== "your_key_here";

console.log(`[enrichment] API keys: GreyNoise=${hasGreyNoise ? "✓" : "✗ (mock)"} AbuseIPDB=${hasAbuseIPDB ? "✓" : "✗ (mock)"} VirusTotal=${hasVirusTotal ? "✓" : "✗ (mock)"} GeoIP=✓ (free)`);

// ----- Known-bad IPs for internal IP fallback -----
const KNOWN_BAD_IPS = [
  "185.220.101.34",
  "45.142.212.100",
  "89.248.167.131",
  "198.235.24.130",
  "80.82.77.139",
];

// ----- Curated mock data for known malicious IPs -----
// Used when API keys are placeholder values so the demo works out of the box.
const MOCK_DATA = {
  "185.220.101.34": {
    greynoise: { classification: "malicious", name: "Tor Exit Node", tags: ["tor", "vpn"] },
    abuseipdb: { abuseConfidenceScore: 100, totalReports: 2847, countryCode: "DE" },
    virustotal: { malicious: 12, suspicious: 3, harmless: 58 },
  },
  "45.142.212.100": {
    greynoise: { classification: "malicious", name: "Mass Scanner", tags: ["scanner", "bruteforce"] },
    abuseipdb: { abuseConfidenceScore: 100, totalReports: 5213, countryCode: "RU" },
    virustotal: { malicious: 8, suspicious: 2, harmless: 63 },
  },
  "89.248.167.131": {
    greynoise: { classification: "malicious", name: "Recyber Scanning", tags: ["scanner", "web-crawler"] },
    abuseipdb: { abuseConfidenceScore: 100, totalReports: 9841, countryCode: "NL" },
    virustotal: { malicious: 6, suspicious: 1, harmless: 66 },
  },
  "198.235.24.130": {
    greynoise: { classification: "malicious", name: "Known Botnet C2", tags: ["botnet", "c2"] },
    abuseipdb: { abuseConfidenceScore: 87, totalReports: 1523, countryCode: "US" },
    virustotal: { malicious: 15, suspicious: 4, harmless: 52 },
  },
  "80.82.77.139": {
    greynoise: { classification: "malicious", name: "Censys Scanner", tags: ["scanner", "shodan"] },
    abuseipdb: { abuseConfidenceScore: 100, totalReports: 7632, countryCode: "NL" },
    virustotal: { malicious: 9, suspicious: 2, harmless: 61 },
  },
};

/**
 * If the IP is internal (localhost, Docker, private), substitute
 * a known-bad IP so enrichment APIs return real data.
 */
function resolveEnrichmentIP(ip) {
  const internalPatterns = [
    /^127\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^10\./,
    /^::1$/,
    /^unknown$/,
    /^simulated/,
  ];
  const isInternal = internalPatterns.some((p) => p.test(ip));
  if (isInternal) {
    const fallback = KNOWN_BAD_IPS[Math.floor(Math.random() * KNOWN_BAD_IPS.length)];
    console.log(`[enrichment] Internal IP "${ip}" → using ${fallback} for enrichment`);
    return fallback;
  }
  return ip;
}

// ----- Default fallback objects for when an API call fails -----
const GREYNOISE_DEFAULT = { classification: "unknown", name: "unknown", tags: [] };
const ABUSEIPDB_DEFAULT = { abuseConfidenceScore: 0, totalReports: 0, countryCode: "unknown" };
const GEOIP_DEFAULT = { country: "unknown", city: "unknown", isp: "unknown" };
const VIRUSTOTAL_DEFAULT = { malicious: 0, suspicious: 0, harmless: 0 };

/**
 * Fetch GreyNoise data for a given IP address.
 */
async function fetchGreyNoise(ip) {
  // Use mock data if no real API key
  if (!hasGreyNoise) {
    return MOCK_DATA[ip]?.greynoise || { ...GREYNOISE_DEFAULT };
  }
  try {
    const res = await fetch(
      `https://api.greynoise.io/v3/community/${encodeURIComponent(ip)}`,
      { headers: { key: GREYNOISE_API_KEY, Accept: "application/json" } }
    );
    if (!res.ok) return { ...GREYNOISE_DEFAULT };
    const data = await res.json();
    return {
      classification: data.classification || "unknown",
      name: data.name || "unknown",
      tags: data.tags || [],
    };
  } catch (err) {
    console.error(`[enrichment] GreyNoise error for ${ip}:`, err.message);
    return MOCK_DATA[ip]?.greynoise || { ...GREYNOISE_DEFAULT };
  }
}

/**
 * Fetch AbuseIPDB data for a given IP address.
 */
async function fetchAbuseIPDB(ip) {
  if (!hasAbuseIPDB) {
    return MOCK_DATA[ip]?.abuseipdb || { ...ABUSEIPDB_DEFAULT };
  }
  try {
    const res = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      { headers: { Key: ABUSEIPDB_API_KEY, Accept: "application/json" } }
    );
    if (!res.ok) return { ...ABUSEIPDB_DEFAULT };
    const json = await res.json();
    const data = json.data || {};
    return {
      abuseConfidenceScore: data.abuseConfidenceScore ?? 0,
      totalReports: data.totalReports ?? 0,
      countryCode: data.countryCode || "unknown",
    };
  } catch (err) {
    console.error(`[enrichment] AbuseIPDB error for ${ip}:`, err.message);
    return MOCK_DATA[ip]?.abuseipdb || { ...ABUSEIPDB_DEFAULT };
  }
}

/**
 * Fetch GeoIP data from ip-api.com (no key required, 45 req/min free tier).
 */
async function fetchGeoIP(ip) {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=country,city,isp`
    );
    if (!res.ok) return { ...GEOIP_DEFAULT };
    const data = await res.json();
    if (data.country) {
      return {
        country: data.country || "unknown",
        city: data.city || "unknown",
        isp: data.isp || "unknown",
      };
    }
    return { ...GEOIP_DEFAULT };
  } catch (err) {
    console.error(`[enrichment] GeoIP error for ${ip}:`, err.message);
    return { ...GEOIP_DEFAULT };
  }
}

/**
 * Fetch VirusTotal reputation data for a given IP address.
 */
async function fetchVirusTotal(ip) {
  if (!hasVirusTotal) {
    return MOCK_DATA[ip]?.virustotal || { ...VIRUSTOTAL_DEFAULT };
  }
  try {
    const res = await fetch(
      `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`,
      { headers: { "x-apikey": VIRUSTOTAL_API_KEY, Accept: "application/json" } }
    );
    if (!res.ok) return { ...VIRUSTOTAL_DEFAULT };
    const json = await res.json();
    const stats = json.data?.attributes?.last_analysis_stats || {};
    return {
      malicious: stats.malicious ?? 0,
      suspicious: stats.suspicious ?? 0,
      harmless: stats.harmless ?? 0,
    };
  } catch (err) {
    console.error(`[enrichment] VirusTotal error for ${ip}:`, err.message);
    return MOCK_DATA[ip]?.virustotal || { ...VIRUSTOTAL_DEFAULT };
  }
}

/**
 * Run all four enrichment functions in parallel.
 * Resolves internal IPs to known-bad IPs for real API data.
 */
async function enrichAll(ip) {
  const enrichIP = resolveEnrichmentIP(ip);
  console.log(`[enrichment] Enriching IP: ${enrichIP} (original: ${ip})`);

  const [greynoise, abuseipdb, geoip, virustotal] = await Promise.all([
    fetchGreyNoise(enrichIP),
    fetchAbuseIPDB(enrichIP),
    fetchGeoIP(enrichIP),
    fetchVirusTotal(enrichIP),
  ]);

  console.log(`[enrichment] Results for ${enrichIP}: GN=${greynoise.classification} Abuse=${abuseipdb.abuseConfidenceScore}% Geo=${geoip.country} VT=${virustotal.malicious}`);

  return {
    enrichedIP: enrichIP,
    greynoise,
    abuseipdb,
    geoip,
    virustotal,
  };
}

module.exports = {
  fetchGreyNoise,
  fetchAbuseIPDB,
  fetchGeoIP,
  fetchVirusTotal,
  enrichAll,
};
