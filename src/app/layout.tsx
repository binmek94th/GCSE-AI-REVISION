import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {Navigation} from "@/app/components/ui/Navigation";
import {Toaster} from "@/app/components/ui/sonner";
import Analytics from "@/app/components/analytics/Analytics";
import CookieBanner from "@/app/components/analytics/CookieBanner";
import JsonLd from "@/app/components/seo/JsonLd";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, absoluteUrl } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "StudyCedo – AI GCSE & A-Level Revision, Study Plans & Mock Exams",
    template: "%s | StudyCedo",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "GCSE revision",
    "A-Level revision",
    "AI tutor",
    "GCSE study plan",
    "GCSE mock exams",
    "GCSE quizzes",
    "revision notes",
    "online tutoring",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
    title: "StudyCedo – AI GCSE & A-Level Revision",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyCedo – AI GCSE & A-Level Revision",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

// Tells Google who runs the site and that this is the site's search-result name.
const siteSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "StudyCedo",
    legalName: "StudyCedo Ltd",
    url: SITE_URL,
    logo: absoluteUrl("/StudyCedoLogo.png"),
    email: "support@studycedo.com",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "StudyCedo",
    description: SITE_DESCRIPTION,
    inLanguage: "en-GB",
    publisher: { "@id": `${SITE_URL}/#organization` },
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <JsonLd data={siteSchema} />
      <Toaster></Toaster>
      <Navigation ></Navigation>
        {children}
      <Analytics />
      <CookieBanner />
      </body>
    </html>
  );
}
