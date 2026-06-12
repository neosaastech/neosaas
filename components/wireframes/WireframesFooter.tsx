import { Card, CardFooter } from '@/components/ui/card';

export function WireframesFooter() {
  return (
    <Card className="mt-6">
      <CardFooter className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} Wireframes Management System
      </CardFooter>
    </Card>
  );
}