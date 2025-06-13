// 'use client'; // No longer needed at this level

import type { Metadata } from "next";
import Link from 'next/link';
import { Inter } from "next/font/google";
import "./globals.css";
import 'bulma/css/bulma.min.css';
import { AuthProvider } from '@/contexts/AuthContext'; // useAuth is no longer directly needed here
import Navbar from '@/components/Navbar'; // Import the externalized Navbar
import Image from 'next/image'; // Ensure Image is imported

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = { // This export should work now
  title: "Signalcow Admin",
  description: "Admin interface for Signalcow",
};

// The Navbar function definition has been removed

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" 
          integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer" 
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <Navbar /> {/* Use the imported Navbar component */}
          <main>{children}</main>
          <footer className="footer" style={{ backgroundColor: 'var(--pastel-light-lilac)', paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div className="content has-text-centered">
              <p style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', marginBottom: '1rem' }}>
                <Image src="/signalcow.svg" alt="Signalcow Logo" width={24} height={24} style={{ marginRight: '8px' }} /> 
                <strong>SignalCow</strong>
                <span style={{ marginLeft: '5px', marginRight: '5px' }}>by</span> 
                <a href="https://gummipunkt.eu" style={{ color: 'var(--pastel-lilac)', fontWeight: 'bold' }}>gummipunkt</a>. The source code is licensed
                <a href="https://opensource.org/license/gpl-3-0" style={{ color: 'var(--pastel-lilac)', fontWeight: 'bold', marginLeft: '5px' }}>GPL 3.0</a>. Source code at Github 
                <a href="https://github.com/gummipunkt/signalcow" style={{ color: 'var(--pastel-lilac)', fontWeight: 'bold', marginLeft: '5px' }}>GPL 3.0</a>.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--text-color)' }}>
                <Link href="/impressum" style={{ color: 'var(--pastel-lilac)', fontWeight: 'bold' }}>
                  Legal Notice
                </Link>
                <Link href="/privacy" style={{ color: 'var(--pastel-lilac)', fontWeight: 'bold' }}>
                  Privacy Policy
                </Link>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
