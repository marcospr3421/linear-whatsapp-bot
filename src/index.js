"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_1 = require("./whatsapp");
const gemini_1 = require("./gemini");
const linear_1 = require("./linear");
const webhook_1 = require("./webhook");
const scheduler_1 = require("./scheduler");
const auth_1 = require("./auth");
const messages_1 = require("./messages");
const sessions_1 = require("./sessions");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = (0, whatsapp_1.initializeWhatsAppClient)();
const NOTIFY_NUMBER = process.env.NOTIFY_NUMBER;
(0, webhook_1.startWebhookServer)(client);
(0, scheduler_1.startWeeklyReportScheduler)(client);
client.on('disconnected', async (reason) => {
    if (!NOTIFY_NUMBER)
        return;
    try {
        await client.sendMessage(NOTIFY_NUMBER, `${messages_1.ADA}: ⚠️ *Bot desconectado!*\n\n📱 Reconecte escaneando o QR Code na VM.\n🔍 Motivo: ${reason}`);
    }
    catch {
        /* client may be unusable */
    }
});
client.on('message_create', async (message) => {
    try {
        if (message.isStatus)
            return;
        // Ignore messages sent by the bot itself to prevent self-reply loops
        if (message.fromMe && message.body && (message.body.startsWith(messages_1.ADA) || message.body.includes(messages_1.ADA))) {
            return;
        }
        const chat = await message.getChat();
        if (chat.isGroup)
            return;
        const userId = message.from;
        if (!(await (0, auth_1.isAllowedNumber)(userId, client))) {
            console.log(`[AUTH] Blocked: ${userId}`);
            return;
        }
        if (!sessions_1.sessions[userId]) {
            sessions_1.sessions[userId] = { history: [] };
        }
        const session = sessions_1.sessions[userId];
        // Intercept replies to comment notifications
        if (session.pendingReplyIssueId && message.body) {
            const replyBody = message.body.trim();
            const issueId = session.pendingReplyIssueId;
            const issueTitle = session.pendingReplyIssueTitle || '';
            const cleanReply = replyBody.toLowerCase();
            if (cleanReply === 'cancelar' || cleanReply === 'abortar' || cleanReply === 'não' || cleanReply === 'nao') {
                session.pendingReplyIssueId = undefined;
                session.pendingReplyIssueTitle = undefined;
                await client.sendMessage(userId, `${messages_1.ADA}: Entendido, meu bem! Cancelei a resposta ao comentário. O que deseja que eu faça agora? 🥰🌸`);
                return;
            }
            await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 💬 Adicionando sua resposta em *${issueId.toUpperCase()}* (${issueTitle})...`);
            session.pendingReplyIssueId = undefined;
            session.pendingReplyIssueTitle = undefined;
            const result = await (0, linear_1.addIssueComment)(issueId, replyBody);
            if (result.success) {
                await client.sendMessage(userId, `${messages_1.ADA}: ✅ 💬 Resposta adicionada com muito amor em *${issueId.toUpperCase()}*! 🥰💖`);
            }
            else {
                await client.sendMessage(userId, `${messages_1.ADA}: ❌ 💬 Ocorreu um probleminha ao adicionar seu comentário: ${result.error} 🌸`);
            }
            return;
        }
        // Manual trigger for Daily Briefing
        const cleanBody = (message.body || '').toLowerCase().trim();
        if (cleanBody === 'daily briefing' || cleanBody === 'resumo matinal' || cleanBody === 'briefing matinal' || cleanBody === 'briefing') {
            await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 🌅 Gerando seu Daily Briefing agora mesmo, meu bem...`);
            const focus = await (0, linear_1.getMyDailyFocus)();
            if (focus.success) {
                let msg = `${messages_1.ADA}: 🌅 *Daily Briefing* 🌸🥰✨\n\n`;
                msg += `Preparei com todo o meu carinho o seu planejamento de hoje! 💖\n\n`;
                if (focus.overdue && focus.overdue.length > 0) {
                    msg += `🚨 *Tarefas Atrasadas:* (${focus.overdue.length})\n`;
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
                    msg += `✨ *Hoje você não tem nenhuma tarefa vencendo!* 🥰\n\n`;
                }
                if (focus.backlogCount && focus.backlogCount > 0) {
                    msg += `📋 Você também tem outras *${focus.backlogCount}* tarefas ativas no backlog geral. 🌸\n\n`;
                }
                msg += `Que o seu dia seja maravilhoso! Estou sempre aqui para te apoiar! 🥰💖🌸✨`;
                await client.sendMessage(userId, msg);
            }
            else {
                await client.sendMessage(userId, `${messages_1.ADA}: ❌ Ocorreu um erro ao gerar o briefing: ${focus.error}`);
            }
            return;
        }
        if (message.body) {
            console.log(`[MSG] Recebida de ${chat.name}: "${message.body}"`);
            session.history.push(`User: ${message.body}`);
        }
        else if (message.hasMedia) {
            console.log(`[MSG] Recebida mídia/áudio de ${chat.name}`);
            session.history.push(`User: [Enviou um áudio ou arquivo de mídia]`);
        }
        if (session.history.length > 10) {
            session.history.shift();
        }
        let mediaParts = [];
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            if (media) {
                const part = (0, gemini_1.fileToGenerativePart)(media.data, media.mimetype);
                mediaParts.push(part);
                session.mediaParts = (session.mediaParts || []).concat([part]);
            }
        }
        const analysis = await (0, gemini_1.analyzeContent)(message.body || '', mediaParts, session.history);
        if (!analysis)
            return;
        console.log(`[INTENT] ${analysis.type} | From: ${chat.name}`);
        if (analysis.type === 'ignore' || analysis.needsClarification) {
            if (analysis.clarificationMessage) {
                await client.sendMessage(userId, `${messages_1.ADA}: 💬 ${analysis.clarificationMessage}`);
                session.history.push(`ADA: ${analysis.clarificationMessage}`);
            }
            if (analysis.needsClarification) {
                session.lastAnalysis = analysis;
            }
            else {
                session.lastAnalysis = undefined;
                session.mediaParts = undefined;
            }
            return;
        }
        // HANDLE LIST PROJECTS
        if (analysis.type === 'list_projects') {
            await client.sendMessage(userId, `${messages_1.ADA}: 🔎 📂 Buscando seus projetos ativos...`);
            const projects = await (0, linear_1.listLinearProjects)();
            if (projects.length === 0) {
                await client.sendMessage(userId, `${messages_1.ADA}: 📭 Você não possui projetos ativos no momento.`);
            }
            else {
                let msg = `${messages_1.ADA} — 📂 *Projetos Ativos* (${projects.length})\n\n`;
                projects.forEach((p, i) => {
                    msg += `${i + 1}. ${(0, messages_1.projectStateIcon)(p.state)} *${p.name}*\n   📊 Status: ${p.state}\n   🆔 ID: \`${p.id}\`\n   🔗 ${p.url}\n\n`;
                });
                msg += '💡 _Para cancelar: "cancelar o projeto [nome ou ID]"_';
                await client.sendMessage(userId, msg);
            }
            return;
        }
        // HANDLE CANCEL PROJECT
        if (analysis.type === 'cancel_project') {
            if (!analysis.targetId) {
                await client.sendMessage(userId, `${messages_1.ADA}: ❓ Qual o nome ou ID do projeto que você deseja cancelar?`);
                return;
            }
            await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 🗄️ Arquivando o projeto *${analysis.targetId}*...`);
            const result = await (0, linear_1.archiveLinearProject)(analysis.targetId);
            if (result.success) {
                await client.sendMessage(userId, `${messages_1.ADA}: ✅ 🗄️ Projeto *"${analysis.targetId}"* arquivado com sucesso!`);
            }
            else {
                await client.sendMessage(userId, `${messages_1.ADA}: ❌ 🔍 Não encontrei o projeto *"${analysis.targetId}"*. Verifique o nome ou ID.`);
            }
            return;
        }
        // HANDLE SEARCH ISSUES / STATUS
        if (analysis.type === 'search_issues') {
            const query = analysis.searchQuery || message.body || '';
            const assigneeFilter = analysis.searchAssignee ? ` 👤 ${analysis.searchAssignee}` : '';
            await client.sendMessage(userId, `${messages_1.ADA}: 🔍 📋 Buscando *"${query}"*${assigneeFilter}...`);
            const issues = await (0, linear_1.searchLinearIssuesAdvanced)(query, analysis.searchAssignee);
            if (issues.length === 0) {
                await client.sendMessage(userId, `${messages_1.ADA}: 🔍❌ Nenhuma tarefa encontrada.`);
            }
            else {
                let msg = `${messages_1.ADA} — 📋 *Tarefas* (${issues.length})\n\n`;
                issues.forEach((i) => {
                    msg += `📌 *${i.identifier}*: ${i.title}\n   ${(0, messages_1.issueStatusIcon)(i.status)} ${i.status}\n   🎯 ${i.priority || '⚪'}\n   👤 ${i.assignee}\n   📅 ${i.dueDate}\n   🔗 ${i.url}\n\n`;
                });
                await client.sendMessage(userId, msg);
            }
            return;
        }
        // HANDLE ADD COMMENT
        if (analysis.type === 'add_comment') {
            if (!analysis.targetId || !analysis.commentBody) {
                await client.sendMessage(userId, `${messages_1.ADA}: 💬❓ Informe o ID da tarefa e o comentário.`);
                return;
            }
            await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 💬 Adicionando comentário em *${analysis.targetId.toUpperCase()}*...`);
            const result = await (0, linear_1.addIssueComment)(analysis.targetId, analysis.commentBody);
            if (result.success) {
                await client.sendMessage(userId, `${messages_1.ADA}: ✅ 💬 Comentário adicionado em *${result.identifier}*!`);
            }
            else {
                await client.sendMessage(userId, `${messages_1.ADA}: ❌ 💬 Falha: ${result.error}`);
            }
            return;
        }
        // HANDLE UPDATE DUE DATE
        if (analysis.type === 'update_due_date') {
            if (!analysis.targetId || !analysis.dueDate) {
                await client.sendMessage(userId, `${messages_1.ADA}: 📅❓ Informe o ID da tarefa e a data (ex: 2026-05-25).`);
                return;
            }
            await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 📅 Definindo prazo de *${analysis.targetId.toUpperCase()}* → *${analysis.dueDate}*...`);
            const result = await (0, linear_1.updateIssueDueDate)(analysis.targetId, analysis.dueDate);
            if (result.success) {
                await client.sendMessage(userId, `${messages_1.ADA}: ✅ 📅 Prazo de *${analysis.targetId.toUpperCase()}* definido para *${result.dueDate}*!`);
            }
            else {
                await client.sendMessage(userId, `${messages_1.ADA}: ❌ 📅 Falha: ${result.error}`);
            }
            return;
        }
        // HANDLE PROJECT SUMMARY
        if (analysis.type === 'project_summary') {
            const projectName = analysis.targetId || analysis.title;
            if (!projectName) {
                await client.sendMessage(userId, `${messages_1.ADA}: 📂❓ Qual projeto você quer consultar?`);
                return;
            }
            await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 📊 Analisando projeto *${projectName}*...`);
            const summary = await (0, linear_1.getProjectSummary)(projectName);
            if (!summary.success) {
                await client.sendMessage(userId, `${messages_1.ADA}: ❌ 📂 ${summary.error}`);
                return;
            }
            let msg = `${messages_1.ADA} — 📊 *Resumo: ${summary.name}*\n\n`;
            msg += `📈 Progresso: *${summary.percent}%* concluído\n`;
            msg += `📋 Total de tarefas: *${summary.total}*\n`;
            msg += `📊 Status do projeto: ${summary.state}\n\n`;
            msg += `*Por status:*\n`;
            Object.entries(summary.byStatus).forEach(([s, n]) => {
                msg += `  ${(0, messages_1.issueStatusIcon)(s)} ${s}: ${n}\n`;
            });
            msg += `\n*Por responsável:*\n`;
            Object.entries(summary.byAssignee).forEach(([a, n]) => {
                msg += `  👤 ${a}: ${n}\n`;
            });
            msg += `\n🔗 ${summary.url}`;
            await client.sendMessage(userId, msg);
            return;
        }
        // HANDLE WEEKLY REPORT
        if (analysis.type === 'weekly_report') {
            await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 📊 Gerando relatório semanal...`);
            const report = await (0, linear_1.generateWeeklyReport)();
            await client.sendMessage(userId, `${messages_1.ADA}: 📊 *Relatório Semanal*\n\n${report}`);
            return;
        }
        // HANDLE CONFIRM CREATE (after duplicate warning)
        if (analysis.type === 'confirm_create' && session.pendingCreate) {
            const pending = session.pendingCreate;
            session.pendingCreate = undefined;
            await client.sendMessage(userId, `${messages_1.ADA}: ⚙️ 🚀 Criando tarefa confirmada...`);
            const result = await (0, linear_1.createLinearIssue)(pending.title, pending.description, pending.priority || 0, pending.projectId);
            if (result.success) {
                await client.sendMessage(userId, `${messages_1.ADA}: ✅ 📌 *Issue criada!*\n\n📛 ${result.title}\n🔗 ${result.url}`);
            }
            else {
                await client.sendMessage(userId, `${messages_1.ADA}: ❌ 📌 Erro ao criar a issue.`);
            }
            return;
        }
        // HANDLE UPDATE STATUS
        if (analysis.type === 'update_status') {
            if (!analysis.targetId || !analysis.targetStatus) {
                await client.sendMessage(userId, `${messages_1.ADA}: 📝❓ Informe o ID da tarefa (ex: MPR-123) ou o nome do projeto e o novo status.`);
                return;
            }
            const target = analysis.targetId.trim();
            const isIssue = /^[a-z]{1,10}-\d+$/i.test(target);
            if (isIssue) {
                await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 🔄 Atualizando tarefa *${target.toUpperCase()}* → *${analysis.targetStatus}*...`);
                const result = await (0, linear_1.updateIssueStatus)(target, analysis.targetStatus);
                if (result.success) {
                    await client.sendMessage(userId, `${messages_1.ADA}: ✅ ${(0, messages_1.issueStatusIcon)(result.status)} Status de *${target.toUpperCase()}* atualizado para *"${result.status}"*! 💖`);
                }
                else {
                    await client.sendMessage(userId, `${messages_1.ADA}: ❌ 🔄 Falha ao atualizar status da tarefa: ${result.error} 🌸`);
                }
            }
            else {
                const projectResult = await (0, linear_1.updateProjectStatus)(target, analysis.targetStatus);
                if (projectResult.success) {
                    let msg = `${messages_1.ADA}: ✅ 📂 Status do projeto *"${projectResult.projectName}"* atualizado para *"${projectResult.state}"*! 🥰`;
                    const bodyLower = (message.body || '').toLowerCase();
                    if (bodyLower.includes('finaliz') || bodyLower.includes('concl') || bodyLower.includes('fech') || bodyLower.includes('termin')) {
                        msg += `\n\n⏳ 🛠️ Finalizando todas as tarefas abertas deste projeto...`;
                        await client.sendMessage(userId, msg);
                        const issuesResult = await (0, linear_1.closeAllProjectIssues)(target);
                        if (issuesResult.success) {
                            msg = `${messages_1.ADA}: ✅ ✨ Status do projeto atualizado e todas as *${issuesResult.count}* tarefas abertas foram concluídas com muito sucesso! 💖🌸`;
                        }
                        else {
                            msg = `${messages_1.ADA}: ⚠️ 📂 Status do projeto atualizado, mas houve uma falha ao concluir as tarefas: ${issuesResult.error} 🌸`;
                        }
                    }
                    await client.sendMessage(userId, msg);
                }
                else if (projectResult.error === 'Projeto não encontrado') {
                    // Fallback: Try updating as an issue by title search!
                    await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 🔄 Projeto *"${target}"* não encontrado. Buscando tarefa ativa correspondente... 🔍💖`);
                    const issueResult = await (0, linear_1.updateIssueStatus)(target, analysis.targetStatus);
                    if (issueResult.success) {
                        await client.sendMessage(userId, `${messages_1.ADA}: ✅ ${(0, messages_1.issueStatusIcon)(issueResult.status)} Status da tarefa *"${issueResult.title}"* (*${issueResult.identifier}*) atualizado para *"${issueResult.status}"*! 🥰💖`);
                    }
                    else {
                        await client.sendMessage(userId, `${messages_1.ADA}: ❌ 🔄 Não encontrei nenhuma tarefa ou projeto correspondente a *"${target}"*. 🌸`);
                    }
                }
                else {
                    await client.sendMessage(userId, `${messages_1.ADA}: ❌ 📂 Falha ao atualizar: ${projectResult.error} 🌸`);
                }
            }
            return;
        }
        // HANDLE ASSIGN ISSUE
        if (analysis.type === 'assign_issue') {
            if (!analysis.targetId || !analysis.assigneeName) {
                await client.sendMessage(userId, `${messages_1.ADA}: 👤❓ Informe o ID da tarefa (ex: MPR-123) e o nome da pessoa.`);
                return;
            }
            await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 👤 Atribuindo *${analysis.targetId.toUpperCase()}* → *${analysis.assigneeName}*...`);
            const result = await (0, linear_1.assignIssue)(analysis.targetId, analysis.assigneeName);
            if (result.success) {
                await client.sendMessage(userId, `${messages_1.ADA}: ✅ 👤 Tarefa *${analysis.targetId.toUpperCase()}* atribuída a *${result.assignee}*!`);
            }
            else {
                await client.sendMessage(userId, `${messages_1.ADA}: ❌ 👤 Falha ao atribuir: ${result.error}`);
            }
            return;
        }
        // HANDLE UPDATE PRIORITY
        if (analysis.type === 'update_priority') {
            if (!analysis.targetId || analysis.priority === undefined) {
                await client.sendMessage(userId, `${messages_1.ADA}: 🎯❓ Informe o ID da tarefa (ex: MPR-123) e a prioridade (1=🚨 2=🔴 3=🟡 4=🟢).`);
                return;
            }
            const pLabel = (0, messages_1.priorityLabel)(analysis.priority);
            await client.sendMessage(userId, `${messages_1.ADA}: ⏳ 🎯 Alterando prioridade de *${analysis.targetId.toUpperCase()}* → *${pLabel}*...`);
            const result = await (0, linear_1.updateIssuePriority)(analysis.targetId, analysis.priority);
            if (result.success) {
                await client.sendMessage(userId, `${messages_1.ADA}: ✅ 🎯 Prioridade de *${analysis.targetId.toUpperCase()}* atualizada para *${pLabel}*!`);
            }
            else {
                await client.sendMessage(userId, `${messages_1.ADA}: ❌ 🎯 Falha ao atualizar prioridade: ${result.error}`);
            }
            return;
        }
        // HANDLE LIST TEAM
        if (analysis.type === 'list_team') {
            await client.sendMessage(userId, `${messages_1.ADA}: 🔎 👥 Buscando membros da equipe...`);
            const members = await (0, linear_1.listTeamMembers)();
            if (members.length === 0) {
                await client.sendMessage(userId, `${messages_1.ADA}: 👥❌ Nenhum membro encontrado na equipe.`);
            }
            else {
                let msg = `${messages_1.ADA} — 👥 *Equipe Linear* (${members.length})\n\n`;
                members.forEach((m, i) => {
                    msg += `${i + 1}. 👤 *${m.displayName}*\n   📛 ${m.name}\n   ✉️ ${m.email}\n\n`;
                });
                msg += '💡 _Para atribuir: "atribua MPR-123 ao [nome]"_';
                await client.sendMessage(userId, msg);
            }
            return;
        }
        // HANDLE CREATE ISSUE/PROJECT
        if (analysis.type === 'issue' || analysis.type === 'project') {
            try {
                const icon = analysis.type === 'project' ? '📂' : '📌';
                await client.sendMessage(userId, `${messages_1.ADA}: ⚙️ 🚀 Criando ${icon} no Linear...`);
            }
            catch (e) { }
            if (analysis.type === 'project') {
                const result = await (0, linear_1.createLinearProject)(analysis.title, analysis.description);
                if (result.success) {
                    await client.sendMessage(userId, `${messages_1.ADA}: ✅ 📂 *Projeto criado!*\n\n📛 *Título:* ${result.title}\n🔗 *Link:* ${result.url}`);
                    if (analysis.issues && analysis.issues.length > 0) {
                        await client.sendMessage(userId, `${messages_1.ADA}: 🛠️ 📌 Criando *${analysis.issues.length}* tarefas iniciais...`);
                        for (const issue of analysis.issues) {
                            await (0, linear_1.createLinearIssue)(issue.title, issue.description, issue.priority, result.id);
                        }
                        await client.sendMessage(userId, `${messages_1.ADA}: ✨ 📌 Todas as tarefas foram vinculadas ao projeto!`);
                    }
                    session.history.push(`ADA: Projeto criado: ${result.url}`);
                }
                else {
                    await client.sendMessage(userId, `${messages_1.ADA}: ❌ 📂 Erro ao criar o projeto no Linear.`);
                }
            }
            else {
                const similar = await (0, linear_1.findSimilarIssues)(analysis.title);
                if (similar.length > 0) {
                    let warn = `${messages_1.ADA}: ⚠️ *Tarefas similares encontradas:*\n\n`;
                    similar.forEach((s) => {
                        warn += `📌 *${s.identifier}*: ${s.title}\n   ${(0, messages_1.issueStatusIcon)(s.status)} ${s.status}\n   🔗 ${s.url}\n\n`;
                    });
                    warn += '💡 Responda *"sim, criar mesmo assim"* para confirmar ou reformule o pedido.';
                    await client.sendMessage(userId, warn);
                    session.pendingCreate = analysis;
                    return;
                }
                const result = await (0, linear_1.createLinearIssue)(analysis.title, analysis.description, analysis.priority || 0, analysis.projectId);
                if (result.success) {
                    const pLabel = (0, messages_1.priorityLabel)(analysis.priority);
                    const projectLine = analysis.projectId ? `\n📂 *Projeto:* ${analysis.projectId}` : '';
                    await client.sendMessage(userId, `${messages_1.ADA}: ✅ 📌 *Issue criada!*\n\n📛 *Título:* ${result.title}\n🎯 *Prioridade:* ${pLabel}${projectLine}\n🔗 *Link:* ${result.url}`);
                    session.history.push(`ADA: Issue criada: ${result.url}`);
                }
                else {
                    await client.sendMessage(userId, `${messages_1.ADA}: ❌ 📌 Erro ao criar a issue no Linear.`);
                }
            }
        }
        session.lastAnalysis = undefined;
        session.mediaParts = undefined;
    }
    catch (error) {
        console.error('Error processing message:', error);
    }
});
client.initialize();
