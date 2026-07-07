
import { db } from "../db";
import { users, companies, roles, userRoles } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Fixing Super Admin account...");

  const superAdminEmail = "admin@exemple.com";

  try {
    // 1. Find Super Admin
    const superAdmin = await db.query.users.findFirst({
      where: eq(users.email, superAdminEmail),
    });

    if (!superAdmin) {
      console.error("Super Admin not found!");
      return;
    }

    console.log("Found Super Admin:", superAdmin.id);

    // 2. Create a Company for Super Admin if not exists
    let companyId = superAdmin.companyId;

    if (!companyId) {
      console.log("Creating company for Super Admin...");
      const [newCompany] = await db.insert(companies).values({
        name: "NeoSaaS HQ",
        email: "hq@neosaas.tech",
      }).returning();
      companyId = newCompany.id;
      console.log("Created company:", newCompany.name);

      // Update user with company
      await db.update(users)
        .set({ companyId: companyId })
        .where(eq(users.id, superAdmin.id));
      console.log("Linked Super Admin to company.");
    } else {
      console.log("Super Admin already has a company.");
    }

    // 3. Assign 'writer' role (Company Scope) to Super Admin
    // This gives 'invite' permission
    const writerRole = await db.query.roles.findFirst({
      where: eq(roles.name, "writer"),
    });

    if (!writerRole) {
      console.error("Writer role not found!");
      return;
    }

    // Check if already has role
    const existingRole = await db.query.userRoles.findFirst({
      where: (userRoles, { and, eq }) => and(
        eq(userRoles.userId, superAdmin.id),
        eq(userRoles.roleId, writerRole.id)
      ),
    });

    if (!existingRole) {
      console.log("Assigning 'writer' role to Super Admin...");
      await db.insert(userRoles).values({
        userId: superAdmin.id,
        roleId: writerRole.id,
      });
      console.log("Assigned 'writer' role.");
    } else {
      console.log("Super Admin already has 'writer' role.");
    }

    console.log("✅ Super Admin fix completed successfully.");

  } catch (error) {
    console.error("Error fixing Super Admin:", error);
  }
}

main();
