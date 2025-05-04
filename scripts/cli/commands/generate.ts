import fs from 'fs';
import chalk from 'chalk';

export async function runGenerate() {
  console.log(chalk.cyan('[NeoSaaS] 🧪 Génération de fichiers .env'));

  const envFiles = ['.env', '.env.server', '.env.client'];

  for (const file of envFiles) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '# NeoSaaS ENV\n');
      console.log(chalk.green(`[NeoSaaS] Créé : ${file}`));
    } else {
      console.log(chalk.yellow(`[NeoSaaS] Existe déjà : ${file}`));
    }
  }
}
