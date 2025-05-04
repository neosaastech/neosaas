#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Trouver le chemin absolu du dossier actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Capture les arguments donnés au script
const args = process.argv.slice(2).join(' ');

// Chemin vers tsx local
const tsxPath = resolve(__dirname, '../node_modules/.bin/tsx');

// Exécuter la CLI principale
execSync(`${tsxPath} ./scripts/cli/neosaas-cli.ts ${args}`, { stdio: 'inherit' });
