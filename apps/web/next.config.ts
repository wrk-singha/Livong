import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6980";
// CSP `connect-src` needs the scheme to match — http://host doesn't cover
// ws://host. Derive the WS origin from the API origin (http→ws, https→wss).
const wsOrigin = apiOrigin.replace(/^http/, "ws");

const csp = isDev
  ? [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: http: https:",
      "connect-src 'self' http: https: ws: wss:",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  : [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${apiOrigin}`,
      `connect-src 'self' ${apiOrigin} ${wsOrigin}`,
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

const nextConfig: NextConfig = {
  // 192.168.1.16: LAN phone testing. trycloudflare.com: testers via `./livong
  // tunnel`. Next.js dev mode rejects asset/HMR requests from origins not
  // listed here — without trycloudflare, public tunnel URLs serve HTML but
  // _next/static chunks 404, producing a blank white screen on testers' phones.
  allowedDevOrigins: ["192.168.1.16", "*.trycloudflare.com"],
  output: "standalone",
  experimental: {
    // Tree-shake named imports from these packages so the client bundle
    // only ships what you actually use. Reduces "unused-javascript" Lighthouse flag.
    optimizePackageImports: ["@tanstack/react-query"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
