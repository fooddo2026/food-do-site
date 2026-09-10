import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/db';
import { generateToken } from '../utils/jwt';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, portal } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    if (portal === 'student' && user.role !== 'STUDENT') {
      return res.status(403).json({ error: 'You are not allowed to login here' });
    }
    if (portal === 'admin' && user.role === 'STUDENT') {
      return res.status(403).json({ error: 'You are not allowed to login here' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);

    const studentDetails = await prisma.student.findUnique({
      where: { userId: user.id },
      include: { hostel: true }
    });

    const derivedName = studentDetails?.name || cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: derivedName,
        rollNumber: studentDetails?.rollNumber || `CS2026${Math.floor(1000 + Math.random() * 9000)}`,
        hostelName: studentDetails?.hostel?.name || 'BH 01',
        hostel: studentDetails?.hostel?.name || 'BH 01',
        roomNumber: studentDetails?.roomNumber || '304',
        foodPreference: studentDetails?.foodPreference === 'NON_VEG' ? 'Non-Veg' : 'Veg',
        mess: studentDetails?.mess || 'South Block Mess'
      }
    });
  } catch (error: any) {
    console.error('Error in login endpoint:', error);
    return res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { email, phone, password } = req.body;
    
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
        role: 'ADMIN'
      }
    });

    res.status(201).json({ message: 'Admin created successfully', userId: user.id });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            hostel: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      student: user.studentProfile,
      staff: null
    });
  } catch (error: any) {
    console.error('Error in getProfile:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, phone, roomNumber, foodPreference, mess } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (phone) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone }
      });
    }

    if (user.studentProfile) {
      const dbFoodPref = foodPreference === 'Non-Veg' || foodPreference === 'NON_VEG' ? 'NON_VEG' : 'VEG';
      
      const updatedStudent = await prisma.student.update({
        where: { userId },
        data: {
          ...(name && { name }),
          ...(roomNumber && { roomNumber }),
          ...(foodPreference && { foodPreference: dbFoodPref }),
          ...(mess && { mess }),
        },
        include: { hostel: true }
      });

      return res.json({
        message: 'Profile updated successfully',
        student: updatedStudent
      });
    }

    return res.status(400).json({ error: 'Student profile not found for user' });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error?.message });
  }
};

export const registerStudent = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, rollNumber, name, hostelName, roomNumber, foodPreference, mess, studentType } = req.body;

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

    const isDayScholar = studentType === 'DAY_SCHOLAR';

    let hostel = null;
    if (!isDayScholar) {
      hostel = await prisma.hostel.findFirst({
        where: { name: hostelName }
      });

      if (!hostel) {
        hostel = await prisma.hostel.findFirst();
      }
      
      if (!hostel) {
          return res.status(500).json({ error: 'No hostels found in database' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          phone: phone || `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          passwordHash,
          role: 'STUDENT',
        }
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          rollNumber,
          name,
          studentType: isDayScholar ? 'DAY_SCHOLAR' : 'HOSTELER',
          hostelId: isDayScholar ? null : (hostel?.id || null),
          roomNumber: isDayScholar ? null : (roomNumber || '304'),
          foodPreference: foodPreference === 'Non-Veg' ? 'NON_VEG' : 'VEG',
          mess: isDayScholar ? null : (mess || 'South Block Mess')
        }
      });
      return { user, student };
    });

    const token = generateToken(result.user.id, result.user.role);

    res.status(201).json({
      message: 'Student registered successfully',
      token,
      user: {
        id: result.user.id,
        email: email,
        role: result.user.role,
        name: name,
        rollNumber: rollNumber,
        hostel: hostelName || 'BH 01',
        roomNumber: roomNumber || '104',
        foodPreference: foodPreference || 'Veg',
        mess: mess || 'South Block Mess'
      }
    });
  } catch (error: any) {
    console.error('Error in registerStudent:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

export const getHostellerDetails = async (req: Request, res: Response) => {
  try {
    const { rollNumber } = req.params;
    if (typeof rollNumber !== 'string') {
      return res.status(400).json({ error: 'Invalid roll number format' });
    }

    const hosteller = await prisma.masterHosteller.findFirst({
      where: {
        rollNumber: {
          equals: rollNumber,
          mode: 'insensitive'
        }
      }
    });
    
    if (!hosteller) {
      return res.status(404).json({ error: 'Roll number not found in campus hosteller registry' });
    }
    
    res.json(hosteller);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};
