import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemePersonalityProvider } from "@/components/theme-personality-provider";
import { Sidebar, MobileHeader } from "@/components/sidebar";
import { QuickCaptureModal } from "@/components/quick-capture-modal";
import { SearchModal } from "@/components/search/search-modal";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
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

const newsreaderDisplay = Newsreader({
  variable: "--font-orbit-display-base",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${newsreaderDisplay.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem("orbit-theme-personality")||"archivist";document.documentElement.setAttribute("data-orbit-theme",p);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-orbit-bg text-orbit-text min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemePersonalityProvider>
            <ReminderProvider>
              <div className="flex min-h-screen">
                {/* Desktop Sidebar */}
                <Sidebar />

                {/* Main Application Shell */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <MobileHeader />
                  <main className="@container flex-1 min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8 max-w-6xl w-full mx-auto">
                    {children}
                  </main>
                </div>
              </div>

              {/* Global Universal Search Palette (Ctrl+K / Cmd+K) */}
              <SearchModal />

              {/* Global Quick Capture Modal (Ctrl+Shift+K / Cmd+Shift+K) */}
              <QuickCaptureModal />

              {/* First-Time User Onboarding Experience (Phase 10B.3) */}
              <OnboardingWizard />
            </ReminderProvider>
          </ThemePersonalityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
