import { prisma } from "./prismadb"

async function main() {
  // Crée une entreprise
  const company = await prisma.company.create({
    data: {
      name: "Neosaas Corp",
      email: "contact@neosaas.com",
      phone: "+33123456789",
      countryCode: "+33",
      website: "https://neosaas.com",
      logoUrl: "https://neosaas.com/logo.png",
      appName: "Neosaas",
    },
  })

  // Crée un admin lié à cette entreprise
  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      username: "admin",
      email: "admin@neosaas.com",
      password: "hashed-password-here", // Tu mettras un vrai hash bcrypt après
      role: "ADMIN",
      firstName: "Super",
      lastName: "Admin",
      phoneNumber: "+33123456789",
    },
  })

  console.log("✅ Seed terminé :", { company, admin })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
