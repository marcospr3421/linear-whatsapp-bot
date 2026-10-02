import { Client } from 'whatsapp-web.js';
import { generateWeeklyReport, getMyDailyFocus, getTeamWeeklyActivity } from './linear';
import { generateWeeklyAIRetrospective } from './gemini';
import { ADA, formatDailyBriefing } from './messages';
import dotenv from 'dotenv';

dotenv.config();

const NOTIFY_NUMBER = process.env.NOTIFY_NUMBER;
let lastReportWeek = '';
let lastBriefingDate = '';
let lastRetroWeek = '';

export const startWeeklyReportScheduler = (client: Client) => {
  // 1. Weekly standard report (Mondays 9h BRT / 12h UTC)
  const checkWeeklyReport = async () => {
    if (!NOTIFY_NUMBER) return;

    const now = new Date();
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

  // 2. Daily morning briefing (Mon-Fri 8:30 AM BRT / 11:30 UTC)
  const checkDailyBriefing = async () => {
    if (!NOTIFY_NUMBER) return;

    const now = new Date();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isBriefingTime = now.getUTCHours() === 11 && now.getUTCMinutes() >= 30 && now.getUTCMinutes() < 36;
    
    if (!isWeekday || !isBriefingTime) return;

    const todayDateStr = now.toISOString().split('T')[0];
    if (lastBriefingDate === todayDateStr) return;

    try {
      const focus = await getMyDailyFocus();
      if (!focus.success) {
        console.error('[SCHEDULER] Failed to fetch daily focus for briefing:', focus.error);
        return;
      }

      const msg = formatDailyBriefing(focus);

      await client.sendMessage(NOTIFY_NUMBER, msg);
      lastBriefingDate = todayDateStr;
      console.log('[SCHEDULER] Daily briefing sent successfully');
    } catch (error) {
      console.error('[SCHEDULER] Failed to send daily briefing:', error);
    }
  };

  // 3. Friday AI team retrospective (Fridays 17:00 BRT / 20:00 UTC)
  const checkWeeklyRetro = async () => {
    if (!NOTIFY_NUMBER) return;

    const now = new Date();
    const weekKey = `${now.getUTCFullYear()}-W${getWeekNumber(now)}`;
    if (now.getUTCDay() !== 5 || now.getUTCHours() !== 20 || now.getUTCMinutes() > 10) return;
    if (lastRetroWeek === weekKey) return;

    try {
      const activity = await getTeamWeeklyActivity();
      if (!activity.success || !activity.activities) {
        console.error('[SCHEDULER] Failed to fetch weekly activity for retro:', activity.error);
        return;
      }

      const retro = await generateWeeklyAIRetrospective(activity.activities);
      await client.sendMessage(NOTIFY_NUMBER, `${ADA}: 📊 *Retrospectiva Semanal da IA*\n\n${retro}`);
      lastRetroWeek = weekKey;
      console.log('[SCHEDULER] Weekly AI retrospective sent successfully');
    } catch (error) {
      console.error('[SCHEDULER] Failed to send weekly AI retrospective:', error);
    }
  };

  // Run all check schedulers every 5 minutes
  setInterval(() => {
    checkWeeklyReport();
    checkDailyBriefing();
    checkWeeklyRetro();
  }, 5 * 60 * 1000);

  console.log('[SCHEDULER] Schedulers initialized successfully:');
  console.log('  - Weekly Report (Mondays 9h BRT)');
  console.log('  - Daily Morning Briefing (Weekdays 8:30h BRT)');
  console.log('  - AI Weekly Retrospective (Fridays 17:00h BRT)');
};

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
