import { initializeWhatsAppClient } from './whatsapp';
import { analyzeContent, fileToGenerativePart, GeminiResponse } from './gemini';
import {
  createLinearIssue,
  createLinearProject,
  listLinearProjects,
  archiveLinearProject,
  searchLinearIssuesAdvanced,
  updateIssueStatus,
  assignIssue,
  updateIssuePriority,
  listTeamMembers,
  findSimilarIssues,
  addIssueComment,
  updateIssueDueDate,
  getProjectSummary,
  generateWeeklyReport,
} from './linear';
import { Part } from '@google/generative-ai';
import { startWebhookServer } from './webhook';
import { startWeeklyReportScheduler } from './scheduler';
import { isAllowedNumber } from './auth';
import { ADA, priorityLabel, projectStateIcon, issueStatusIcon } from './messages';
import dotenv from 'dotenv';

dotenv.config();

const client = initializeWhatsAppClient();
const NOTIFY_NUMBER = process.env.NOTIFY_NUMBER;

startWebhookServer(client);
startWeeklyReportScheduler(client);

interface Session {
  history: string[];
  lastAnalysis?: GeminiResponse;
  mediaParts?: Part[];
  pendingCreate?: GeminiResponse;
}
const sessions: Record<string, Session> = {};

client.on('disconnected', async (reason) => {
  if (!NOTIFY_NUMBER) return;
  try {
    await client.sendMessage(
      NOTIFY_NUMBER,
      `${ADA}: ⚠️ *Bot desconectado!*\n\n📱 Reconecte escaneando o QR Code na VM.\n🔍 Motivo: ${reason}`
    );
  } catch {
    /* client may be unusable */
  }
});

