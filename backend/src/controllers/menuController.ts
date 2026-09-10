import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { getIO } from '../utils/socket';

export const createMenu = async (req: Request, res: Response) => {
  try {
    const { serveDate, mealType, items, totalCalories } = req.body;
    
    // Check if menu for this date and type already exists
    const existing = await prisma.menu.findFirst({
      where: {
        serveDate: new Date(serveDate),
        mealType
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Menu for this meal already exists on this date' });
    }

    const menu = await prisma.menu.create({
      data: {
        serveDate: new Date(serveDate),
        mealType,
        items: JSON.stringify(items),
        totalCalories
      }
    });

    res.status(201).json({ ...menu, items: JSON.parse(menu.items) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const WEEKLY_CYCLE: Record<string, { breakfast: string[], lunch: string[], dinner: string[] }> = {
  Sunday: { breakfast: ['Chat'], lunch: ['Rice', 'Dal', 'Egg Curry', 'Besan Curry (Veg Only)', 'Papad'], dinner: ['Chicken Biriyani', 'Veg Biriyani', 'Chicken Joos', 'Raita (Dal Fry for Veg Only)'] },
  Monday: { breakfast: ['Chuda Poha', 'Ghuguni'], lunch: ['Rice', 'Dal', 'Besan Curry', 'Dahi Bundi'], dinner: ['Roti', 'Rice', 'Dal', 'Buta Dali Curry', 'Simei Kheer'] },
  Tuesday: { breakfast: ['Bada', 'Ghuguni'], lunch: ['Rice', 'Dal', 'Aloo Potala Curry', 'Sagu Papad'], dinner: ['Roti', 'Rice', 'Dal', 'Soyabean Chilli', 'Rasogola'] },
  Wednesday: { breakfast: ['Suji Halwa', 'Ghuguni'], lunch: ['Rice', 'Dal', 'Fish Masala', 'Pampad', 'Manchurian (Veg Only)'], dinner: ['Roti', 'Rice', 'Dal', 'Chilli Chicken', 'Mushroom Chilli (Veg Only)'] },
  Thursday: { breakfast: ['Aloochop', 'Ghuguni'], lunch: ['Rice', 'Dalma', 'Aloo Kalara Chips', 'Amba Khata / Ambula Rai'], dinner: ['Fried Rice', 'Dal Fry', 'Paneer Butter Masala'] },
  Friday: { breakfast: ['Dahibada', 'Aloo Dum', 'Seu'], lunch: ['Rice', 'Dal', 'Fish Masala', 'Mudhi Ghanta', 'Paneer Green Matar Masala', 'Papad (Veg Only)'], dinner: ['Roti', 'Rice', 'Dal', 'Chicken Butter Masala', 'Paneer Butter Masala'] },
  Saturday: { breakfast: ['Idli', 'Ghuguni', 'Chatani'], lunch: ['Rice', 'Dalma', 'Aloo Bharata', 'Badichura / Mix Pickel'], dinner: ['Roti', 'Rice', 'Dal', 'Egg Tadka', 'Veg Tadka'] }
};
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ensureUpcomingMenus = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const todayCount = await prisma.menu.count({
      where: { serveDate: { gte: today, lte: endOfToday } }
    });

    if (todayCount < 3) {
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dayName = DAYS[targetDate.getDay()];
        const dayMenu = WEEKLY_CYCLE[dayName];
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        for (const type of ['BREAKFAST', 'LUNCH', 'DINNER']) {
          const exists = await prisma.menu.findFirst({
            where: { mealType: type, serveDate: { gte: dayStart, lte: dayEnd } }
          });
          if (!exists) {
            await prisma.menu.create({
              data: {
                serveDate: targetDate,
                mealType: type,
                items: JSON.stringify(dayMenu[type.toLowerCase() as 'breakfast' | 'lunch' | 'dinner']),
                totalCalories: type === 'BREAKFAST' ? 380 : type === 'LUNCH' ? 720 : 640,
                isReady: true
              }
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error auto-generating menus:', err);
  }
};

export const getMenus = async (req: Request, res: Response) => {
  try {
    await ensureUpcomingMenus();
    const menus = await prisma.menu.findMany({
      orderBy: { serveDate: 'desc' }
    });
    res.json(menus.map((menu: any) => ({
      ...menu,
      items: typeof menu.items === 'string' ? JSON.parse(menu.items) : menu.items
    })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const notifyReady = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid menu ID format' });
    }
    const { mess } = req.body;

    const menu = await prisma.menu.findUnique({
      where: { id }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const updatedMenu = await prisma.menu.update({
      where: { id },
      data: { isReady: true }
    });

    const itemsList = Array.isArray(menu.items)
      ? menu.items
      : typeof menu.items === 'string'
        ? JSON.parse(menu.items)
        : [];

    try {
      const io = getIO();
      io.emit('food_ready', {
        menuId: menu.id,
        mealType: menu.mealType,
        items: itemsList,
        mess: mess || 'Ramanujan Mess Hall',
        serveDate: menu.serveDate
      });
    } catch (socketErr) {
      console.warn('Socket broadcast failed:', socketErr);
    }

    res.json({ message: 'Notification broadcasted successfully', menu: updatedMenu });
  } catch (error) {
    console.error('Error in notifyReady:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
