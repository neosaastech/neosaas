import { ContactForm } from '@/components/contact/contact-form';

export default function ContactPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Contact Us</h1>
      <ContactForm />
    </div>
  );
}