/**
 * enrichment.js — DART Backend
 *
 * Provides four async enrichment functions that call external threat
 * intelligence APIs. Each is wrapped in try/catch with a safe fallback
 * so that a single API failure never breaks the pipeline.
 *
 * enrichAll(ip) runs all four in parallel via Promise.all.
 */

// ----- Environment variables with fallback defaults -----
const GREYNOISE_API_KEY = process.env.GREYNOISE_API_KEY || "";
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY || "";
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";

// ----- Default fallback objects for when an API call fails -----
const GREYNOISE_DEFAULT = {
  classification: "unknown",
  name: "unknown",
  tags: [],
};

const ABUSEIPDB_DEFAULT = {
  abuseConfidenceScore: 0,
  totalReports: 0,
  countryCode: "unknown",
};

const GEOIP_DEFAULT = {
  country: "unknown",
  city: "unknown",
  isp: "unknown",
};

const VIRUSTOTAL_DEFAULT = {
  malicious: 0,
  suspicious: 0,
  harmless: 0,
};

/**
 * Fetch GreyNoise data for a given IP address.
 * Determines if the IP is a known scanner or malicious actor.
 */
async function fetchGreyNoise(ip) {
  try {
    const res = await fetch(
      `https://api.greynoise.io/v3/community/${encodeURIComponent(ip)}`,
      {
        headers: {
          key: GREYNOISE_API_KEY,
          Accept: "application/json",
        },
      }
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
    return { ...GREYNOISE_DEFAULT };
  }
}

/**
 * Fetch AbuseIPDB data for a given IP address.
 * Returns community abuse reports and confidence score.
 */
async function fetchAbuseIPDB(ip) {
  try {
    const res = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      {
        headers: {
          Key: ABUSEIPDB_API_KEY,
          Accept: "application/json",
        },
      }
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
    return { ...ABUSEIPDB_DEFAULT };
  }
}

/**
 * Fetch GeoIP data from ip-api.com (no key required).
 * Returns country, city, and ISP information.
 */
async function fetchGeoIP(ip) {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=country,city,isp`
    );
    if (!res.ok) return { ...GEOIP_DEFAULT };
    const data = await res.json();
    return {
      country: data.country || "unknown",
      city: data.city || "unknown",
      isp: data.isp || "unknown",
    };
  } catch (err) {
    console.error(`[enrichment] GeoIP error for ${ip}:`, err.message);
    return { ...GEOIP_DEFAULT };
  }
}

/**
 * Fetch VirusTotal reputation data for a given IP address.
 * Returns counts of malicious, suspicious, and harmless votes.
 */
async function fetchVirusTotal(ip) {
  try {
    const res = await fetch(
      `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`,
      {
        headers: {
          "x-apikey": VIRUSTOTAL_API_KEY,
          Accept: "application/json",
        },
      }
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
    return { ...VIRUSTOTAL_DEFAULT };
  }
}

/**
 * Run all four enrichment functions in parallel.
 * Returns an object with greynoise, abuseipdb, geoip, and virustotal keys.
 */
async function enrichAll(ip) {
  const [greynoise, abuseipdb, geoip, virustotal] = await Promise.all([
    fetchGreyNoise(ip),
    fetchAbuseIPDB(ip),
    fetchGeoIP(ip),
    fetchVirusTotal(ip),
  ]);

  return { greynoise, abuseipdb, geoip, virustotal };
}

module.exports = {
  fetchGreyNoise,
  fetchAbuseIPDB,
  fetchGeoIP,
  fetchVirusTotal,
  enrichAll,
};
