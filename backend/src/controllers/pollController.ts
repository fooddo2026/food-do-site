import { Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { getIO } from '../utils/socket';

// Helper to determine the active meal window
// Breakfast: 7:30 AM. Window: 10:00 PM previous night (1320 mins) to 7:30 AM (450 mins)
// Lunch: 2:00 PM. Window: 9:00 AM (540 mins) to 2:00 PM (840 mins)
// Dinner: 9:00 PM. Window: 4:00 PM (960 mins) to 9:00 PM (1260 mins)
export const getActiveMealWindow = (date = new Date()) => {
  const currentHour = date.getHours();
  const currentMinute = date.getMinutes();
  const timeInMinutes = currentHour * 60 + currentMinute;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tYear = tomorrow.getFullYear();
  const tMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tDay = String(tomorrow.getDate()).padStart(2, '0');

  const todayUtc = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  const tomorrowUtc = new Date(`${tYear}-${tMonth}-${tDay}T00:00:00.000Z`);

  if (timeInMinutes >= 1320) {
    return { mealType: 'BREAKFAST', date: tomorrowUtc };
  }
  if (timeInMinutes < 450) {
    return { mealType: 'BREAKFAST', date: todayUtc };
  }
  if (timeInMinutes >= 540 && timeInMinutes < 840) {
    return { mealType: 'LUNCH', date: todayUtc };
  }
  if (timeInMinutes >= 960 && timeInMinutes < 1260) {
    return { mealType: 'DINNER', date: todayUtc };
  }

  return null;
};

export const getActivePoll = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      return res.status(403).json({ error: 'Only students can access this poll' });
    }

    const activeWindow = getActiveMealWindow();
    if (!activeWindow) {
      return res.json({ activePoll: null });
    }

    // Check if student already responded
    const existingResponse = await prisma.mealPollResponse.findUnique({
      where: {
        studentId_mealType_date: {
          studentId: student.id,
          mealType: activeWindow.mealType,
          date: activeWindow.date,
        },
      },
    });

    if (existingResponse) {
      return res.json({ activePoll: null });
    }

    res.json({ activePoll: activeWindow });
  } catch (error: any) {
    console.error('Error in getActivePoll:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

export const submitPoll = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { mealType, date, preference } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const utcDate = new Date(`${y}-${m}-${day}T00:00:00.000Z`);

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      return res.status(403).json({ error: 'Only students can submit a poll' });
    }

    // Upsert to handle concurrent submissions gracefully
    const pollResponse = await prisma.mealPollResponse.upsert({
      where: {
        studentId_mealType_date: {
          studentId: student.id,
          mealType: mealType,
          date: utcDate,
        },
      },
      update: {
        preference: preference,
      },
      create: {
        studentId: student.id,
        mealType: mealType,
        date: utcDate,
        preference: preference,
      },
    });

    // Emit real-time poll update to Admin & Kitchen dashboard via Socket.IO
    try {
      const io = getIO();
      io.emit('meal_poll_updated', {
        mealType,
        date: utcDate,
        preference,
        studentName: student.name,
        rollNumber: student.rollNumber,
      });
    } catch (socketErr) {
      console.warn('Socket emit error in submitPoll:', socketErr);
    }

    res.json({ message: 'Poll submitted successfully', pollResponse });
  } catch (error: any) {
    console.error('Error in submitPoll:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

export const getPollSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { date, mealType } = req.query;
    
    if (!date || !mealType) {
      return res.status(400).json({ error: 'date and mealType are required' });
    }

    const dateParam = date as string;
    const normalizedDateStr = dateParam.includes('T') ? dateParam.split('T')[0] : dateParam;
    const parsedDate = new Date(`${normalizedDateStr}T00:00:00.000Z`);

    const summary = await prisma.mealPollResponse.groupBy({
      by: ['preference'],
      where: {
        date: parsedDate,
        mealType: mealType as string,
      },
      _count: {
        preference: true,
      },
    });

    // Format response
    const results: Record<string, number> = {
      'VEG': 0,
      'NON_VEG': 0,
      'SKIPPING': 0,
    };

    summary.forEach((item) => {
      results[item.preference] = item._count.preference;
    });

    res.json(results);
  } catch (error: any) {
    console.error('Error in getPollSummary:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};
