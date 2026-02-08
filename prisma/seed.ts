import { PrismaClient, TeamRole } from "@prisma/client"

const prisma = new PrismaClient()

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
}

async function main() {
  const teamName = "Tapa Jegs F.M."
  const ownerEmail = "thiagoodiniz@hotmail.com"

  const slug = slugify(teamName)

  // 1) Cria ou atualiza o time
  const team = await prisma.team.upsert({
    where: { slug },
    create: {
      name: teamName,
      slug
    },
    update: {
      name: teamName
    }
  })

  // 2) Cria ou atualiza o usuário
  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    create: {
      name: "Thiago",
      email: ownerEmail
    },
    update: {
      name: "Thiago"
    }
  })

  // 3) Vincula user + team como OWNER
  await prisma.userTeam.upsert({
    where: {
      userId_teamId: {
        userId: user.id,
        teamId: team.id
      }
    },
    create: {
      userId: user.id,
      teamId: team.id,
      role: TeamRole.OWNER
    },
    update: {
      role: TeamRole.OWNER
    }
  })

  console.log("✅ Seed finalizado!")
  console.log("Team:", team)
  console.log("Owner:", user.email)
}

main()
  .catch((e) => {
    console.error("❌ Seed falhou:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
