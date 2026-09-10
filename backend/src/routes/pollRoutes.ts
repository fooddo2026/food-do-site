import { Router } from 'express';
import { getActivePoll, submitPoll, getPollSummary } from '../controllers/pollController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Student routes
router.get('/active', authorize(['STUDENT']), getActivePoll);
router.post('/respond', authorize(['STUDENT']), submitPoll);

// Admin/Staff routes
router.get('/summary', authorize(['ADMIN', 'STAFF', 'WARDEN']), getPollSummary);

export default router;
