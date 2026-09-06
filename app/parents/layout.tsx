import type { Metadata } from 'next';
export const metadata: Metadata = { title: '保護者設定 | おでかけガレージ' };
export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
