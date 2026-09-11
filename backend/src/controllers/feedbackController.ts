import { Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { getIO } from '../utils/socket';

export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { mealType, date, rating, tags, comment } = req.body;

    if (!mealType || rating === undefined || rating === null) {
      return res.status(400).json({ error: 'mealType and rating (1-5) are required' });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
      include: { hostel: true },
    });

    if (!student) {
      return res.status(403).json({ error: 'Only registered students can submit feedback' });
    }

    const d = date ? new Date(date) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const utcDate = new Date(`${y}-${m}-${day}T00:00:00.000Z`);

    const tagsString = Array.isArray(tags)
      ? tags.filter(Boolean).join(',')
      : typeof tags === 'string'
      ? tags
      : null;

    const feedback = await (prisma as any).mealFeedback.upsert({
      where: {
        studentId_mealType_date: {
          studentId: student.id,
          mealType: mealType.toUpperCase(),
          date: utcDate,
        },
      },
      update: {
        rating: Math.round(numRating),
        tags: tagsString,
        comment: comment ? String(comment).trim() : null,
      },
      create: {
        studentId: student.id,
        mealType: mealType.toUpperCase(),
        date: utcDate,
        rating: Math.round(numRating),
        tags: tagsString,
        comment: comment ? String(comment).trim() : null,
      },
    });

    // Real-time broadcast to Admin / Staff dashboard via Socket.IO
    try {
      const io = getIO();
      io.emit('new_meal_feedback', {
        id: feedback.id,
        mealType: feedback.mealType,
        rating: feedback.rating,
        tags: feedback.tags,
        comment: feedback.comment,
        date: feedback.date,
        createdAt: feedback.createdAt,
        studentName: student.name,
        rollNumber: student.rollNumber,
        hostelName: student.hostel?.name || student.hostelId || 'Hostel',
        roomNumber: student.roomNumber || '',
      });
    } catch (socketErr) {
      // Socket emission is non-blocking
      console.warn('Socket emit warning for meal feedback:', socketErr);
    }

    return res.status(200).json({
      message: 'Meal feedback submitted successfully!',
      feedback,
    });
  } catch (error: any) {
    console.error('Error submitting meal feedback:', error);
    return res.status(500).json({ error: 'Failed to submit feedback', details: error?.message });
  }
};

export const getMyTodayFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      return res.status(403).json({ error: 'Student not found' });
    }

    const { date } = req.query;
    const d = date ? new Date(date as string) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const utcDate = new Date(`${y}-${m}-${day}T00:00:00.000Z`);

    const feedbacks = await (prisma as any).mealFeedback.findMany({
      where: {
        studentId: student.id,
        date: utcDate,
      },
    });

    return res.status(200).json({ feedbacks });
  } catch (error: any) {
    console.error('Error fetching today feedback:', error);
    return res.status(500).json({ error: 'Failed to fetch feedback', details: error?.message });
  }
};

export const getFeedbackSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { date, mealType } = req.query;

    const d = date ? new Date(date as string) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const utcDate = new Date(`${y}-${m}-${day}T00:00:00.000Z`);

    const whereClause: any = {
      date: utcDate,
    };

    if (mealType && typeof mealType === 'string' && mealType !== 'ALL') {
      whereClause.mealType = mealType.toUpperCase();
    }

    const feedbacks = await (prisma as any).mealFeedback.findMany({
      where: whereClause,
      include: {
        student: {
          include: { hostel: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = feedbacks.length;
    let totalRatingSum = 0;

    const mealStats: Record<string, { total: number; sum: number; avg: number }> = {
      BREAKFAST: { total: 0, sum: 0, avg: 0 },
      LUNCH: { total: 0, sum: 0, avg: 0 },
      SNACKS: { total: 0, sum: 0, avg: 0 },
      DINNER: { total: 0, sum: 0, avg: 0 },
    };

    const ratingDistribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    const tagCounts: Record<string, number> = {};

    feedbacks.forEach((fb: any) => {
      totalRatingSum += fb.rating;
      if (ratingDistribution[fb.rating] !== undefined) {
        ratingDistribution[fb.rating]++;
      }

      if (mealStats[fb.mealType]) {
        mealStats[fb.mealType].total++;
        mealStats[fb.mealType].sum += fb.rating;
      }

      if (fb.tags) {
        const tagList = fb.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        tagList.forEach((t: string) => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      }
    });

    Object.keys(mealStats).forEach((key) => {
      const item = mealStats[key];
      item.avg = item.total > 0 ? Number((item.sum / item.total).toFixed(1)) : 0;
    });

    const overallAverage = totalReviews > 0 ? Number((totalRatingSum / totalReviews).toFixed(1)) : 0;

    // Format top 15 recent reviews
    const recentFeedbacks = feedbacks.slice(0, 20).map((fb: any) => ({
      id: fb.id,
      mealType: fb.mealType,
      rating: fb.rating,
      tags: fb.tags ? fb.tags.split(',') : [],
      comment: fb.comment,
      createdAt: fb.createdAt,
      studentName: fb.student?.name || 'Anonymous Student',
      rollNumber: fb.student?.rollNumber || '',
      hostelName: fb.student?.hostel?.name || '',
      roomNumber: fb.student?.roomNumber || '',
    }));

    return res.status(200).json({
      summary: {
        totalReviews,
        overallAverage,
        mealStats,
        ratingDistribution,
        tagCounts,
      },
      recentFeedbacks,
    });
  } catch (error: any) {
    console.error('Error fetching feedback summary:', error);
    return res.status(500).json({ error: 'Failed to fetch summary', details: error?.message });
  }
};
