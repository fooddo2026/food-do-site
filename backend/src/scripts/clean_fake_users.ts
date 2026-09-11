import { prisma } from '../utils/db';

async function cleanup() {
  console.log('🧹 Starting cleanup of fake users and records...');

  const keepEmails = ['admin@fooddo.com', 'student@fooddo.com'];

  // 1. Find all users not in keep list
  const usersToRemove = await prisma.user.findMany({
    where: {
      email: { notIn: keepEmails },
    },
    include: {
      studentProfile: true,
    },
  });

  console.log(`Found ${usersToRemove.length} users to remove:`, usersToRemove.map((u) => u.email));

  for (const user of usersToRemove) {
    if (user.studentProfile) {
      const studentId = user.studentProfile.id;
      console.log(`Removing dependencies for student ${user.studentProfile.rollNumber}...`);

      await prisma.mealLog.deleteMany({ where: { studentId } });
      await prisma.leave.deleteMany({ where: { studentId } });
      await prisma.mealPollResponse.deleteMany({ where: { studentId } });
      await prisma.surplusToken.deleteMany({ where: { studentId } });

      try {
        await (prisma as any).mealFeedback.deleteMany({ where: { studentId } });
      } catch (_) {}

      await prisma.student.delete({ where: { id: studentId } });
      console.log(`✅ Deleted Student: ${user.studentProfile.rollNumber} (${user.studentProfile.name})`);
    }

    // Unlink warden if any
    await prisma.hostel.updateMany({
      where: { wardenId: user.id },
      data: { wardenId: null },
    });

    await prisma.user.delete({ where: { id: user.id } });
    console.log(`✅ Deleted User: ${user.email} (${user.role})`);
  }

  // 2. Remove fake MasterHosteller records (keep CS20261024 which belongs to student@fooddo.com)
  const mhResult = await prisma.masterHosteller.deleteMany({
    where: {
      rollNumber: { not: 'CS20261024' },
    },
  });
  console.log(`✅ Removed ${mhResult.count} fake MasterHosteller records.`);

  // 3. Verify final state
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });
  console.log('🎉 Cleanup complete! Remaining users in database:');
  console.table(remainingUsers);
}

cleanup()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Cleanup error:', err);
    process.exit(1);
  });
