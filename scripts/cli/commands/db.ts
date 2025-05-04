import { execSync } from 'child_process';
import chalk from 'chalk';

export async function runDb() {
  console.log(chalk.cyan('[NeoSaaS] 📂 Push de la base Prisma...'));
  execSync('pnpm db:push', { stdio: 'inherit' });
}
