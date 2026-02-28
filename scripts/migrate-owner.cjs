// CJS migration script — avoids ESM issues
const { Client } = require('pg')
require('dotenv').config()

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()

    // Step 1: convert existing OWNER records to ADMIN
    const { rowCount } = await client.query(`UPDATE "UserTeam" SET role = 'ADMIN' WHERE role = 'OWNER'`)
    console.log('Rows updated (OWNER -> ADMIN):', rowCount)

    await client.end()
}

main().catch((err) => { console.error(err); process.exit(1) })
