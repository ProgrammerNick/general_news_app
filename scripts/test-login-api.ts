/**
 * Quick test of the sign-in API. Run with: npx tsx scripts/test-login-api.ts
 * Start the app first (npm run dev:all) in another terminal.
 */
const BASE = "http://localhost:3001";

async function main() {
  const email = process.argv[2] || "test@example.com";
  const password = process.argv[3] || "password123";

  console.log("Testing POST", `${BASE}/api/auth/sign-in/email`, { email, password: "***" });

  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep as text
  }

  console.log("Status:", res.status, res.statusText);
  console.log("OK?", res.ok);
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) console.log("Set-Cookie: present");
  else console.log("Set-Cookie: (none)");
  console.log("Body:", typeof body === "object" ? JSON.stringify(body, null, 2) : body);

  if (!res.ok && res.status < 300) {
    console.log("\n→ Sign-in failed. Check: 1) Server running (npm run dev:all), 2) DATABASE_URL in .env, 3) DB migrations run (npm run db:migrate), 4) User exists (register first).");
  }
}

main().catch((e) => {
  console.error("Request failed:", e.message);
  process.exit(1);
});
