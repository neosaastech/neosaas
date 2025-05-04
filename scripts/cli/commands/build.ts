import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export async function runBuild() {
  console.log(chalk.cyan('[NeoSaaS] 🔨 Construction du dossier .neosaas/...'));

  const neosaasPath = path.resolve('.neosaas');

  // Supprimer .neosaas existant
  if (fs.existsSync(neosaasPath)) {
    fs.rmSync(neosaasPath, { recursive: true, force: true });
  }

  // Créer les dossiers
  fs.mkdirSync(neosaasPath);
  fs.mkdirSync(path.join(neosaasPath, 'prisma'));
  fs.mkdirSync(path.join(neosaasPath, 'env'));
  fs.mkdirSync(path.join(neosaasPath, 'scripts'));

  // Copier les fichiers essentiels
  fs.copyFileSync('prisma/schema.prisma', path.join(neosaasPath, 'prisma/schema.prisma'));
  fs.copyFileSync('scripts/build/Dockerfile', path.join(neosaasPath, 'Dockerfile'));
  fs.copyFileSync('scripts/build/docker-compose.prod.yml', path.join(neosaasPath, 'docker-compose.prod.yml'));
  fs.copyFileSync('scripts/build/create-admin.ts', path.join(neosaasPath, 'scripts/create-admin.ts'));

  // Copier les fichiers d'environnement si existants
  const envFiles = ['.env', '.env.server', '.env.client'];
  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(neosaasPath, 'env', file));
    }
  });

  console.log(chalk.green('[NeoSaaS] ✅ Construction terminée : tout est dans .neosaas/'));
}
