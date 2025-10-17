// src/app/layout.js
import './globals.css';
import { Inter } from 'next/font/google';
import Header from '../components/layout/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'The Trust Gambit',
    description: 'A game of strategy, reputation, and risk.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <div className="flex flex-col min-h-screen bg-gray-50">
                    <Header />
                    <main className="flex-grow">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}