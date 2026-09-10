const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { sign } = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = 'super-secret-key-change-in-production';

async function run() {
  const student = await prisma.student.findFirst({ include: { user: true } });
  
  const token = sign({ id: student.user.id, role: student.user.role }, JWT_SECRET, { expiresIn: '1d' });
  
  const postData = JSON.stringify({
    mealType: 'BREAKFAST',
    date: '2026-09-01',
    preference: 'VEG'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/polls/respond',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`RESPONSE: ${data}`);
    });
  });

  req.write(postData);
  req.end();
}
run();
