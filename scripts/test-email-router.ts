
import { emailRouter } from "./lib/email";

async function main() {
  console.log("Testing Email Router...");

  try {
    await emailRouter.initialize();
    console.log("Email Router initialized.");
    
    // Access private property for debugging (using any cast)
    const providers = (emailRouter as any).providers;
    console.log(`Providers loaded: ${providers.size}`);
    providers.forEach((p: any, key: string) => {
        console.log(`- ${key}`);
    });

    if (providers.size === 0) {
        console.error("❌ No providers loaded! This confirms the issue.");
    } else {
        console.log("✅ Providers loaded successfully.");
    }

  } catch (error) {
    console.error("Error initializing email router:", error);
  }
}

main();
