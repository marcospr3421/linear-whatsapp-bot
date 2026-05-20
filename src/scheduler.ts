import { Client } from 'whatsapp-web.js';
import { generateWeeklyReport } from './linear';
import { ADA } from './messages';
import dotenv from 'dotenv';

dotenv.config();

const NOTIFY_NUMBER = process.env.NOTIFY_NUMBER;
let lastReportWeek = '';

export const startWeeklyReportScheduler = (client: Client) => {
  const check = async () => {
    if (!NOTIFY_NUMBER) return;

    const now = new Date();
    // Segunda-feira às 9h (BRT = UTC-3 → 12h UTC)
    const weekKey = `${now.getUTCFullYear()}-W${getWeekNumber(now)}`;
    if (now.getUTCDay() !== 1 || now.getUTCHours() !== 12 || now.getUTCMinutes() > 10) return;
    if (lastReportWeek === weekKey) return;

    try {
      const report = await generateWeeklyReport();
      await client.sendMessage(NOTIFY_NUMBER, `${ADA}: 📊 *Relatório Semanal*\n\n${report}`);
      lastReportWeek = weekKey;
      console.log('[SCHEDULER] Weekly report sent');
    } catch (error) {
      console.error('[SCHEDULER] Failed to send weekly report:', error);
    }
  };

  setInterval(check, 5 * 60 * 1000);
  console.log('[SCHEDULER] Weekly report scheduler active (Mondays 9h BRT)');
};

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
