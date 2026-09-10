import { Request, Response } from 'express';
import { prisma } from '../utils/db';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalStudents = await prisma.student.count({
      where: {
        studentType: 'HOSTELER'
      }
    });
    
    const totalDayScholars = await prisma.student.count({
      where: {
        studentType: 'DAY_SCHOLAR'
      }
    });

    const mealsServedToday = await prisma.mealLog.count({
      where: {
        entryTime: {
          gte: today
        },
        status: 'CONSUMED'
      }
    });

    const activeLeaves = await prisma.leave.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    const expectedMeals = totalStudents - activeLeaves;
    let foodWastageEstimate = '0.0%';
    if (expectedMeals > 0) {
      const skipped = Math.max(0, expectedMeals - mealsServedToday);
      const percentage = (skipped / expectedMeals) * 100;
      foodWastageEstimate = `${percentage.toFixed(1)}%`;
    }

    const penaltyLogs = await prisma.mealLog.findMany({
      where: {
        entryTime: { gte: today },
        penaltyAmount: { gt: 0 }
      },
      select: { penaltyAmount: true }
    });
    
    const totalPenalties = penaltyLogs.reduce((sum, log) => sum + (log.penaltyAmount || 0), 0);

    res.json({
      totalStudents,
      totalDayScholars,
      mealsServedToday,
      activeLeaves,
      foodWastageEstimate,
      totalPenalties
    });
  } catch (error: any) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};
