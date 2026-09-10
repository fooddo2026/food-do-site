"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/food_do';
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🍽️ Starting seeding of official GITA Autonomous College Boys Hostel Menu...');
        // Start seeding from Monday Aug 3, 2026 to Sunday Aug 16, 2026
        const startDate = new Date('2026-08-03T00:00:00.000Z');
        for (let d = 0; d < 14; d++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + d);
            currentDate.setUTCHours(0, 0, 0, 0);
            const dayName = daysOfWeek[currentDate.getUTCDay()];
            const menuForDay = weeklyMenuCycle[dayName];
            console.log(`📅 Seeding menu for ${currentDate.toISOString().split('T')[0]} (${dayName})...`);
            // Delete existing menus for this date to avoid duplication
            yield prisma.menu.deleteMany({
                where: {
                    serveDate: currentDate
                }
            });
            // 1. Seed Breakfast
            yield prisma.menu.create({
                data: {
                    serveDate: currentDate,
                    mealType: 'BREAKFAST',
                    items: menuForDay.breakfast,
                    totalCalories: 380,
                    isReady: false
                }
            });
            // 2. Seed Lunch
            yield prisma.menu.create({
                data: {
                    serveDate: currentDate,
                    mealType: 'LUNCH',
                    items: menuForDay.lunch,
                    totalCalories: 720,
                    isReady: false
                }
            });
            // 3. Seed Dinner
            yield prisma.menu.create({
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
    });
}
main()
    .catch((e) => {
    console.error('❌ Error during menu seeding:', e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
    yield pool.end();
}));
