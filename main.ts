import fs from "fs"
import path from "path"

// On lit directement main.neosaas sans extension
const configPath = path.join(process.cwd(), "main.neosaas")

if (!fs.existsSync(configPath)) {
  throw new Error("❌ Le fichier main.neosaas est manquant !")
}

const rawConfig = fs.readFileSync(configPath, "utf-8")

let config: { appName: string; domain: string }

try {
  config = JSON.parse(rawConfig)
} catch (error) {
  throw new Error("❌ Erreur de parsing dans main.neosaas !")
}

// Tu peux utiliser la config ici
console.log(`Bienvenue sur ${config.appName} ! Domaine : ${config.domain}`)
