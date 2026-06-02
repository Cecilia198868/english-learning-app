import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import LanguageProvider from "@/components/LanguageProvider";
import PageViewTracker from "@/components/PageViewTracker";
import PwaRegister from "@/components/PwaRegister";
import { normalizeLanguage, LANGUAGE_COOKIE_NAME } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const displayPreferenceScript = `
(() => {
  const themeKey = "speakflow-appearance-preference";
  const brightnessKey = "speakflow-display-brightness";
  const fontSizeKey = "speakflow-font-size-preference";
  const validThemes = new Set(["light", "dark"]);
  const validBrightness = new Set(["dim", "standard", "bright"]);
  const validFontSizes = new Set(["small", "standard", "large"]);

  try {
    const root = document.documentElement;
    const theme = localStorage.getItem(themeKey);
    const brightness = localStorage.getItem(brightnessKey);
    const fontSize = localStorage.getItem(fontSizeKey);

    root.dataset.appTheme = validThemes.has(theme) ? theme : "light";
    root.dataset.speakflowTheme = root.dataset.appTheme;
    root.dataset.appBrightness = validBrightness.has(brightness)
      ? brightness
      : "standard";
    root.dataset.speakflowFontSize = validFontSizes.has(fontSize)
      ? fontSize
      : "standard";
  } catch {
    document.documentElement.dataset.appTheme = "light";
    document.documentElement.dataset.appBrightness = "standard";
    document.documentElement.dataset.speakflowFontSize = "standard";
  }
})();
`;

export const metadata: Metadata = {
  applicationName: "SpeakFlow",
  title: "SpeakFlow",
  description: "English speaking practice workspace",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SpeakFlow",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icons/pwa-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/pwa-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#c7bbff",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(
    cookieStore.get(LANGUAGE_COOKIE_NAME)?.value
  );

  return (
    <html
      lang={initialLanguage}
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col"
      >
        <script dangerouslySetInnerHTML={{ __html: displayPreferenceScript }} />
        <LanguageProvider initialLanguage={initialLanguage}>
          <PwaRegister />
          <PageViewTracker />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
