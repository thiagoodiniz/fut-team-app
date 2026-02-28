import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const result = await prisma.$executeRawUnsafe(
        `UPDATE "UserTeam" SET role = 'ADMIN' WHERE role = 'OWNER'`
    )
    console.log('Updated rows:', result)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
