import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { MealLog } from '@prisma/client';
import { sendSMS } from '../utils/sms';
import { getIO } from '../utils/socket';

const QR_SECRET = process.env.QR_SECRET || 'dynamic-qr-secret-123';
const TIME_WINDOW_SECONDS = 30;

// Tokens APIs
export const releaseSurplusTokens = async (req: AuthRequest, res: Response) => {
  try {
    const { mealType, date, quantity, price } = req.body;
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

    const tokensToCreate = Array.from({ length: quantity }).map(() => ({
      mealType,
      date: new Date(date),
      price: price || 5,
      status: 'AVAILABLE'
    }));

    await prisma.$transaction(
      tokensToCreate.map((token) => prisma.surplusToken.create({ data: token }))
    );

    res.json({ message: `${quantity} tokens released successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to release tokens' });
  }
};

export const getAvailableSurplusTokens = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const tokens = await prisma.surplusToken.findMany({
      where: {
        status: 'AVAILABLE',
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available tokens' });
  }
};

export const claimSurplusToken = async (req: AuthRequest, res: Response) => {
  try {
    const { mealType, date } = req.body;
    const userId = req.user.id;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student || student.studentType !== 'DAY_SCHOLAR') {
      return res.status(403).json({ error: 'Only Day Scholars can claim tokens.' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);

    // Find one available token and claim it atomically
    const result = await prisma.$transaction(async (tx) => {
      const availableToken = await tx.surplusToken.findFirst({
        where: {
          mealType,
          date: { gte: startOfDay, lt: endOfDay },
          status: 'AVAILABLE'
        }
      });

      if (!availableToken) {
        throw new Error('No tokens available.');
      }

      const updated = await tx.surplusToken.update({
        where: { id: availableToken.id },
        data: {
          status: 'CLAIMED',
          studentId: student.id,
          claimedAt: new Date()
        }
      });

      return updated;
    });

    res.json({ message: 'Token claimed successfully.', token: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to claim token' });
  }
};

export const getMyTokens = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const tokens = await prisma.surplusToken.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
};

// Utility to generate a dynamic TOTP hash for the QR (30s window)
const generateQRHash = (studentId: string, timestamp: number = Date.now()) => {
  const window = Math.floor(timestamp / 30000);
  return crypto.createHmac('sha256', QR_SECRET)
    .update(`${studentId}-${window}`)
    .digest('hex');
};

export const generateQR = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user.id; 
    const hash = generateQRHash(studentId);
    
    res.json({
      studentId,
      token: hash,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
};

export const scanEntry = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, token, menuId, gateType = 'ENTRY' } = req.body;
    
    const isValid = generateQRHash(studentId, Date.now()) === token || 
                    generateQRHash(studentId, Date.now() - 30000) === token;

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired QR code' });
    }

    const [student, menu] = await Promise.all([
      prisma.student.findUnique({ where: { userId: studentId }, include: { user: true } }),
      menuId ? prisma.menu.findUnique({ where: { id: menuId } }) : null
    ]);

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found for this user ID.' });
    }

    let log;
    let smsAlert = '';
    let durationMins = 0;

    if (gateType === 'ENTRY') {
      const existingLogs = await prisma.mealLog.findMany({
        where: {
          studentId: student.id,
          menuId
        }
      });

      const activeLog = existingLogs.find(l => l.exitTime === null);
      if (activeLog) {
        return res.status(400).json({ error: 'Student is already checked into the mess (missing exit scan).' });
      }

      const completedLog = existingLogs.find(l => l.exitTime !== null);
      if (completedLog) {
        return res.status(400).json({ error: 'Meal already consumed by this student for this session.' });
      }

      // Check Poll Penalty
      let penalty = 0;
      if (menu) {
        const pollResponse = await prisma.mealPollResponse.findFirst({
          where: {
            studentId: student.id,
            mealType: menu.mealType,
            date: { gte: new Date(new Date().setHours(0,0,0,0)) }
          }
        });
        if (pollResponse && pollResponse.preference === 'SKIPPING') {
          penalty = 50; // Fine for skipping but eating
        }
      }

      log = await prisma.mealLog.create({
        data: {
          studentId: student.id,
          menuId,
          entryTime: new Date(),
          status: 'CONSUMED',
          scannerId: req.user.id,
          penaltyAmount: penalty
        }
      });

      const mealName = menu?.mealType || 'Meal';
      smsAlert = sendSMS(student.user.phone, `Meal Update: ${student.name} entered ${mealName}.`);
    } else {
      const activeLog = await prisma.mealLog.findFirst({
        where: {
          studentId: student.id,
          menuId,
          exitTime: null
        }
      });

      if (!activeLog) {
        return res.status(400).json({ error: 'No active entry scan found. Please scan at the entry gate first.' });
      }

      log = await prisma.mealLog.update({
        where: { id: activeLog.id },
        data: {
          exitTime: new Date()
        }
      });

      durationMins = Math.round((log.exitTime!.getTime() - log.entryTime.getTime()) / 1000 / 60);

      const mealName = menu?.mealType || 'Meal';
      smsAlert = sendSMS(student.user.phone, `Meal Update: ${student.name} exited ${mealName}.`);
    }

    try {
      const io = getIO();
      const payload = {
        studentId,
        studentName: student.name,
        rollNumber: student.rollNumber,
        mealType: menu?.mealType || 'Meal',
        gateType,
        duration: durationMins,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        smsAlert
      };
      io.to('staff_terminal').to(`student_${studentId}`).emit('meal_scanned', payload);
    } catch (socketErr) {
      console.warn('Socket broadcast failed:', socketErr);
    }

    res.json({
      message: `${gateType} logged successfully`,
      log,
      smsAlert,
      studentName: student.name
    });
  } catch (error: any) {
    console.error('Error in scanEntry:', error);
    return res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const logs = await prisma.mealLog.findMany({
      where: { studentId: student.id },
      include: { menu: true },
      orderBy: { entryTime: 'desc' },
      take: 100,
    });

    const leaves = await prisma.leave.findMany({
      where: { studentId: student.id }
    });

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const logs30Days = logs.filter(l => new Date(l.entryTime) >= thirtyDaysAgo);
    const consumedCount = logs30Days.filter(l => l.status === 'CONSUMED').length;

    let absentCount = 0;

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toISOString().split('T')[0];

      const onLeave = leaves.some(lv => {
        if (lv.status !== 'APPROVED') return false;
        const lvStart = new Date(lv.startDate).toISOString().split('T')[0];
        const lvEnd = new Date(lv.endDate).toISOString().split('T')[0];
        return dateStr >= lvStart && dateStr <= lvEnd;
      });

      const meals: ('BREAKFAST' | 'LUNCH' | 'DINNER')[] = ['BREAKFAST', 'LUNCH', 'DINNER'];
      for (const mealType of meals) {
        if (d.toDateString() === today.toDateString()) {
          const currentHour = today.getHours();
          if (mealType === 'BREAKFAST' && currentHour < 10) continue;
          if (mealType === 'LUNCH' && currentHour < 15) continue;
          if (mealType === 'DINNER' && currentHour < 22) continue;
        }

        const logExists = logs30Days.some(l => {
          const logDateStr = new Date(l.entryTime).toISOString().split('T')[0];
          return logDateStr === dateStr && l.menu?.mealType === mealType;
        });

        if (!logExists && !onLeave) {
          absentCount++;
        }
      }
    }

    const totalPossibleSessions = consumedCount + absentCount;
    const monthlyRatio = totalPossibleSessions > 0 
      ? parseFloat(((consumedCount / totalPossibleSessions) * 100).toFixed(1)) 
      : 95.5;

    let streak = 0;
    const sortedLogs = [...logs30Days].sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());
    for (let i = sortedLogs.length - 1; i >= 0; i--) {
      if (sortedLogs[i].status === 'CONSUMED') {
        streak++;
      } else {
        break; 
      }
    }

    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDates.push(d);
    }

    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const heatmap = weekdays.map((dayName, index) => {
      const dateForDay = weekDates[index];
      const dateStr = dateForDay.toISOString().split('T')[0];

      const onLeave = leaves.some(lv => {
        if (lv.status !== 'APPROVED') return false;
        const lvStart = new Date(lv.startDate).toISOString().split('T')[0];
        const lvEnd = new Date(lv.endDate).toISOString().split('T')[0];
        return dateStr >= lvStart && dateStr <= lvEnd;
      });

      const getMealState = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
        const logForMeal = logs.find(l => {
          const logDateStr = new Date(l.entryTime).toISOString().split('T')[0];
          return logDateStr === dateStr && l.menu?.mealType === mealType;
        });

        if (logForMeal) {
          return logForMeal.status; 
        }

        if (onLeave) {
          return 'SKIPPED';
        }

        if (dateForDay > today) {
          return 'NONE';
        }

        const isPastDate = new Date(today.toDateString()) > new Date(dateForDay.toDateString());
        return isPastDate ? 'ABSENT' : 'NONE';
      };

      return {
        day: dayName,
        date: dateStr,
        breakfast: getMealState('BREAKFAST'),
        lunch: getMealState('LUNCH'),
        dinner: getMealState('DINNER'),
      };
    });

    res.json({
      metrics: {
        monthlyRatio,
        mealsConsumed: consumedCount,
        streak,
        missedAndAbsent: absentCount,
      },
      heatmap,
      logs: logs.map(l => ({
        id: l.id,
        mealType: l.menu?.mealType || 'Meal',
        date: new Date(l.entryTime).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        time: l.exitTime 
          ? `${new Date(l.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(l.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${Math.round((l.exitTime.getTime() - l.entryTime.getTime()) / 60000)} mins)`
          : `${new Date(l.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Active Entry)`,
        status: l.status
      }))
    });
  } catch (error: any) {
    console.error('Error in getStudentAttendance:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

export const hardwareScanEntry = async (req: Request, res: Response): Promise<any> => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== (process.env.HARDWARE_API_KEY || 'food-do-esp32-secret')) {
      return res.status(401).json({ error: 'Unauthorized hardware access' });
    }

    const { qrData, gateType = 'ENTRY' } = req.body;
    if (!qrData) {
      return res.status(400).json({ error: 'Missing qrData' });
    }

    if (qrData.startsWith('TOKEN:')) {
      const tokenId = qrData.split(':')[1];
      const token = await prisma.surplusToken.findUnique({
        where: { id: tokenId },
        include: { student: true }
      });
      if (!token || token.status !== 'CLAIMED') {
         return res.status(400).json({ error: 'INVALID_TOKEN' });
      }
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const tokenDate = new Date(token.date);
      tokenDate.setHours(0,0,0,0);
      if (tokenDate.getTime() !== today.getTime()) {
         return res.status(400).json({ error: 'EXPIRED_TOKEN' });
      }

      await prisma.surplusToken.update({
         where: { id: tokenId },
         data: { status: 'USED', usedAt: new Date() }
      });

      try {
        const io = getIO();
        const payload = {
          studentId: token.student?.userId,
          studentName: token.student?.name,
          rollNumber: token.student?.rollNumber,
          mealType: token.mealType,
          gateType: 'ENTRY',
          duration: 0,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          smsAlert: 'Token Validated'
        };
        io.to('staff_terminal').emit('meal_scanned', payload);
      } catch (socketErr) {
        console.warn('Socket broadcast failed:', socketErr);
      }

      return res.json({ success: true, studentName: token.student?.name, foodPreference: token.student?.foodPreference || 'VEG', message: 'Token Valid' });
    }

    let studentId;
    let isValid = false;

    if (qrData.includes('|')) {
      // Micro-Payload Format: studentId|firstName|foodPref|hostel|totpToken
      const parts = qrData.split('|');
      studentId = parts[0];
      const totpToken = parts[4];
      if (!studentId) {
        return res.status(400).json({ error: 'QR data missing student ID' });
      }
      if (totpToken) {
         isValid = generateQRHash(studentId, Date.now()) === totpToken || 
                   generateQRHash(studentId, Date.now() - 30000) === totpToken;
      } else {
         isValid = true; // Bypass hash check for Legacy Micro-Payload
      }
    } else {
      // Legacy JSON Format
      let parsedQR;
      try {
        parsedQR = JSON.parse(qrData);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid QR format' });
      }

      studentId = parsedQR.sid;
      const token = parsedQR.tok;
      
      if (!studentId || !token) {
        return res.status(400).json({ error: 'QR data missing student ID or token' });
      }

      isValid = generateQRHash(studentId, Date.now()) === token || 
                generateQRHash(studentId, Date.now() - 30000) === token;
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid QR code signature' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Determine meal based on current time
    const now = new Date();
    const hours = now.getHours();
    let mealType = 'MEAL';
    if (hours >= 7 && hours < 11) mealType = 'BREAKFAST';
    else if (hours >= 13 && hours < 16) mealType = 'LUNCH';
    else if (hours >= 19 && hours < 23) mealType = 'DINNER';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let log;
    let smsAlert = '';
    let durationMins = 0;

    if (gateType === 'ENTRY') {
      const menu = await prisma.menu.findFirst({
        where: {
          mealType: mealType,
          serveDate: { gte: todayStart, lt: todayEnd }
        }
      });

      if (!menu) {
        return res.status(400).json({ error: 'NO_MENU_FOUND', details: 'No active menu found for this meal type today.' });
      }

      const existingLogs = await prisma.mealLog.findMany({
        where: {
          studentId: student.id,
          menuId: menu.id
        }
      });

      const activeLog = existingLogs.find(l => l.exitTime === null);
      if (activeLog) {
        return res.status(400).json({ error: 'ALREADY_IN' }); // Student already checked in
      }

      const completedLog = existingLogs.find(l => l.exitTime !== null);
      if (completedLog) {
        return res.status(400).json({ error: 'ALREADY_EATEN' }); // Meal already consumed
      }

      // Check Penalty
      let penalty = 0;
      const pollResponse = await prisma.mealPollResponse.findFirst({
        where: {
          studentId: student.id,
          mealType: menu.mealType,
          date: { gte: todayStart, lt: todayEnd }
        }
      });
      if (pollResponse && pollResponse.preference === 'SKIPPING') {
        penalty = 50; // Fine for skipping but eating
      }

      log = await prisma.mealLog.create({
        data: {
          studentId: student.id,
          menuId: menu.id,
          entryTime: new Date(),
          status: 'CONSUMED',
          scannerId: 'hardware-scanner',
          penaltyAmount: penalty
        }
      });

      smsAlert = sendSMS(student.user.phone, `Meal Update: ${student.name} entered ${mealType}.`);
    } else {
      // Exit scan
      const activeLog = await prisma.mealLog.findFirst({
        where: {
          studentId: student.id,
          exitTime: null
        }
      });

      if (!activeLog) {
        return res.status(400).json({ error: 'NO_ENTRY' });
      }

      log = await prisma.mealLog.update({
        where: { id: activeLog.id },
        data: { exitTime: new Date() }
      });

      durationMins = Math.round((log.exitTime!.getTime() - log.entryTime.getTime()) / 1000 / 60);
      smsAlert = sendSMS(student.user.phone, `Meal Update: ${student.name} exited ${mealType}.`);
    }

    try {
      const io = getIO();
      const payload = {
        studentId,
        studentName: student.name,
        rollNumber: student.rollNumber,
        mealType,
        gateType,
        duration: durationMins,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        smsAlert
      };
      io.to('staff_terminal').to(`student_${studentId}`).emit('meal_scanned', payload);
    } catch (socketErr) {
      console.warn('Socket broadcast failed:', socketErr);
    }

    return res.json({
      success: true,
      studentName: student.name,
      foodPreference: student.foodPreference,
      message: `${gateType} successful`
    });

  } catch (error: any) {
    console.error('Error in hardwareScanEntry:', error);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};

export const hardwareSyncOffline = async (req: Request, res: Response): Promise<any> => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== (process.env.HARDWARE_API_KEY || 'food-do-esp32-secret')) {
      return res.status(401).json({ error: 'Unauthorized hardware access' });
    }

    const { scans } = req.body;
    if (!scans || !Array.isArray(scans)) {
      return res.status(400).json({ error: 'Missing or invalid scans array' });
    }

    let syncedCount = 0;
    const now = new Date();
    const hours = now.getHours();
    let mealType = 'MEAL';
    if (hours >= 7 && hours < 11) mealType = 'BREAKFAST';
    else if (hours >= 13 && hours < 16) mealType = 'LUNCH';
    else if (hours >= 19 && hours < 23) mealType = 'DINNER';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const menu = await prisma.menu.findFirst({
      where: {
        mealType: mealType,
        serveDate: { gte: todayStart, lt: todayEnd }
      }
    });

    for (const qrData of scans) {
      if (qrData.includes('|')) {
        const parts = qrData.split('|');
        const studentId = parts[0];
        
        if (studentId && menu) {
          const student = await prisma.student.findUnique({ where: { userId: studentId } });
          if (student) {
            // Check if already logged
            const existingLog = await prisma.mealLog.findFirst({
              where: { studentId: student.id, menuId: menu.id }
            });
            if (!existingLog) {
              await prisma.mealLog.create({
                data: {
                  studentId: student.id,
                  menuId: menu.id,
                  entryTime: new Date(),
                  status: 'CONSUMED',
                  scannerId: 'hardware-scanner-offline'
                }
              });
              syncedCount++;
            }
          }
        }
      }
    }

    return res.json({ success: true, syncedCount, message: `Bulk synced ${syncedCount} offline scans` });
  } catch (error: any) {
    console.error('Error in hardwareSyncOffline:', error);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};

export const manualOverrideEntry = async (req: AuthRequest, res: Response) => {
  try {
    const { rollNumber, gateType = 'ENTRY' } = req.body;

    if (!rollNumber) {
      return res.status(400).json({ error: 'Roll Number is required' });
    }

    const student = await prisma.student.findUnique({
      where: { rollNumber },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found with this Roll Number' });
    }

    // Determine current meal
    const now = new Date();
    const hours = now.getHours();
    let mealType = 'MEAL';
    if (hours >= 7 && hours < 11) mealType = 'BREAKFAST';
    else if (hours >= 13 && hours < 16) mealType = 'LUNCH';
    else if (hours >= 19 && hours < 23) mealType = 'DINNER';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const menu = await prisma.menu.findFirst({
      where: {
        mealType: mealType,
        serveDate: { gte: todayStart, lt: todayEnd }
      }
    });

    if (!menu && gateType === 'ENTRY') {
      return res.status(400).json({ error: 'No active menu found for this time.' });
    }

    let log;
    let smsAlert = '';
    let durationMins = 0;

    if (gateType === 'ENTRY') {
      const existingLogs = await prisma.mealLog.findMany({
        where: {
          studentId: student.id,
          menuId: menu!.id
        }
      });

      const activeLog = existingLogs.find(l => l.exitTime === null);
      if (activeLog) {
        return res.status(400).json({ error: 'Student is already checked in.' });
      }

      const completedLog = existingLogs.find(l => l.exitTime !== null);
      if (completedLog) {
        return res.status(400).json({ error: 'Student has already eaten this meal.' });
      }

      log = await prisma.mealLog.create({
        data: {
          studentId: student.id,
          menuId: menu!.id,
          entryTime: new Date(),
          status: 'CONSUMED',
          scannerId: req.user.id
        }
      });
      smsAlert = sendSMS(student.user.phone, `Meal Update: ${student.name} entered ${mealType} (Manual Override).`);
    } else {
      // Exit scan logic for override
      const activeLog = await prisma.mealLog.findFirst({
        where: { studentId: student.id, exitTime: null }
      });
      if (!activeLog) {
        return res.status(400).json({ error: 'No active entry scan found to exit from.' });
      }

      log = await prisma.mealLog.update({
        where: { id: activeLog.id },
        data: { exitTime: new Date() }
      });
      durationMins = Math.round((log.exitTime!.getTime() - log.entryTime.getTime()) / 1000 / 60);
      smsAlert = sendSMS(student.user.phone, `Meal Update: ${student.name} exited ${mealType} (Manual Override).`);
    }

    // Socket Broadcast
    try {
      const io = getIO();
      const payload = {
        studentId: student.userId,
        studentName: student.name,
        rollNumber: student.rollNumber,
        mealType,
        gateType,
        duration: durationMins,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        smsAlert
      };
      io.to('staff_terminal').to(`student_${student.userId}`).emit('meal_scanned', payload);
    } catch (e) {
      console.warn('Socket error in override');
    }

    res.json({ success: true, message: `Override successful for ${student.name}`, studentName: student.name });

  } catch (error) {
    console.error('Error in manual override:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
