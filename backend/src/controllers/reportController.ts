import { Request, Response } from 'express';
import { prisma } from '../utils/db';

/**
 * Core business logic to generate weekly student reports.
 * Can be triggered automatically by CRON or manually by an admin.
 */
export const executeWeeklyReportDispatch = async () => {
  console.log('⏰ Executing Weekly Student Report generation process...');
  
  // Fetch all registered students
  const students = await prisma.student.findMany({
    include: {
      mealLogs: {
        include: {
          menu: true
        }
      },
      leaves: true
    }
  });

  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);

  const results: any[] = [];

  for (const student of students) {
    // 1. Filter meal logs for the last 7 days
    const weeklyLogs = student.mealLogs.filter(log => {
      const logDate = new Date(log.entryTime);
      return logDate >= oneWeekAgo && logDate <= now;
    });

    const mealsConsumed = weeklyLogs.filter(log => log.status === 'CONSUMED').length;
    const mealsSkipped = weeklyLogs.filter(log => log.status === 'SKIPPED').length;

    // 2. Calculate approved leave days within the last 7 days
    let leaveDays = 0;
    const approvedLeaves = student.leaves.filter(l => l.status === 'APPROVED');
    
    // Iterate through the last 7 days and check if the student was on leave
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(now.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);

      const isOnLeave = approvedLeaves.some(l => {
        const start = new Date(l.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(l.endDate);
        end.setHours(23, 59, 59, 999);
        return checkDate >= start && checkDate <= end;
      });

      if (isOnLeave) {
        leaveDays++;
      }
    }

    // 3. Calculate expected meals and compliance
    const expectedMeals = Math.max(0, (7 - leaveDays) * 3);
    const complianceRate = expectedMeals > 0 
      ? Math.round((mealsConsumed / expectedMeals) * 100) 
      : 100;

    // 4. Format report text
    const reportText = `\n• Meals Eaten: ${mealsConsumed}/${expectedMeals}\n• Meals Missed: ${mealsSkipped}\n• Approved Leaves: ${leaveDays} days\n• Dining Compliance: ${complianceRate}%`;

    // 5. Build report record
    results.push({
      studentId: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      mealsConsumed,
      expectedMeals,
      mealsSkipped,
      leaveDays,
      complianceRate
    });
  }

  console.log(`✅ Weekly Student Report generation complete. Processed ${results.length} students.`);
  return results;
};

/**
 * HTTP handler for manual administrator trigger.
 */
export const dispatchWeeklyReports = async (req: Request, res: Response) => {
  try {
    const reports = await executeWeeklyReportDispatch();
    res.json({
      message: 'Weekly reports generated successfully for all students',
      totalProcessed: reports.length,
      reports
    });
  } catch (error: any) {
    console.error('Error in manual dispatchWeeklyReports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
