import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, phone: true, role: true, isActive: true, createdAt: true, studentProfile: { select: { studentType: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    const mappedUsers = users.map(user => {
      let displayRole = user.role;
      if (user.role === 'STUDENT' && user.studentProfile?.studentType === 'DAY_SCHOLAR') {
        displayRole = 'STUDENT (DAY_S)';
      }
      return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: displayRole,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };
    });
    
    res.json(mappedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, rollNumber, name, hostelId, roomNumber, foodPreference, studentType } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    });

    if (existing) {
      return res.status(400).json({ error: 'User with email or phone already exists' });
    }

    const existingStudent = await prisma.student.findFirst({
      where: { rollNumber }
    });

    if (existingStudent) {
      if (existingStudent.rollNumber.toLowerCase() === rollNumber.toLowerCase()) {
        return res.status(400).json({ error: 'Student with this roll number already exists' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          role: 'STUDENT',
        }
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          rollNumber,
          name,
          hostelId: studentType === 'DAY_SCHOLAR' ? null : hostelId,
          roomNumber: studentType === 'DAY_SCHOLAR' ? null : roomNumber,
          foodPreference,
          studentType: studentType || 'HOSTELER'
        }
      });
      return { user, student };
    });

    res.status(201).json({ message: 'Student created successfully', studentId: result.student.id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHostels = async (req: Request, res: Response) => {
  try {
    const hostels = await prisma.hostel.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(hostels);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createStaffOrUser = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, role } = req.body;
    const userRole = role || 'STAFF';

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    });

    if (existing) {
      return res.status(400).json({ error: 'User with email or phone already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        role: userRole,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    res.status(201).json({ message: `${userRole} created successfully`, user });
  } catch (error: any) {
    console.error('Error in createStaffOrUser:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Admins cannot delete themselves
    const reqUser = (req as any).user;
    if (reqUser && reqUser.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    await prisma.$transaction(async (tx) => {
      // Unlink warden if this user manages any hostels
      await tx.hostel.updateMany({
        where: { wardenId: id },
        data: { wardenId: null }
      });

      // Find if this user is a student
      const student = await tx.student.findUnique({
        where: { userId: id }
      });

      if (student) {
        // Delete all meal poll responses for this student
        await tx.mealPollResponse.deleteMany({
          where: { studentId: student.id }
        });

        // Delete all meal logs for this student
        await tx.mealLog.deleteMany({
          where: { studentId: student.id }
        });

        // Delete all leaves for this student
        await tx.leave.deleteMany({
          where: { studentId: student.id }
        });

        // Delete student profile
        await tx.student.delete({
          where: { id: student.id }
        });
      }

      // Finally delete the user
      await tx.user.delete({
        where: { id }
      });
    });

    res.json({ message: 'User and all related records deleted permanently' });
  } catch (error: any) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ error: 'Failed to delete user permanently', details: error.message });
  }
};


