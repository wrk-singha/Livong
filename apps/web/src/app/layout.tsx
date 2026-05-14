import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth";
import { ThemeProvider } from "@/contexts/theme";
import { FlagsProvider } from "@/contexts/flags";
import { QueryProvider } from "@/lib/query";
import AppShell from "@/components/AppShell";
import { ConsentBanner } from "@/components/ConsentBanner";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { PageTitle } from "@/lib/PageTitle";

// SW registration is non-critical and runs after first paint — lazy-load
// to keep it out of the initial JS bundle. Component is "use client" + useEffect,
// so SSR is a no-op anyway; dynamic() defers the chunk download.
const ServiceWorkerRegistrar = dynamic(
  () => import("@/components/ServiceWorkerRegistrar")
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // No `title` here — per-route titles set via <PageTitle> in lib/PageTitle.tsx.
  // Adding a title here would cause Next.js MetadataOutlet to render a 2nd
  // <title> tag in <head> after PageTitle's, and the browser uses the last one.
  description: "The smarter way to find compatible people to share a home with",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Livong",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  // Don't set maximumScale or userScalable=false — that produces user-scalable=no,
  // which breaks pinch-zoom for low-vision users (WCAG fail).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Set theme class before hydration to avoid FOUC. Mirrors getInitialTheme() in contexts/theme.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Default title — any page-level <PageTitle> overrides via React 19 hoist. */}
        <PageTitle title={null} />
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <FlagsProvider>
                <ServiceWorkerRegistrar />
                <MaintenanceGate>
                  <AppShell>{children}</AppShell>
                </MaintenanceGate>
                <ConsentBanner />
              </FlagsProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
