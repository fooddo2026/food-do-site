import { Router } from 'express';
import { login, registerAdmin, getProfile, updateProfile, registerStudent, getHostellerDetails } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/register-admin', registerAdmin); 
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/register-student', registerStudent);
router.get('/hosteller/:rollNumber', getHostellerDetails);

export default router;
