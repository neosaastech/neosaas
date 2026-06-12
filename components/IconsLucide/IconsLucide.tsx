import React from 'react';
import { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface IconsLucideProps {
  // Ajoutez ici les props si nécessaire
}

export default function IconsLucide({}: IconsLucideProps) {
  const icons = Object.entries(LucideIcons)
    .filter(([key]) => !key.endsWith('Icon'))
    .map(([key, Icon]) => {
      return {
        name: key,
        icon: Icon as LucideIcon,
      };
    });

  return (
    <section className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Icons — Lucide</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {icons.map(({ name, icon: Icon }) => (
          <div key={name} className="flex flex-col items-center p-4 border rounded-lg">
            <Icon className="w-8 h-8 mb-2" />
            <span className="text-sm text-center">{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}