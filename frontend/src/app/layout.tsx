import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const raleway = localFont({
  src: [
    {
      path: "../fonts/Raleway/Raleway-VariableFont_wght.ttf",
      style: "normal",
    },
    {
      path: "../fonts/Raleway/Raleway-Italic-VariableFont_wght.ttf",
      style: "italic",
    },
  ],
  variable: "--font-raleway",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillUp - AI-Powered Learning Platform",
  description: "An AI-powered learning platform that adapts to your skills and helps you master new ones",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#f97316", // orange-500
          colorBackground: "#171717", // neutral-900
          colorText: "#ffffff",
          colorInputBackground: "#262626", // neutral-800
          colorInputText: "#ffffff",
        },
        elements: {
          formButtonPrimary: "bg-orange-500 hover:bg-orange-600 text-white",
          card: "bg-neutral-900 border-neutral-800",
          headerTitle: "text-white",
          headerSubtitle: "text-neutral-400",
          socialButtonsBlockButton: "bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700",
          formFieldLabel: "text-white",
          formFieldInput: "bg-neutral-800 border-neutral-700 text-white",
          footerActionLink: "text-orange-500 hover:text-orange-400",
          // UserButton dropdown styling
          userButtonPopoverCard: "bg-neutral-900 border border-neutral-800",
          userButtonPopoverActionButton: "text-white hover:bg-neutral-800",
          userButtonPopoverActionButtonText: "text-white",
          userButtonPopoverActionButtonIcon: "text-neutral-400",
          userButtonPopoverFooter: "hidden",
          userPreviewMainIdentifier: "text-white",
          userPreviewSecondaryIdentifier: "text-neutral-400",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${raleway.variable} ${geistMono.variable} antialiased font-light`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
