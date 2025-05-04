import { execSync } from 'child_process';
import chalk from 'chalk';

export async function runDev() {
  console.log(chalk.cyan('[NeoSaaS] 🚀 Démarrage en mode développement...'));
  execSync('pnpm docker:up', { stdio: 'inherit' });
  execSync('pnpm dev', { stdio: 'inherit' });
}
