import { Router } from 'express';
import { applyLeave, approveLeave, getStudentLeaves, getAllLeaves } from '../controllers/leaveController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Student applies for leave
router.post('/apply', authorize(['STUDENT']), applyLeave);

// Student retrieves their own leave history
router.get('/my-leaves', authorize(['STUDENT']), getStudentLeaves);

// Admin/Warden retrieves all leave requests
router.get('/all-leaves', authorize(['ADMIN', 'WARDEN']), getAllLeaves);

// Admin/Warden approves/rejects leave
router.patch('/:leaveId/approve', authorize(['ADMIN', 'WARDEN']), approveLeave);

export default router;
