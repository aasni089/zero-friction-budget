import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Zero Friction Budget - Track Household Expenses Together",
  description: "Simple budgeting, powerful insights for families. Real-time collaboration to track household expenses and stay on budget. Free to start, no credit card required.",
  keywords: ["budget tracker", "household expenses", "family budget", "expense tracking", "collaborative budgeting"],
  authors: [{ name: "Zero Friction Budget" }],
  openGraph: {
    title: "Zero Friction Budget - Track Household Expenses Together",
    description: "Simple budgeting, powerful insights for families. Real-time collaboration to track household expenses and stay on budget.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zero Friction Budget - Track Household Expenses Together",
    description: "Simple budgeting, powerful insights for families. Real-time collaboration to track household expenses and stay on budget.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
