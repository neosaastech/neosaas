import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export async function runInit() {
  console.log(chalk.cyan('[NeoSaaS] 🛠️ Initialisation du projet...'));

  if (!fs.existsSync('src')) {
    fs.mkdirSync('src');
    fs.writeFileSync('src/index.ts', '// Bienvenue dans NeoSaaS');
  }

  if (!fs.existsSync('prisma')) {
    fs.mkdirSync('prisma');
    fs.writeFileSync('prisma/schema.prisma', '// schema Prisma');
  }

  console.log(chalk.green('[NeoSaaS] 🚀 Projet initialisé avec succès.'));
}
