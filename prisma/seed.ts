/* eslint-disable no-undef */
import 'dotenv/config'
import { PrismaClient, TeamRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
})

const prisma = new PrismaClient({ adapter })

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

async function main() {
  const teamName = 'Tapa Jegs F.M.'
  const ownerEmail = 'thiagoodiniz@hotmail.com'

  const currentYear = new Date().getFullYear()
  const seasonName = `Temporada ${currentYear}`

  const slug = slugify(teamName)

  const team = await prisma.team.upsert({
    where: { slug },
    create: {
      name: teamName,
      slug,
    },
    update: {
      name: teamName,
    },
  })

  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    create: {
      name: 'Thiago',
      email: ownerEmail,
    },
    update: {
      name: 'Thiago',
    },
  })

  await prisma.userTeam.upsert({
    where: {
      userId_teamId: {
        userId: user.id,
        teamId: team.id,
      },
    },
    create: {
      userId: user.id,
      teamId: team.id,
      role: TeamRole.OWNER,
    },
    update: {
      role: TeamRole.OWNER,
    },
  })

  await prisma.season.updateMany({
    where: { teamId: team.id },
    data: { isActive: false },
  })

  const season = await prisma.season.upsert({
    where: {
      teamId_year: {
        teamId: team.id,
        year: currentYear,
      },
    },
    create: {
      teamId: team.id,
      year: currentYear,
      name: seasonName,
      isActive: true,
    },
    update: {
      name: seasonName,
      isActive: true,
    },
  })

  console.log('✅ Seed finalizado!')
  console.log('Team:', team)
  console.log('Owner:', user.email)
  console.log('Season ativa:', season.name)
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
