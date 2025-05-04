import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('[NeoSaaS] 🔥 Vérification de l\'admin en base de données...')

  const adminEmail = 'admin@neosaas.com'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log('[NeoSaaS] ✅ Admin déjà existant.')
    return
  }

  const hashedPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true,
      emailVerified: new Date(),
    },
  })

  console.log('[NeoSaaS] 🚀 Admin créé avec succès : admin@neosaas.com / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
