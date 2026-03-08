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

// ----- EICAR SHA256 hash (pre-computed) -----
const EICAR_SHA256 =
  "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f";

// ----- Mock VirusTotal file report for EICAR -----
const MOCK_VT_FILE_EICAR = {
  found: true,
  sha256: EICAR_SHA256,
  malicious: 62,
  suspicious: 0,
  harmless: 0,
  undetected: 6,
  total_engines: 68,
  detection_rate: 91,
  file_type: "EICAR Test File",
  file_size: 68,
  first_submission: "2006-05-15T12:00:00.000Z",
  last_analysis: new Date().toISOString(),
  meaningful_name: "eicar.com",
  tags: ["eicar", "test-file"],
  engines: {
    "CrowdStrike": { category: "malicious", result: "Win.Test.EICAR_HDB-1", method: "blacklist", engine_version: "1.0" },
    "Fortinet": { category: "malicious", result: "EICAR_TEST_FILE", method: "blacklist", engine_version: "6.4" },
    "Kaspersky": { category: "malicious", result: "EICAR-Test-File", method: "exact", engine_version: "22.0" },
    "McAfee": { category: "malicious", result: "EICAR test file", method: "blacklist", engine_version: "6.0" },
    "Microsoft": { category: "malicious", result: "Virus:DOS/EICAR_Test_File", method: "blacklist", engine_version: "1.1" },
    "Symantec": { category: "malicious", result: "EICAR Test String", method: "blacklist", engine_version: "1.21" },
    "TrendMicro": { category: "malicious", result: "Eicar_test_file", method: "blacklist", engine_version: "11.0" },
    "Avast": { category: "malicious", result: "EICAR Test-NOT virus!!!", method: "blacklist", engine_version: "23.1" },
    "AVG": { category: "malicious", result: "EICAR Test-NOT virus!!!", method: "blacklist", engine_version: "23.1" },
    "BitDefender": { category: "malicious", result: "EICAR-Test-File (not a virus)", method: "exact", engine_version: "7.2" },
    "ESET-NOD32": { category: "malicious", result: "Eicar test file", method: "exact", engine_version: "27000" },
    "F-Secure": { category: "malicious", result: "EICAR_Test_File [Trj]", method: "blacklist", engine_version: "18.0" },
    "GData": { category: "malicious", result: "EICAR-Test-File", method: "exact", engine_version: "25.36" },
    "Sophos": { category: "malicious", result: "EICAR-AV-Test", method: "blacklist", engine_version: "2.4" },
    "Panda": { category: "malicious", result: "EICAR-AV-TEST-FILE", method: "blacklist", engine_version: "4.6" },
    "Comodo": { category: "malicious", result: "ApplicUnwnt", method: "blacklist", engine_version: "35700" },
    "DrWeb": { category: "malicious", result: "EICAR Test File (NOT a Virus!)", method: "blacklist", engine_version: "7.0" },
    "Emsisoft": { category: "malicious", result: "EICAR-Test-File (not a virus) (B)", method: "blacklist", engine_version: "2023.1" },
    "FireEye": { category: "malicious", result: "EICAR.TEST.FILE", method: "blacklist", engine_version: "35.24" },
    "Ikarus": { category: "malicious", result: "EICAR-ANTIVIRUS-TESTFILE", method: "exact", engine_version: "6.3" },
    "Jiangmin": { category: "malicious", result: "EICAR-Test-File", method: "exact", engine_version: "16.0" },
    "K7AntiVirus": { category: "malicious", result: "EICAR_Test_File", method: "exact", engine_version: "12.100" },
    "K7GW": { category: "malicious", result: "EICAR_Test_File", method: "exact", engine_version: "12.100" },
    "Malwarebytes": { category: "malicious", result: "EICAR.test.file", method: "blacklist", engine_version: "4.5" },
    "MaxSecure": { category: "malicious", result: "EICAR-Test-File", method: "exact", engine_version: "1.0" },
    "Nano": { category: "malicious", result: "Marker.Dos.EICAR-Test-File.dyb", method: "exact", engine_version: "1.0" },
    "Rising": { category: "malicious", result: "EICAR-Test-File", method: "exact", engine_version: "25.0" },
    "SentinelOne": { category: "malicious", result: "DFI - Suspicious", method: "ai", engine_version: "23.3" },
    "Tencent": { category: "malicious", result: "EICAR.TEST.FILE", method: "blacklist", engine_version: "1.0" },
    "VIPRE": { category: "malicious", result: "EICAR (v)", method: "exact", engine_version: "100000" },
    "ViRobot": { category: "malicious", result: "EICAR-test", method: "blacklist", engine_version: "2014.3" },
    "Yandex": { category: "malicious", result: "EICAR-Test-File", method: "exact", engine_version: "5.5" },
    "ZoneAlarm": { category: "malicious", result: "EICAR-Test-File", method: "exact", engine_version: "1.0" },
    "Zoner": { category: "malicious", result: "EICAR.Test", method: "exact", engine_version: "2.0" },
    "AhnLab-V3": { category: "malicious", result: "EICAR_Test_File", method: "exact", engine_version: "3.22" },
    "Arcabit": { category: "malicious", result: "EICAR-Test-File (not a virus)", method: "exact", engine_version: "2022.0" },
    "Avira": { category: "malicious", result: "Eicar-Test-Signature", method: "blacklist", engine_version: "8.3" },
    "Baidu": { category: "malicious", result: "Win32.Test.EICAR.a", method: "exact", engine_version: "3.9" },
    "CAT-QuickHeal": { category: "malicious", result: "EICAR.TestFile", method: "exact", engine_version: "14.0" },
    "ClamAV": { category: "malicious", result: "Win.Test.EICAR_HDB-1", method: "blacklist", engine_version: "1.0" },
    "Cybereason": { category: "malicious", result: "EICAR_Test_File", method: "ai", engine_version: "1.0" },
    "Cylance": { category: "malicious", result: "Unsafe", method: "ai", engine_version: "2.3" },
    "CrowdStrike-Falcon": { category: "malicious", result: "Win/malicious_confidence_100%", method: "ai", engine_version: "1.0" },
    "Cynet": { category: "malicious", result: "Malicious (score: 100)", method: "ai", engine_version: "4.0" },
    "Elastic": { category: "malicious", result: "EICAR-Test-File", method: "ai", engine_version: "4.0" },
    "Sangfor": { category: "malicious", result: "Virus.Test.EICAR.a", method: "exact", engine_version: "2.14" },
    "Trellix": { category: "malicious", result: "EICAR test file", method: "blacklist", engine_version: "6.0" },
    "TrendMicro-VSAPI": { category: "malicious", result: "Eicar_test_file", method: "blacklist", engine_version: "18.0" },
    "VBA32": { category: "malicious", result: "EICAR-Test-File", method: "exact", engine_version: "5.0" },
    "WithSecure": { category: "malicious", result: "EICAR_Test_File [Trj]", method: "blacklist", engine_version: "18.0" },
    "ZillaSecurity": { category: "malicious", result: "EICAR_Test", method: "ai", engine_version: "1.0" },
    "ALYac": { category: "malicious", result: "EICAR-Test-File (not a virus)", method: "exact", engine_version: "1.0" },
    "Antiy-AVL": { category: "malicious", result: "Virus/EICAR.Test", method: "exact", engine_version: "3.0" },
    "BitDefenderTheta": { category: "malicious", result: "EICAR-Test-File (not a virus)", method: "exact", engine_version: "7.2" },
    "Bkav": { category: "malicious", result: "DOS.EicarTest.Trojan", method: "exact", engine_version: "2.0" },
    "CMC": { category: "malicious", result: "EICAR-Test-File!080000", method: "exact", engine_version: "2.4" },
    "Lionic": { category: "malicious", result: "Test.File.EICAR.y!c", method: "exact", engine_version: "7.5" },
    "SUPERAntiSpyware": { category: "malicious", result: "NotAThreat.EICAR[TestFile]", method: "exact", engine_version: "5.6" },
    "TACHYON": { category: "malicious", result: "EICAR-Test-File", method: "exact", engine_version: "9.0" },
    "Varist": { category: "malicious", result: "EICAR test file", method: "exact", engine_version: "6.5" },
    "Zillya": { category: "malicious", result: "EICAR.TestFile", method: "exact", engine_version: "2.0" },
    "Acronis": { category: "undetected", result: null, method: "blacklist", engine_version: "1.2" },
    "Google": { category: "undetected", result: null, method: "ai", engine_version: "1.0" },
    "Kingsoft": { category: "undetected", result: null, method: "blacklist", engine_version: "2017.9" },
    "MicroWorld-eScan": { category: "undetected", result: null, method: "blacklist", engine_version: "14.0" },
    "Paloalto": { category: "undetected", result: null, method: "ai", engine_version: "1.0" },
    "Trustlook": { category: "undetected", result: null, method: "ai", engine_version: "1.0" },
  },
  raw_stats: { malicious: 62, suspicious: 0, harmless: 0, undetected: 6 },
};

