import { Router } from 'express';
import { getDashboardStats } from '../controllers/analyticsController';
import { dispatchWeeklyReports } from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Analytics are restricted to ADMIN and STAFF
router.get('/dashboard-stats', authorize(['ADMIN', 'STAFF']), getDashboardStats);

// Manual trigger for weekly report dispatches (restricted to ADMIN only)
router.post('/dispatch-weekly-reports', authorize(['ADMIN']), dispatchWeeklyReports);

export default router;
