import { Router } from 'express';
import { getUsers, createStudent, createStaffOrUser, getHostels, deleteUser } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

// Protect all user routes
router.use(authenticate);

// Only ADMIN can view all users
router.get('/', authorize(['ADMIN']), getUsers);

// Only ADMIN can delete users permanently
router.delete('/:id', authorize(['ADMIN']), deleteUser);

// Only ADMIN can create staff or general users
router.post('/staff', authorize(['ADMIN']), createStaffOrUser);

// Only ADMIN or STAFF can get hostels or create student
router.get('/hostels', authorize(['ADMIN', 'STAFF']), getHostels);
router.post('/student', authorize(['ADMIN', 'STAFF']), createStudent);

export default router;

