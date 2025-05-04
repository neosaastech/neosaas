// src/server/loadConfig.ts

import fs from 'fs'
import path from 'path'

export function loadConfig() {
  const configPath = path.join(process.cwd(), 'main.neosaas')
  if (!fs.existsSync(configPath)) {
    throw new Error('Fichier main.neosaas introuvable à la racine du projet.')
  }

  const rawData = fs.readFileSync(configPath, 'utf-8')
  return JSON.parse(rawData)
}
