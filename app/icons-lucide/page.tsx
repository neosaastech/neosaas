import { Metadata } from 'next';
import IconsLucide from '@/components/IconsLucide/IconsLucide';

export const metadata: Metadata = {
  title: 'Icons — Lucide',
  description: 'Page des icônes Lucide',
};

export default function IconsLucidePage() {
  return (
    <main className="min-h-screen bg-background">
      <IconsLucide />
    </main>
  );
}