
import { db } from "../db";
import { users, companies } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting reproduction script...");
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testCompanyName = `Test Company ${Date.now()}`;

  try {
    console.log("Creating company...");
    const [company] = await db.insert(companies).values({
      name: testCompanyName,
      email: testEmail, // Using same email for company for simplicity
    }).returning();
    console.log("Company created:", company);

    console.log("Creating user...");
    const [user] = await db.insert(users).values({
      email: testEmail,
      password: "hashedpassword123",
      firstName: "Test",
      lastName: "User",
      companyId: company.id,
      isActive: true,
    }).returning();
    console.log("User created:", user);

    console.log("Verifying data in DB...");
    const foundUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        company: true
      }
    });
    console.log("Found user:", foundUser);

    if (foundUser && foundUser.company) {
      console.log("SUCCESS: Data persisted correctly.");
    } else {
      console.error("FAILURE: Data not found or incomplete.");
    }

  } catch (error) {
    console.error("Error during reproduction:", error);
  }
}

main();
