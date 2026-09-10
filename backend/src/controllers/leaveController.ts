import { Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Student applies for leave
export const applyLeave = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const leave = await prisma.leave.create({
      data: {
        studentId: student.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    });

    res.status(201).json({ message: 'Leave application submitted', leave });
  } catch (error: any) {
    console.error('Error in applyLeave:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

// Student retrieves their own leave history
export const getStudentLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const leaves = await prisma.leave.findMany({
      where: { studentId: student.id },
      orderBy: { startDate: 'desc' }
    });

    res.json(leaves);
  } catch (error: any) {
    console.error('Error in getStudentLeaves:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

// Admin/Warden retrieves all leave applications
export const getAllLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const leaves = await prisma.leave.findMany({
      include: {
        student: {
          select: {
            name: true,
            rollNumber: true,
            roomNumber: true,
            hostel: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    res.json(leaves);
  } catch (error: any) {
    console.error('Error in getAllLeaves:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

// Admin/Warden approves or rejects leave
export const approveLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { leaveId } = req.params;
    const { status } = req.body; // APPROVED or REJECTED

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid leave status' });
    }

    const leave = await prisma.leave.update({
      where: { id: leaveId as string },
      data: { status: status as any }
    });

    res.json({ message: `Leave ${status.toLowerCase()} successfully`, leave });
  } catch (error: any) {
    console.error('Error in approveLeave:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};