client.on('message_create', async (message: any) => {
  try {
    if (message.isStatus) return;

    const chat = await message.getChat();
    if (chat.isGroup) return;

    const userId = message.from;
    if (!isAllowedNumber(userId)) {
      console.log(`[AUTH] Blocked: ${userId}`);
      return;
    }
    if (!sessions[userId]) {
      sessions[userId] = { history: [] };
    }
    const session = sessions[userId];

    if (message.body) {
      console.log(`[MSG] Recebida de ${chat.name}: "${message.body}"`);
      session.history.push(`User: ${message.body}`);
    }

    if (session.history.length > 10) {
      session.history.shift();
    }

    let mediaParts: Part[] = [];
    if (message.hasMedia) {
      const media = await message.downloadMedia();
      if (media) {
        const part = fileToGenerativePart(media.data, media.mimetype);
        mediaParts.push(part);
        session.mediaParts = (session.mediaParts || []).concat([part]);
      }
    }

    const analysis = await analyzeContent(message.body || '', mediaParts, session.history);
    if (!analysis) return;

    console.log(`[INTENT] ${analysis.type} | From: ${chat.name}`);

    if (analysis.type === 'ignore' || analysis.needsClarification) {
      if (analysis.clarificationMessage) {
        await client.sendMessage(userId, `${ADA}: 💬 ${analysis.clarificationMessage}`);
        session.history.push(`ADA: ${analysis.clarificationMessage}`);
      }
      if (analysis.needsClarification) {
        session.lastAnalysis = analysis;
      } else {
        session.lastAnalysis = undefined;
        session.mediaParts = undefined;
      }
      return;
    }

    // HANDLE LIST PROJECTS
    if (analysis.type === 'list_projects') {
      await client.sendMessage(userId, `${ADA}: 🔎 📂 Buscando seus projetos ativos...`);
      const projects = await listLinearProjects();
      if (projects.length === 0) {
        await client.sendMessage(userId, `${ADA}: 📭 Você não possui projetos ativos no momento.`);
      } else {
        let msg = `${ADA} — 📂 *Projetos Ativos* (${projects.length})\n\n`;
        projects.forEach((p, i) => {
          msg += `${i + 1}. ${projectStateIcon(p.state)} *${p.name}*\n   📊 Status: ${p.state}\n   🆔 ID: \`${p.id}\`\n   🔗 ${p.url}\n\n`;
        });
        msg += '💡 _Para cancelar: "cancelar o projeto [nome ou ID]"_';
        await client.sendMessage(userId, msg);
      }
      return;
    }

    // HANDLE CANCEL PROJECT
    if (analysis.type === 'cancel_project') {
      if (!analysis.targetId) {
        await client.sendMessage(userId, `${ADA}: ❓ Qual o nome ou ID do projeto que você deseja cancelar?`);
        return;
      }
      await client.sendMessage(userId, `${ADA}: ⏳ 🗄️ Arquivando o projeto *${analysis.targetId}*...`);
      const result = await archiveLinearProject(analysis.targetId);
      if (result.success) {
        await client.sendMessage(userId, `${ADA}: ✅ 🗄️ Projeto *"${analysis.targetId}"* arquivado com sucesso!`);
      } else {
        await client.sendMessage(userId, `${ADA}: ❌ 🔍 Não encontrei o projeto *"${analysis.targetId}"*. Verifique o nome ou ID.`);
      }
      return;
    }

    // HANDLE SEARCH ISSUES / STATUS
    if (analysis.type === 'search_issues') {
      const query = analysis.searchQuery || message.body || '';
      const assigneeFilter = analysis.searchAssignee ? ` 👤 ${analysis.searchAssignee}` : '';
      await client.sendMessage(userId, `${ADA}: 🔍 📋 Buscando *"${query}"*${assigneeFilter}...`);
      const issues = await searchLinearIssuesAdvanced(query, analysis.searchAssignee);
      if (issues.length === 0) {
        await client.sendMessage(userId, `${ADA}: 🔍❌ Nenhuma tarefa encontrada.`);
      } else {
        let msg = `${ADA} — 📋 *Tarefas* (${issues.length})\n\n`;
        issues.forEach((i) => {
          msg += `📌 *${i.identifier}*: ${i.title}\n   ${issueStatusIcon(i.status)} ${i.status}\n   🎯 ${i.priority || '⚪'}\n   👤 ${i.assignee}\n   📅 ${i.dueDate}\n   🔗 ${i.url}\n\n`;
        });
        await client.sendMessage(userId, msg);
      }
      return;
    }

    // HANDLE ADD COMMENT
    if (analysis.type === 'add_comment') {
      if (!analysis.targetId || !analysis.commentBody) {
        await client.sendMessage(userId, `${ADA}: 💬❓ Informe o ID da tarefa e o comentário.`);
        return;
      }
      await client.sendMessage(userId, `${ADA}: ⏳ 💬 Adicionando comentário em *${analysis.targetId.toUpperCase()}*...`);
      const result = await addIssueComment(analysis.targetId, analysis.commentBody);
      if (result.success) {
        await client.sendMessage(userId, `${ADA}: ✅ 💬 Comentário adicionado em *${result.identifier}*!`);
      } else {
        await client.sendMessage(userId, `${ADA}: ❌ 💬 Falha: ${result.error}`);
      }
      return;
    }

    // HANDLE UPDATE DUE DATE
    if (analysis.type === 'update_due_date') {
      if (!analysis.targetId || !analysis.dueDate) {
        await client.sendMessage(userId, `${ADA}: 📅❓ Informe o ID da tarefa e a data (ex: 2026-05-25).`);
        return;
      }
      await client.sendMessage(userId, `${ADA}: ⏳ 📅 Definindo prazo de *${analysis.targetId.toUpperCase()}* → *${analysis.dueDate}*...`);
      const result = await updateIssueDueDate(analysis.targetId, analysis.dueDate);
      if (result.success) {
        await client.sendMessage(userId, `${ADA}: ✅ 📅 Prazo de *${analysis.targetId.toUpperCase()}* definido para *${result.dueDate}*!`);
      } else {
        await client.sendMessage(userId, `${ADA}: ❌ 📅 Falha: ${result.error}`);
      }
      return;
    }

    // HANDLE PROJECT SUMMARY
    if (analysis.type === 'project_summary') {
      const projectName = analysis.targetId || analysis.title;
      if (!projectName) {
        await client.sendMessage(userId, `${ADA}: 📂❓ Qual projeto você quer consultar?`);
        return;
      }
      await client.sendMessage(userId, `${ADA}: ⏳ 📊 Analisando projeto *${projectName}*...`);
      const summary = await getProjectSummary(projectName);
      if (!summary.success) {
        await client.sendMessage(userId, `${ADA}: ❌ 📂 ${summary.error}`);
        return;
      }
      let msg = `${ADA} — 📊 *Resumo: ${summary.name}*\n\n`;
      msg += `📈 Progresso: *${summary.percent}%* concluído\n`;
      msg += `📋 Total de tarefas: *${summary.total}*\n`;
      msg += `📊 Status do projeto: ${summary.state}\n\n`;
      msg += `*Por status:*\n`;
      Object.entries(summary.byStatus!).forEach(([s, n]) => {
        msg += `  ${issueStatusIcon(s)} ${s}: ${n}\n`;
      });
      msg += `\n*Por responsável:*\n`;
      Object.entries(summary.byAssignee!).forEach(([a, n]) => {
        msg += `  👤 ${a}: ${n}\n`;
      });
      msg += `\n🔗 ${summary.url}`;
      await client.sendMessage(userId, msg);
      return;
    }

    // HANDLE WEEKLY REPORT
    if (analysis.type === 'weekly_report') {
      await client.sendMessage(userId, `${ADA}: ⏳ 📊 Gerando relatório semanal...`);
      const report = await generateWeeklyReport();
      await client.sendMessage(userId, `${ADA}: 📊 *Relatório Semanal*\n\n${report}`);
      return;
    }

    // HANDLE CONFIRM CREATE (after duplicate warning)
    if (analysis.type === 'confirm_create' && session.pendingCreate) {
      const pending = session.pendingCreate;
      session.pendingCreate = undefined;
      await client.sendMessage(userId, `${ADA}: ⚙️ 🚀 Criando tarefa confirmada...`);
      const result = await createLinearIssue(pending.title, pending.description, pending.priority || 0, pending.projectId);
      if (result.success) {
        await client.sendMessage(userId, `${ADA}: ✅ 📌 *Issue criada!*\n\n📛 ${result.title}\n🔗 ${result.url}`);
      } else {
        await client.sendMessage(userId, `${ADA}: ❌ 📌 Erro ao criar a issue.`);
      }
      return;
    }

    // HANDLE UPDATE STATUS
    if (analysis.type === 'update_status') {
      if (!analysis.targetId || !analysis.targetStatus) {
        await client.sendMessage(userId, `${ADA}: 📝❓ Informe o ID da tarefa (ex: MPR-123) e o novo status.`);
        return;
      }
      await client.sendMessage(userId, `${ADA}: ⏳ 🔄 Atualizando *${analysis.targetId.toUpperCase()}* → *${analysis.targetStatus}*...`);
      const result = await updateIssueStatus(analysis.targetId, analysis.targetStatus);
      if (result.success) {
        await client.sendMessage(userId, `${ADA}: ✅ ${issueStatusIcon(result.status!)} Status de *${analysis.targetId.toUpperCase()}* atualizado para *"${result.status}"*!`);
      } else {
        await client.sendMessage(userId, `${ADA}: ❌ 🔄 Falha ao atualizar status: ${result.error}`);
      }
      return;
    }

    // HANDLE ASSIGN ISSUE
    if (analysis.type === 'assign_issue') {
      if (!analysis.targetId || !analysis.assigneeName) {
        await client.sendMessage(userId, `${ADA}: 👤❓ Informe o ID da tarefa (ex: MPR-123) e o nome da pessoa.`);
        return;
      }
      await client.sendMessage(userId, `${ADA}: ⏳ 👤 Atribuindo *${analysis.targetId.toUpperCase()}* → *${analysis.assigneeName}*...`);
      const result = await assignIssue(analysis.targetId, analysis.assigneeName);
      if (result.success) {
        await client.sendMessage(userId, `${ADA}: ✅ 👤 Tarefa *${analysis.targetId.toUpperCase()}* atribuída a *${result.assignee}*!`);
      } else {
        await client.sendMessage(userId, `${ADA}: ❌ 👤 Falha ao atribuir: ${result.error}`);
      }
      return;
    }

    // HANDLE UPDATE PRIORITY
    if (analysis.type === 'update_priority') {
      if (!analysis.targetId || analysis.priority === undefined) {
        await client.sendMessage(userId, `${ADA}: 🎯❓ Informe o ID da tarefa (ex: MPR-123) e a prioridade (1=🚨 2=🔴 3=🟡 4=🟢).`);
        return;
      }
      const pLabel = priorityLabel(analysis.priority);
      await client.sendMessage(userId, `${ADA}: ⏳ 🎯 Alterando prioridade de *${analysis.targetId.toUpperCase()}* → *${pLabel}*...`);
      const result = await updateIssuePriority(analysis.targetId, analysis.priority);
      if (result.success) {
        await client.sendMessage(userId, `${ADA}: ✅ 🎯 Prioridade de *${analysis.targetId.toUpperCase()}* atualizada para *${pLabel}*!`);
      } else {
        await client.sendMessage(userId, `${ADA}: ❌ 🎯 Falha ao atualizar prioridade: ${result.error}`);
      }
      return;
    }

    // HANDLE LIST TEAM
    if (analysis.type === 'list_team') {
      await client.sendMessage(userId, `${ADA}: 🔎 👥 Buscando membros da equipe...`);
      const members = await listTeamMembers();
      if (members.length === 0) {
        await client.sendMessage(userId, `${ADA}: 👥❌ Nenhum membro encontrado na equipe.`);
      } else {
        let msg = `${ADA} — 👥 *Equipe Linear* (${members.length})\n\n`;
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
        await client.sendMessage(userId, `${ADA}: ⚙️ 🚀 Criando ${icon} no Linear...`);
      } catch (e) {}

      if (analysis.type === 'project') {
        const result = await createLinearProject(analysis.title, analysis.description);
        if (result.success) {
          await client.sendMessage(userId, `${ADA}: ✅ 📂 *Projeto criado!*\n\n📛 *Título:* ${result.title}\n🔗 *Link:* ${result.url}`);
          
          if (analysis.issues && analysis.issues.length > 0) {
            await client.sendMessage(userId, `${ADA}: 🛠️ 📌 Criando *${analysis.issues.length}* tarefas iniciais...`);
            for (const issue of analysis.issues) {
              await createLinearIssue(issue.title, issue.description, issue.priority, result.id);
            }
            await client.sendMessage(userId, `${ADA}: ✨ 📌 Todas as tarefas foram vinculadas ao projeto!`);
          }
          session.history.push(`ADA: Projeto criado: ${result.url}`);
        } else {
          await client.sendMessage(userId, `${ADA}: ❌ 📂 Erro ao criar o projeto no Linear.`);
        }
      } else {
        const similar = await findSimilarIssues(analysis.title);
        if (similar.length > 0) {
          let warn = `${ADA}: ⚠️ *Tarefas similares encontradas:*\n\n`;
          similar.forEach((s) => {
            warn += `📌 *${s.identifier}*: ${s.title}\n   ${issueStatusIcon(s.status)} ${s.status}\n   🔗 ${s.url}\n\n`;
          });
          warn += '💡 Responda *"sim, criar mesmo assim"* para confirmar ou reformule o pedido.';
          await client.sendMessage(userId, warn);
          session.pendingCreate = analysis;
          return;
        }

        const result = await createLinearIssue(analysis.title, analysis.description, analysis.priority || 0, analysis.projectId);
        if (result.success) {
          const pLabel = priorityLabel(analysis.priority);
          const projectLine = analysis.projectId ? `\n📂 *Projeto:* ${analysis.projectId}` : '';
          await client.sendMessage(userId, `${ADA}: ✅ 📌 *Issue criada!*\n\n📛 *Título:* ${result.title}\n🎯 *Prioridade:* ${pLabel}${projectLine}\n🔗 *Link:* ${result.url}`);
          session.history.push(`ADA: Issue criada: ${result.url}`);
        } else {
          await client.sendMessage(userId, `${ADA}: ❌ 📌 Erro ao criar a issue no Linear.`);
        }
      }
    }

    session.lastAnalysis = undefined;
    session.mediaParts = undefined;

  } catch (error) {
    console.error('Error processing message:', error);
  }
});

client.initialize();
