import { ReactNode } from 'react';
import Head from 'next/head';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function MainLayout({ children, title = 'IOFY - Solar Energy Investment Platform' }: MainLayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="IOFY - Connecting solar panel owners with investors" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <main>{children}</main>
      </div>
    </>
  );
} 