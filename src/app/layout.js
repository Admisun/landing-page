import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Admission Strategist | Know Where You'll Get In",
  description: "AI-powered admission intelligence that analyzes your profile, predicts admission chances, and guides you to the colleges most likely to maximize your career outcomes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
