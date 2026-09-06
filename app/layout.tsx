import type { Metadata, Viewport } from 'next';
import './globals.css';
import './motor-park.css';
export const metadata: Metadata = {
  title: 'どうぶつの おでかけガレージ',
  description:
    'どうぶつとおでかけ。あそぶたび、きみのおにわが育つ。2〜3歳向けのやさしいタッチゲーム。',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'おでかけ' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#142f51',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
