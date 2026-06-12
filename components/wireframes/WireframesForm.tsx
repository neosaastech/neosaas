import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

// TODO: wire to POST /api/wireframes

const formSchema = z.object({
  desktop1440_1: z.string().min(1, 'Required'),
  desktop1440_2: z.string().min(1, 'Required'),
  desktop1440_3: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof formSchema>;

export function WireframesForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      desktop1440_1: '',
      desktop1440_2: '',
      desktop1440_3: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const response = await fetch('/api/wireframes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Failed to submit');

      toast({
        title: 'Success',
        description: 'Wireframes submitted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit wireframes',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="desktop1440_1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Page — Desktop 1440 (1)</FormLabel>
              <FormControl>
                <Input placeholder="Enter wireframe details" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="desktop1440_2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Page — Desktop 1440 (2)</FormLabel>
              <FormControl>
                <Input placeholder="Enter wireframe details" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="desktop1440_3"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Page — Desktop 1440 (3)</FormLabel>
              <FormControl>
                <Input placeholder="Enter wireframe details" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}