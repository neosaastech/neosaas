import { db } from "./db"
import { emailProviderConfigs } from "./db/schema"
import { eq } from "drizzle-orm"

async function checkEmailConfigs() {
  try {
    const configs = await db.select().from(emailProviderConfigs)
    console.log("Email Provider Configs:", JSON.stringify(configs, null, 2))
  } catch (error) {
    console.error("Error fetching configs:", error)
  }
}

checkEmailConfigs()
