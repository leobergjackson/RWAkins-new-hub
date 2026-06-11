// Built by vsrupeshkumar
import type { NextConfig } from "next";

// ── Dev-only TLS escape hatch ───────────────────────────────────────────────
// Some local dev machines (Windows with corporate proxy / antivirus
// HTTPS interception / missing root CA in Node's bundled trust store) cause
// every outbound fetch from an API route to fail with a generic "fetch failed"
// error. This only happens in dev — Vercel's production runtime has the real
// CA bundle and works fine. We disable TLS validation for dev outbound
// connections so /api/pinata, /api/briefing, /api/portfolio etc. can talk to
// their upstream providers. Production (NODE_ENV=production) is untouched.
if (process.env.NODE_ENV !== 'production' && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
