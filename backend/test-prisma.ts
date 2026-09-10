import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = 'postgresql://postgres:postgres@localhost:51214/template1?sslmode=disable';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: '2502013_cse@gita.edu.in' }
    });
    console.log(user);
  } catch (e) {
    console.error('ERROR IS:', e);
  }
}
run();
