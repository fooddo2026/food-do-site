import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/food_do';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const weeklyMenuCycle = {
  Monday: {
    breakfast: ['Chuda Poha', 'Ghuguni'],
    lunch: ['Rice', 'Dal', 'Besan Curry', 'Dahi Bundi'],
    dinner: ['Roti', 'Rice', 'Dal', 'Buta Dali Curry', 'Simei Kheer']
  },
  Tuesday: {
    breakfast: ['Bada', 'Ghuguni'],
    lunch: ['Rice', 'Dal', 'Aloo Potala Curry', 'Sagu Papad'],
    dinner: ['Roti', 'Rice', 'Dal', 'Soyabean Chilli', 'Rasogola']
  },
  Wednesday: {
    breakfast: ['Suji Halwa', 'Ghuguni'],
    lunch: ['Rice', 'Dal', 'Fish Masala', 'Pampad', 'Manchurian (Veg Only)'],
    dinner: ['Roti', 'Rice', 'Dal', 'Chilli Chicken', 'Mushroom Chilli (Veg Only)']
  },
  Thursday: {
    breakfast: ['Aloochop', 'Ghuguni'],
    lunch: ['Rice', 'Dalma', 'Aloo Kalara Chips', 'Amba Khata / Ambula Rai'],
    dinner: ['Fried Rice', 'Dal Fry', 'Paneer Butter Masala']
  },
  Friday: {
    breakfast: ['Dahibada', 'Aloo Dum', 'Seu'],
    lunch: ['Rice', 'Dal', 'Fish Masala', 'Mudhi Ghanta', 'Paneer Green Matar Masala', 'Papad (Veg Only)'],
    dinner: ['Roti', 'Rice', 'Dal', 'Chicken Butter Masala', 'Paneer Butter Masala']
  },
  Saturday: {
    breakfast: ['Idli', 'Ghuguni', 'Chatani'],
    lunch: ['Rice', 'Dalma', 'Aloo Bharata', 'Badichura / Mix Pickel'],
    dinner: ['Roti', 'Rice', 'Dal', 'Egg Tadka', 'Veg Tadka']
  },
  Sunday: {
    breakfast: ['Chat'],
    lunch: ['Rice', 'Dal', 'Egg Curry', 'Besan Curry (Veg Only)', 'Papad'],
    dinner: ['Chicken Biriyani', 'Veg Biriyani', 'Chicken Joos', 'Raita (Dal Fry for Veg Only)']
  }
};

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function main() {
  console.log('🍽️ Starting seeding of official GITA Autonomous College Boys Hostel Menu...');

  // Start seeding from Monday Aug 3, 2026 to Sunday Aug 16, 2026
  const startDate = new Date('2026-08-03T00:00:00.000Z');

  for (let d = 0; d < 14; d++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + d);
    currentDate.setUTCHours(0, 0, 0, 0);

    const dayName = daysOfWeek[currentDate.getUTCDay()] as keyof typeof weeklyMenuCycle;
    const menuForDay = weeklyMenuCycle[dayName];

    console.log(`📅 Seeding menu for ${currentDate.toISOString().split('T')[0]} (${dayName})...`);

    // Delete existing menus for this date to avoid duplication
    await prisma.menu.deleteMany({
      where: {
        serveDate: currentDate
      }
    });

    // 1. Seed Breakfast
    await prisma.menu.create({
      data: {
        serveDate: currentDate,
        mealType: 'BREAKFAST',
        items: menuForDay.breakfast,
        totalCalories: 380,
        isReady: false
      }
    });

    // 2. Seed Lunch
    await prisma.menu.create({
      data: {
        serveDate: currentDate,
        mealType: 'LUNCH',
        items: menuForDay.lunch,
        totalCalories: 720,
        isReady: false
      }
    });

    // 3. Seed Dinner
    await prisma.menu.create({
      data: {
        serveDate: currentDate,
        serveDate: currentDate,
        mealType: 'DINNER',
        items: menuForDay.dinner,
        totalCalories: 640,
        isReady: false
      }
    });
  }

  console.log('✅ Official GITA menu seeded successfully for 14 days (Aug 3 - Aug 16, 2026)!');
}

main()
  .catch((e) => {
    console.error('❌ Error during menu seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
