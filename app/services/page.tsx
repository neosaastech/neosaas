import { Metadata } from 'next';
import { ServiceForm } from '@/components/services/service-form';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Manage your services',
};

export default function ServicesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Services</h1>
      <ServiceForm />
    </div>
  );
}