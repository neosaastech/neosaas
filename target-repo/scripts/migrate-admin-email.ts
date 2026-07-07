
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Migrating Super Admin email...");

  const oldEmail = "contact@exemple.com";
  const newEmail = "admin@exemple.com";

  try {
    // Check if old user exists
    const oldUser = await db.query.users.findFirst({
      where: eq(users.email, oldEmail),
    });

    if (oldUser) {
      console.log(`Found user with old email: ${oldEmail}`);
      
      // Check if new email already exists (to avoid conflict)
      const newUser = await db.query.users.findFirst({
        where: eq(users.email, newEmail),
      });

      if (newUser) {
        console.log(`User with new email ${newEmail} already exists. Deleting old user...`);
        await db.delete(users).where(eq(users.email, oldEmail));
        console.log("Old user deleted.");
      } else {
        console.log(`Updating email to ${newEmail}...`);
        await db.update(users)
          .set({ email: newEmail })
          .where(eq(users.email, oldEmail));
        console.log("Email updated successfully.");
      }
    } else {
      console.log(`User with email ${oldEmail} not found. Checking for ${newEmail}...`);
      const newUser = await db.query.users.findFirst({
        where: eq(users.email, newEmail),
      });
      
      if (newUser) {
        console.log(`User ${newEmail} already exists. No action needed.`);
      } else {
        console.log("Neither user found. Please run the deployment script or fix-super-admin script.");
      }
    }

  } catch (error) {
    console.error("Error migrating admin email:", error);
  }
}

main();
