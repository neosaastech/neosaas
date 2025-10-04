import fs from "fs"
import path from "path"

export function loadNeosaasConfig() {
  const configPath = path.join(process.cwd(), "main.neosaas")

  if (!fs.existsSync(configPath)) {
    console.error("❌ Fichier main.neosaas introuvable !")
    throw new Error("Erreur 404 - Fichier main.neosaas non trouvé")
  }

  const rawConfig = fs.readFileSync(configPath, "utf-8")

  try {
    const config = JSON.parse(rawConfig)

    console.log("✅ main.neosaas chargé avec succès (Status 200 OK)")
    return config
  } catch (error) {
    console.error("❌ Erreur de parsing dans main.neosaas !")
    throw new Error("Erreur 500 - Fichier main.neosaas invalide")
  }
}
// export default loadNeosaasConfig;
