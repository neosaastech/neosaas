import { Metadata } from 'next';
import { WireframesForm } from '@/components/wireframes/WireframesForm';

export const metadata: Metadata = {
  title: 'Wireframes',
  description: 'Manage wireframes for your project',
};

export default function WireframesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Wireframes</h1>
      <WireframesForm />
    </div>
  );
}