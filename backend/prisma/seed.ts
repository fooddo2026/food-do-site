import { prisma } from '../src/utils/db';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records (Optional, but safe for dev)
  await prisma.mealLog.deleteMany({});
  await prisma.leave.deleteMany({});
  await prisma.mealPollResponse.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.hostel.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.menu.deleteMany({});
  await prisma.masterHosteller.deleteMany({});

  console.log('🧹 Cleaned existing database records.');

  // 2. Create default hostels (BH 01 to BH 17, GH 01 to GH 10)
  const hostels = [];
  for (let i = 1; i <= 17; i++) {
    const bhName = `BH ${String(i).padStart(2, '0')}`;
    const h = await prisma.hostel.create({
      data: {
        name: bhName,
        capacity: 350,
      },
    });
    hostels.push(h);
    console.log(`🏨 Created hostel: ${h.name}`);
  }
  for (let i = 1; i <= 10; i++) {
    const ghName = `GH ${String(i).padStart(2, '0')}`;
    const h = await prisma.hostel.create({
      data: {
        name: ghName,
        capacity: 350,
      },
    });
    hostels.push(h);
    console.log(`🏨 Created hostel: ${h.name}`);
  }

  // Use the first hostel (BH 01) as the default hostel reference for seeded students
  const hostel = hostels[0];

  // 3. Create Admin User
  const adminHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@fooddo.com',
      phone: '9999999991',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log(`👑 Created Admin User: ${adminUser.email}`);

  const admin1User = await prisma.user.create({
    data: {
      email: 'admin1@fooddo.com',
      phone: '9999999995',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log(`👑 Created Admin User: ${admin1User.email}`);

  const admin2User = await prisma.user.create({
    data: {
      email: 'admin2@fooddo.com',
      phone: '9999999996',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log(`👑 Created Admin User: ${admin2User.email}`);

  // 4. Create Staff User
  const staffHash = await bcrypt.hash('staff123', 10);
  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@fooddo.com',
      phone: '9999999992',
      passwordHash: staffHash,
      role: 'STAFF',
    },
  });
  console.log(`🧑‍🍳 Created Mess Staff User: ${staffUser.email}`);

  // 5. Create Student 1 (John Doe - Veg)
  const student1Hash = await bcrypt.hash('student123', 10);
  const student1User = await prisma.user.create({
    data: {
      email: 'student@fooddo.com',
      phone: '9999999993',
      passwordHash: student1Hash,
      role: 'STUDENT',
    },
  });

  const student1 = await prisma.student.create({
    data: {
      userId: student1User.id,
      rollNumber: 'CS20261024',
      name: 'John Doe',
      hostelId: hostel.id,
      roomNumber: '104',
      foodPreference: 'Veg',
      mess: 'South Block Mess',
    },
  });
  console.log(`🎓 Created Student (Hosteler 1): ${student1.name} (Roll: ${student1.rollNumber})`);

  // 6. Create Student 2 (Amit Patel - Non-Veg)
  const student2Hash = await bcrypt.hash('student123', 10);
  const student2User = await prisma.user.create({
    data: {
      email: 'student2@fooddo.com',
      phone: '9999999994',
      passwordHash: student2Hash,
      role: 'STUDENT',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      userId: student2User.id,
      rollNumber: 'ME20261108',
      name: 'Amit Patel',
      hostelId: hostel.id,
      roomNumber: '212',
      foodPreference: 'Non-Veg',
      mess: 'Main 1st Floor',
    },
  });
  console.log(`🎓 Created Student (Hosteler 2): ${student2.name} (Roll: ${student2.rollNumber})`);

  // 7. Create Today's and Next 6 Days' Menu Schedule (GITA Official Weekly Cycle)
  const weeklyCycle: Record<string, { breakfast: string, lunch: string, dinner: string }> = {
    Sunday: { breakfast: 'Chat', lunch: 'Rice, Dal, Egg Curry, Besan Curry (Veg Only), Papad', dinner: 'Chicken Biriyani, Veg Biriyani, Chicken Joos, Raita (Dal Fry for Veg Only)' },
    Monday: { breakfast: 'Chuda Poha, Ghuguni', lunch: 'Rice, Dal, Besan Curry, Dahi Bundi', dinner: 'Roti, Rice, Dal, Buta Dali Curry, Simei Kheer' },
    Tuesday: { breakfast: 'Bada, Ghuguni', lunch: 'Rice, Dal, Aloo Potala Curry, Sagu Papad', dinner: 'Roti, Rice, Dal, Soyabean Chilli, Rasogola' },
    Wednesday: { breakfast: 'Suji Halwa, Ghuguni', lunch: 'Rice, Dal, Fish Masala, Pampad, Manchurian (Veg Only)', dinner: 'Roti, Rice, Dal, Chilli Chicken, Mushroom Chilli (Veg Only)' },
    Thursday: { breakfast: 'Aloochop, Ghuguni', lunch: 'Rice, Dalma, Aloo Kalara Chips, Amba Khata / Ambula Rai', dinner: 'Fried Rice, Dal Fry, Paneer Butter Masala' },
    Friday: { breakfast: 'Dahibada, Aloo Dum, Seu', lunch: 'Rice, Dal, Fish Masala, Mudhi Ghanta, Paneer Green Matar Masala, Papad (Veg Only)', dinner: 'Roti, Rice, Dal, Chicken Butter Masala, Paneer Butter Masala' },
    Saturday: { breakfast: 'Idli, Ghuguni, Chatani', lunch: 'Rice, Dalma, Aloo Bharata, Badichura / Mix Pickel', dinner: 'Roti, Rice, Dal, Egg Tadka, Veg Tadka' },
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let menusCreated = 0;
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dayName = days[targetDate.getDay()];
    const dayMenu = weeklyCycle[dayName];

    if (dayMenu) {
      await prisma.menu.create({
        data: {
          serveDate: targetDate,
          mealType: 'BREAKFAST',
          items: JSON.stringify(dayMenu.breakfast.split(',').map(s => s.trim())),
          totalCalories: 380,
        },
      });
      await prisma.menu.create({
        data: {
          serveDate: targetDate,
          mealType: 'LUNCH',
          items: JSON.stringify(dayMenu.lunch.split(',').map(s => s.trim())),
          totalCalories: 720,
        },
      });
      await prisma.menu.create({
        data: {
          serveDate: targetDate,
          mealType: 'DINNER',
          items: JSON.stringify(dayMenu.dinner.split(',').map(s => s.trim())),
          totalCalories: 640,
        },
      });
      menusCreated += 3;
    }
  }
  console.log(`🍽️ Seeded ${menusCreated} menu sessions for the next 7 days based on GITA cycle!`);

  // 8. Seed Master Hostellers
  const masterHostellers = [
    { rollNumber: 'CS20261024', name: 'John Doe', hostelName: 'BH 01', roomNumber: '104', foodPreference: 'Veg', mess: 'South Block Mess' },
    { rollNumber: 'ME20261108', name: 'Amit Patel', hostelName: 'BH 01', roomNumber: '212', foodPreference: 'Non-Veg', mess: 'Main 1st Floor' },
    { rollNumber: 'EE20263045', name: 'Vikram Singh', hostelName: 'BH 03', roomNumber: '302', foodPreference: 'Veg', mess: 'Main 2nd Floor' },
    { rollNumber: 'EC20264012', name: 'Ananya Rao', hostelName: 'GH 02', roomNumber: '101', foodPreference: 'Veg', mess: 'Girl\'s Campus' },
    { rollNumber: 'IT20262056', name: 'Kabir Mehta', hostelName: 'BH 08', roomNumber: '405', foodPreference: 'Non-Veg', mess: 'Main 3rd Floor' },
    { rollNumber: 'CH20266078', name: 'Priya Sharma', hostelName: 'GH 05', roomNumber: '204', foodPreference: 'Veg', mess: 'Girl\'s Campus' }
  ];

  for (const mh of masterHostellers) {
    await prisma.masterHosteller.create({
      data: mh
    });
  }
  console.log(`📋 Seeded ${masterHostellers.length} Master Hosteller registry records.`);

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
