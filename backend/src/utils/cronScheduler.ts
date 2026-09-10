import cron from 'node-cron';
import { executeWeeklyReportDispatch } from '../controllers/reportController';

/**
 * Initializes background schedules for the application.
 */
export const initCronJobs = () => {
  console.log('⏰ Initializing background CRON schedulers...');

  // Schedule weekly report dispatches to parents
  // Pattern: "0 20 * * 0" (Every Sunday at 8:00 PM)
  cron.schedule('0 20 * * 0', async () => {
    try {
      console.log('📅 Sunday 8:00 PM: Running scheduled Weekly Parent Report dispatch...');
      await executeWeeklyReportDispatch();
    } catch (error) {
      console.error('❌ Error during scheduled weekly report dispatch:', error);
    }
  });

  console.log('✅ Background CRON schedulers registered successfully.');
};