/**
 * Default fallback for VirusTotal file lookups.
 */
function getVirusTotalFileDefault() {
  return {
    found: false,
    sha256: null,
    malicious: 0,
    suspicious: 0,
    harmless: 0,
    undetected: 0,
    total_engines: 0,
    detection_rate: 0,
    engines: {},
    error: "VirusTotal unavailable",
  };
}

/**
 * Fetch VirusTotal file report by SHA256 hash.
 * Separate from the IP reputation check (fetchVirusTotal).
 */
async function fetchVirusTotalFile(sha256) {
  // Mock data for EICAR when no real API key
  if (!hasVirusTotal) {
    if (sha256 === EICAR_SHA256) {
      console.log(`[enrichment] VT File: Using EICAR mock data for ${sha256.substring(0, 16)}...`);
      return { ...MOCK_VT_FILE_EICAR };
    }
    return getVirusTotalFileDefault();
  }

  try {
    const res = await fetch(
      `https://www.virustotal.com/api/v3/files/${sha256}`,
      {
        headers: { "x-apikey": VIRUSTOTAL_API_KEY },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (res.status === 404) {
      return {
        found: false,
        sha256,
        message: "Hash not found in VirusTotal database",
        malicious: 0,
        suspicious: 0,
        harmless: 0,
        undetected: 0,
        engines: {},
      };
    }

    if (!res.ok) {
      throw new Error(`VT API returned ${res.status}`);
    }

    const data = await res.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};
    const results = data.data?.attributes?.last_analysis_results || {};
    const meta = data.data?.attributes || {};

    // Extract per-engine results
    const engines = {};
    for (const [engineName, engineResult] of Object.entries(results)) {
      engines[engineName] = {
        category: engineResult.category,
        result: engineResult.result,
        method: engineResult.method,
        engine_version: engineResult.engine_version,
      };
    }

    return {
      found: true,
      sha256,
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
      total_engines: Object.keys(engines).length,
      detection_rate: stats.malicious
        ? Math.round((stats.malicious / Object.keys(engines).length) * 100)
        : 0,
      file_type: meta.type_description || "unknown",
      file_size: meta.size || 0,
      first_submission: meta.first_submission_date
        ? new Date(meta.first_submission_date * 1000).toISOString()
        : null,
      last_analysis: meta.last_analysis_date
        ? new Date(meta.last_analysis_date * 1000).toISOString()
        : null,
      meaningful_name: meta.meaningful_name || null,
      tags: meta.tags || [],
      engines,
      raw_stats: stats,
    };
  } catch (err) {
    console.error("[VT File] Error:", err.message);
    if (sha256 === EICAR_SHA256) {
      return { ...MOCK_VT_FILE_EICAR };
    }
    return getVirusTotalFileDefault();
  }
}

module.exports = {
  fetchGreyNoise,
  fetchAbuseIPDB,
  fetchGeoIP,
  fetchVirusTotal,
  fetchVirusTotalFile,
  enrichAll,
  resolveEnrichmentIP,
};
