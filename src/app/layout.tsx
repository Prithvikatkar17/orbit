import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar, MobileHeader } from "@/components/sidebar";
import { QuickCaptureModal } from "@/components/quick-capture-modal";
import { ReminderProvider } from "@/components/reminders/reminder-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 min-h-screen">
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

            {/* Global Quick Capture Modal (Cmd+K / Ctrl+K) */}
            <QuickCaptureModal />
          </ReminderProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
