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

  // 4. Create Student 1 (John Doe - Veg)
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
