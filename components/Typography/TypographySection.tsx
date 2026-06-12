import { Heading, Text } from '@/components/ui/typography';

interface TypographySectionProps {
  className?: string;
}

export default function TypographySection({ className }: TypographySectionProps) {
  return (
    <section className={`py-12 md:py-20 ${className}`}>
      <div className="container mx-auto px-4">
        <Heading level="h1" className="mb-8">
          Typography
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Heading level="h2" className="mb-4">
              Heading 2
            </Heading>
            <Text className="mb-4">
              This is a paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.
            </Text>
            <Heading level="h3" className="mb-2">
              Heading 3
            </Heading>
            <Text className="mb-4">
              This is a paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.
            </Text>
            <Heading level="h4" className="mb-2">
              Heading 4
            </Heading>
            <Text className="mb-4">
              This is a paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.
            </Text>
          </div>
          <div>
            <Heading level="h2" className="mb-4">
              Heading 2
            </Heading>
            <Text className="mb-4">
              This is a paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.
            </Text>
            <Heading level="h3" className="mb-2">
              Heading 3
            </Heading>
            <Text className="mb-4">
              This is a paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.
            </Text>
            <Heading level="h4" className="mb-2">
              Heading 4
            </Heading>
            <Text className="mb-4">
              This is a paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.
            </Text>
          </div>
        </div>
      </div>
    </section>
  );
}