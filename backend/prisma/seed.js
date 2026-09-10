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
const db_1 = require("../src/utils/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Starting database seeding...');
        // 1. Clean existing records (Optional, but safe for dev)
        yield db_1.prisma.mealLog.deleteMany({});
        yield db_1.prisma.leave.deleteMany({});
        yield db_1.prisma.student.deleteMany({});
        yield db_1.prisma.hostel.deleteMany({});
        yield db_1.prisma.user.deleteMany({});
        yield db_1.prisma.menu.deleteMany({});
        console.log('🧹 Cleaned existing database records.');
        // 2. Create default hostel
        const hostel = yield db_1.prisma.hostel.create({
            data: {
                name: 'Ramanujan Hostel A',
                capacity: 350,
            },
        });
        console.log(`🏨 Created hostel: ${hostel.name}`);
        // 3. Create Admin User
        const adminHash = yield bcrypt_1.default.hash('admin123', 10);
        const adminUser = yield db_1.prisma.user.create({
            data: {
                email: 'admin@fooddo.com',
                phone: '9999999991',
                passwordHash: adminHash,
                role: 'ADMIN',
            },
        });
        console.log(`👑 Created Admin User: ${adminUser.email}`);
        // 4. Create Staff User
        const staffHash = yield bcrypt_1.default.hash('staff123', 10);
        const staffUser = yield db_1.prisma.user.create({
            data: {
                email: 'staff@fooddo.com',
                phone: '9999999992',
                passwordHash: staffHash,
                role: 'STAFF',
            },
        });
        console.log(`🧑‍🍳 Created Mess Staff User: ${staffUser.email}`);
        // 5. Create Student 1 (John Doe - Veg)
        const student1Hash = yield bcrypt_1.default.hash('student123', 10);
        const student1User = yield db_1.prisma.user.create({
            data: {
                email: 'student@fooddo.com',
                phone: '9999999993',
                passwordHash: student1Hash,
                role: 'STUDENT',
            },
        });
        const student1 = yield db_1.prisma.student.create({
            data: {
                userId: student1User.id,
                rollNumber: 'CS20261024',
                name: 'John Doe',
                hostelId: hostel.id,
                roomNumber: '104',
                foodPreference: 'Veg',
                parentPhone: '+919876543210',
                parentEmail: 'parent.doe@gmail.com',
            },
        });
        console.log(`🎓 Created Student (Hosteler 1): ${student1.name} (Roll: ${student1.rollNumber})`);
        // 6. Create Student 2 (Amit Patel - Non-Veg)
        const student2Hash = yield bcrypt_1.default.hash('student123', 10);
        const student2User = yield db_1.prisma.user.create({
            data: {
                email: 'student2@fooddo.com',
                phone: '9999999994',
                passwordHash: student2Hash,
                role: 'STUDENT',
            },
        });
        const student2 = yield db_1.prisma.student.create({
            data: {
                userId: student2User.id,
                rollNumber: 'ME20261108',
                name: 'Amit Patel',
                hostelId: hostel.id,
                roomNumber: '212',
                foodPreference: 'Non-Veg',
                parentPhone: '+919988776655',
                parentEmail: 'parent.patel@gmail.com',
            },
        });
        console.log(`🎓 Created Student (Hosteler 2): ${student2.name} (Roll: ${student2.rollNumber})`);
        // 7. Create Today's Menu Schedule
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const menu = yield db_1.prisma.menu.create({
            data: {
                serveDate: today,
                mealType: 'LUNCH',
                items: ['Rice', 'Dal Makhani', 'Paneer Butter Masala', 'Roti', 'Salad'],
                totalCalories: 650,
            },
        });
        console.log(`🍽️ Seeded lunch menu for serve date: ${menu.serveDate.toLocaleDateString()}`);
        console.log('✅ Seeding completed successfully!');
    });
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield db_1.prisma.$disconnect();
}));
