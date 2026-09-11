import { Router } from 'express';
import {
  submitFeedback,
  getMyTodayFeedback,
  getFeedbackSummary,
} from '../controllers/feedbackController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Student routes
router.post('/submit', authorize(['STUDENT']), submitFeedback);
router.get('/my-today', authorize(['STUDENT']), getMyTodayFeedback);

// Admin / Staff / Warden routes
router.get('/summary', authorize(['ADMIN', 'STAFF', 'WARDEN']), getFeedbackSummary);

export default router;
