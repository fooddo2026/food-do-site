import { Router } from 'express';
import { createMenu, getMenus, notifyReady } from '../controllers/menuController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getMenus);
// Only ADMIN or STAFF can manage menus
router.post('/', authorize(['ADMIN', 'STAFF']), createMenu);
router.post('/:id/notify-ready', authorize(['ADMIN', 'STAFF']), notifyReady);

export default router;
