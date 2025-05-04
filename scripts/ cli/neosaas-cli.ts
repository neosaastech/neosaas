import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { execSync } from 'child_process';
import { argv } from 'process';
import { runDev } from './commands/dev';
import { runDb } from './commands/db';
import { runInit } from './commands/init';
import { runGenerate } from './commands/generate';

function showHeader() {
  console.clear();
  console.log(gradient.rainbow(figlet.textSync('NeoSaaS', { font: 'Standard' })));
}

function log(message: string) {
  console.log(chalk.cyan(`[NeoSaaS] ${message}`));
}

async function main() {
  showHeader();

  const command = argv[2];

  switch (command) {
    case 'init':
      await runInit();
      break;
    case 'dev':
      await runDev();
      break;
    case 'db':
      await runDb();
      break;
    case 'generate':
      await runGenerate();
      break;
    case '--help':
    default:
      log('Commandes disponibles :');
      console.log('- init       Initialise un projet NeoSaaS');
      console.log('- dev        Lance Docker + Next.js en dev');
      console.log('- db         Lance Prisma db push/migrate');
      console.log('- generate   Génère fichiers .env');
      process.exit(0);
  }
}

main();
