import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface SMSQueueTask {
  toPhone: string;
  text: string;
}

const smsQueue: SMSQueueTask[] = [];
let isProcessingQueue = false;

const processSMSQueue = async () => {
  if (isProcessingQueue || smsQueue.length === 0) return;
  isProcessingQueue = true;

  while (smsQueue.length > 0) {
    const task = smsQueue.shift();
    if (!task) break;

    try {
      await dispatchRealSMS(task.toPhone, task.text);
    } catch (err) {
      console.error('[SMS Queue Error]:', err);
    }
  }

  isProcessingQueue = false;
};

/**
 * Helper to dispatch real SMS via Fast2SMS (India) or Twilio
 */
const dispatchRealSMS = async (toPhone: string, text: string) => {
  const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const senderPhone = process.env.TWILIO_SENDER_PHONE;
  const cleanPhone = toPhone.replace(/\D/g, '');
  const tenDigitNumber = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

  // 1. Try Fast2SMS (popular in India for numbers like +91 9296099114)
  if (fast2smsApiKey) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: text,
          numbers: tenDigitNumber
        })
      });
      const data = await response.json();
      console.log(`[Fast2SMS Sent] to ${tenDigitNumber}:`, data);
      return;
    } catch (err) {
      console.error('[Fast2SMS Error] Failed to send SMS:', err);
    }
  }

  // 2. Try Twilio
  const client = accountSid && authToken ? twilio(accountSid, authToken) : null;
  if (client && senderPhone) {
    try {
      const msg = await client.messages.create({
        body: text,
        from: senderPhone,
        to: toPhone.startsWith('+') ? toPhone : `+91${tenDigitNumber}`
      });
      console.log(`[Twilio SMS Sent] Message SID: ${msg.sid}`);
    } catch (err) {
      console.error('[Twilio SMS Error] Failed to send SMS:', err);
    }
    return;
  }

  // 3. Fallback Simulation Output
  console.log(`📡 [SMS QUEUE DISPATCHED] To: ${toPhone} | Msg: "${text}"`);
};

export const sendSMS = (
  toPhone: string,
  message: string
): string => {
  smsQueue.push({ toPhone, text: message });
  setImmediate(processSMSQueue);
  return message;
};
