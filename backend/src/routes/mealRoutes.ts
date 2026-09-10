import { Router } from 'express';
import { generateQR, scanEntry, getStudentAttendance, hardwareScanEntry, hardwareSyncOffline, releaseSurplusTokens, getAvailableSurplusTokens, claimSurplusToken, getMyTokens } from '../controllers/mealController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

// Hardware ESP32 scans a student's QR (Uses API Key authentication instead of JWT)
router.post('/hardware-scan', hardwareScanEntry);
router.post('/hardware-sync', hardwareSyncOffline);

router.use(authenticate);

// Manual Admin Override
router.post('/manual-override', authorize(['ADMIN', 'STAFF']), require('../controllers/mealController').manualOverrideEntry);

// Tokens APIs
router.post('/surplus/release', authorize(['ADMIN']), releaseSurplusTokens);
router.get('/surplus/available', getAvailableSurplusTokens);
router.post('/surplus/claim', authorize(['STUDENT']), claimSurplusToken);
router.get('/surplus/my-tokens', authorize(['STUDENT']), getMyTokens);

// Student generates their own QR
router.get('/qr', authorize(['STUDENT']), generateQR);

// Student fetches their attendance reports & heatmap logs
router.get('/attendance', authorize(['STUDENT']), getStudentAttendance);

// Staff scans a student's QR at entry
router.post('/scan', authorize(['STAFF', 'ADMIN']), scanEntry);

export default router;
