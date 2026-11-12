import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar, MobileHeader } from "@/components/sidebar";
import { QuickCaptureModal } from "@/components/quick-capture-modal";
import { SearchModal } from "@/components/search/search-modal";
import { ReminderProvider } from "@/components/reminders/reminder-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaDisplay = Plus_Jakarta_Sans({
  variable: "--font-orbit-display-base",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ORBIT — Personal Space. Everything in Place.",
  description:
    "A private, local-first personal digital assistant for tasks, habits, events, and personal notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-orbit-theme="default"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-orbit-bg text-orbit-text min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReminderProvider>
            <div className="flex min-h-screen">
              {/* Desktop Sidebar */}
              <Sidebar />

              {/* Main Application Shell */}
              <div className="flex flex-1 flex-col">
                <MobileHeader />
                <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
                  {children}
                </main>
              </div>
            </div>

            {/* Global Universal Search Palette (Ctrl+K / Cmd+K) */}
            <SearchModal />

            {/* Global Quick Capture Modal (Ctrl+Shift+K / Cmd+Shift+K) */}
            <QuickCaptureModal />
          </ReminderProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
