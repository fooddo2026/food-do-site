const http = require('http');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const QR_SECRET = process.env.QR_SECRET || 'dynamic-qr-secret-123';
const TIME_WINDOW_SECONDS = 30;

function generateQRHash(studentId, timestampWindow) {
  return crypto.createHmac('sha256', QR_SECRET)
    .update(`${studentId}:${timestampWindow}`)
    .digest('hex');
}

async function runTest() {
  // 1. Get a valid student from the database
  const student = await prisma.student.findFirst({
    include: { user: true }
  });

  if (!student) {
    console.error("Database me koi student nahi hai! Pehle frontend se signup karke student banayein.");
    process.exit(1);
  }

  const studentId = student.userId;
  console.log(`Testing with real Student: ${student.user.name} (${studentId})`);

  // 2. Generate the dynamic token
  const currentWindow = Math.floor(Date.now() / 1000 / TIME_WINDOW_SECONDS);
  const token = generateQRHash(studentId, currentWindow);

  // 3. Build the QR payload exactly like the frontend generates it
  const qrPayload = JSON.stringify({
    sid: studentId,
    tok: token
  });

  const gate = process.argv[2] || "ENTRY";
  const postData = JSON.stringify({
    qrData: qrPayload,
    gateType: gate
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/meals/hardware-scan',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'food-do-esp32-secret',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log("ESP32 SIMULATOR: Sending Scan Data to Backend...");
  console.log("Payload:", postData);
  console.log("---------------------------------------------------");

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log("RESPONSE FROM BACKEND:");
      try {
        const parsed = JSON.parse(data);
        console.log(parsed);

        if (res.statusCode === 200) {
          console.log("\n✅ SUCCESS: LCD pe dikhega ->", parsed.studentName);
          console.log("✅ DIET:", parsed.foodPreference);
        } else {
          console.log("\n❌ FAILED: LCD pe dikhega -> Access Denied");
        }
      } catch (e) {
        console.log(data);
      }
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(`ERROR: Backend server chalu nahi hai! Please run 'npm run dev' first.`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}

runTest();
