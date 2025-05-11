
import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Removed the incorrect functional calls for GeistSans and GeistMono.
// The imported GeistSans and GeistMono are objects that directly provide
// the .variable property.

export const metadata: Metadata = {
  title: 'ViseCode - AI Powered Code Analysis',
  description: 'Detect bugs and get fix suggestions for your code.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
