import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sofiaPro = localFont({
  variable: "--font-sofia-pro",
  src: [
    { path: "../fonts/SofiaPro-Regular.otf", weight: "400" },
    { path: "../fonts/SofiaPro-Medium.otf", weight: "500" },
    { path: "../fonts/SofiaPro-SemiBold.otf", weight: "600" },
    { path: "../fonts/SofiaPro-Bold.otf", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: "Dove Rewind",
  description: "Rewind damaged hair back to healthy, with Dove.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sofiaPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
