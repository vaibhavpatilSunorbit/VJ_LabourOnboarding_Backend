const cron = require('node-cron');
const { compareAndUpdateLabourPunches } = require('../controllers/attandanceController'); // Replace path
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// === Logger Setup (Winston) ===
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const date = new Date().toISOString().split('T')[0]; // e.g. 2025-07-17
const logFile = path.join(logDir, `labour_cron_${date}.log`);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: logFile }),
    new winston.transports.Console()
  ],
});

// === Job Runner ===
async function runScheduledJob(shiftLabel) {
  try {
    logger.info(` ${shiftLabel} - Job Started`);
    const result = await compareAndUpdateLabourPunches();
    logger.info(` ${shiftLabel} - Success: ${JSON.stringify(result)}`);
  } catch (error) {
    logger.error(` ${shiftLabel} - Failed: ${error.message}`);
  }
}

// === Cron Jobs ===
cron.schedule('0 8 * * *', () => runScheduledJob('Shift 1 (08:00 AM)'));
cron.schedule('0 11 * * *', () => runScheduledJob('Shift 2 (11:00 AM)'));
cron.schedule('0 14 * * *', () => runScheduledJob('Shift 3 (02:00 PM)'));

logger.info('⏰ Labour Cron Jobs Scheduled Successfully');
