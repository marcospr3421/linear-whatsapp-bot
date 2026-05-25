"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWeeklyReportScheduler = void 0;
const linear_1 = require("./linear");
const gemini_1 = require("./gemini");
const messages_1 = require("./messages");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const NOTIFY_NUMBER = process.env.NOTIFY_NUMBER;
let lastReportWeek = '';
let lastBriefingDate = '';
let lastRetroWeek = '';
const startWeeklyReportScheduler = (client) => {
    // 1. Weekly standard report (Mondays 9h BRT / 12h UTC)
    const checkWeeklyReport = async () => {
        if (!NOTIFY_NUMBER)
            return;
        const now = new Date();
        const weekKey = `${now.getUTCFullYear()}-W${getWeekNumber(now)}`;
        if (now.getUTCDay() !== 1 || now.getUTCHours() !== 12 || now.getUTCMinutes() > 10)
            return;
        if (lastReportWeek === weekKey)
            return;
        try {
            const report = await (0, linear_1.generateWeeklyReport)();
            await client.sendMessage(NOTIFY_NUMBER, `${messages_1.ADA}: 📊 *Relatório Semanal*\n\n${report}`);
            lastReportWeek = weekKey;
            console.log('[SCHEDULER] Weekly report sent');
        }
        catch (error) {
            console.error('[SCHEDULER] Failed to send weekly report:', error);
        }
    };
    // 2. Daily morning briefing (Mon-Fri 8:30 AM BRT / 11:30 UTC)
    const checkDailyBriefing = async () => {
        if (!NOTIFY_NUMBER)
            return;
        const now = new Date();
        const day = now.getUTCDay();
        const isWeekday = day >= 1 && day <= 5;
        const isBriefingTime = now.getUTCHours() === 11 && now.getUTCMinutes() >= 30 && now.getUTCMinutes() < 36;
        if (!isWeekday || !isBriefingTime)
            return;
        const todayDateStr = now.toISOString().split('T')[0];
        if (lastBriefingDate === todayDateStr)
            return;
        try {
            const focus = await (0, linear_1.getMyDailyFocus)();
            if (!focus.success) {
                console.error('[SCHEDULER] Failed to fetch daily focus for briefing:', focus.error);
                return;
            }
            let msg = `${messages_1.ADA}: 🌅 *Bom dia, ${focus.name}!* 🌸🥰✨\n\n`;
            msg += `Preparei com todo o meu carinho o seu *Daily Briefing* de hoje para te ajudar a brilhar! 💖\n\n`;
            if (focus.overdue && focus.overdue.length > 0) {
                msg += `🚨 *Atenção! Tarefas Atrasadas:* (${focus.overdue.length})\n`;
                focus.overdue.forEach((t) => {
                    msg += `  • *${t.identifier}*: ${t.title} 📅 _(${t.dueDate})_\n`;
                });
                msg += `\n`;
            }
            if (focus.today && focus.today.length > 0) {
                msg += `🎯 *Seu Foco de Hoje:* (${focus.today.length})\n`;
                focus.today.forEach((t) => {
                    msg += `  • *${t.identifier}*: ${t.title}\n`;
                });
                msg += `\n`;
            }
            else {
                msg += `✨ *Hoje você não tem nenhuma tarefa vencendo!* Que alívio, meu bem! 🥰\n\n`;
            }
            if (focus.backlogCount && focus.backlogCount > 0) {
                msg += `📋 Você também tem outras *${focus.backlogCount}* tarefas ativas no backlog geral para ficar de olho quando puder. 🌸\n\n`;
            }
            msg += `Que o seu dia seja maravilhoso, produtivo e cheio de realizações! Estou sempre aqui para te apoiar! 🥰💖🌸✨`;
            await client.sendMessage(NOTIFY_NUMBER, msg);
            lastBriefingDate = todayDateStr;
            console.log('[SCHEDULER] Daily briefing sent successfully');
        }
        catch (error) {
            console.error('[SCHEDULER] Failed to send daily briefing:', error);
        }
    };
    // 3. Friday AI team retrospective (Fridays 17:00 BRT / 20:00 UTC)
    const checkWeeklyRetro = async () => {
        if (!NOTIFY_NUMBER)
            return;
        const now = new Date();
        const weekKey = `${now.getUTCFullYear()}-W${getWeekNumber(now)}`;
        if (now.getUTCDay() !== 5 || now.getUTCHours() !== 20 || now.getUTCMinutes() > 10)
            return;
        if (lastRetroWeek === weekKey)
            return;
        try {
            const activity = await (0, linear_1.getTeamWeeklyActivity)();
            if (!activity.success || !activity.activities) {
                console.error('[SCHEDULER] Failed to fetch weekly activity for retro:', activity.error);
                return;
            }
            const retro = await (0, gemini_1.generateWeeklyAIRetrospective)(activity.activities);
            await client.sendMessage(NOTIFY_NUMBER, `${messages_1.ADA}: 📊 *Retrospectiva Semanal da IA*\n\n${retro}`);
            lastRetroWeek = weekKey;
            console.log('[SCHEDULER] Weekly AI retrospective sent successfully');
        }
        catch (error) {
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
exports.startWeeklyReportScheduler = startWeeklyReportScheduler;
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
