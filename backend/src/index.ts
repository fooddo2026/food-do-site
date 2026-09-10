import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { initSocket } from './utils/socket';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import menuRoutes from './routes/menuRoutes';
import mealRoutes from './routes/mealRoutes';
import leaveRoutes from './routes/leaveRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import pollRoutes from './routes/pollRoutes';
import { initCronJobs } from './utils/cronScheduler';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

// Initialize Socket.io
initSocket(httpServer);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/dashboard', analyticsRoutes);
app.use('/api/polls', pollRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', message: 'FOOD-DO API is running' });
});

// Initialize background CRON schedulers
initCronJobs();

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Backend restarted successfully.');
});
// Backend restart triggered
