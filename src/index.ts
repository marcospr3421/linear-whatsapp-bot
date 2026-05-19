import { initializeWhatsAppClient } from './whatsapp';
import { analyzeContent, fileToGenerativePart, GeminiResponse } from './gemini';
import { createLinearIssue, createLinearProject, listLinearProjects, archiveLinearProject, searchLinearIssues, updateIssueStatus } from './linear';
import { Part } from '@google/generative-ai';

const client = initializeWhatsAppClient();

// Simple in-memory session management
interface Session {
  history: string[];
  lastAnalysis?: GeminiResponse;
  mediaParts?: Part[];
}
const sessions: Record<string, Session> = {};

client.on('message_create', async (message: any) => {
  try {
    if (message.isStatus) return;

    const chat = await message.getChat();
    if (chat.isGroup) return;

    const userId = message.from;
    if (!sessions[userId]) {
      sessions[userId] = { history: [] };
    }
    const session = sessions[userId];

    if (message.body) {
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
        await client.sendMessage(userId, `ADA: ${analysis.clarificationMessage}`);
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
      await client.sendMessage(userId, 'ADA: 🔎 Buscando seus projetos ativos...');
      const projects = await listLinearProjects();
      if (projects.length === 0) {
        await client.sendMessage(userId, 'ADA: Você não possui projetos ativos no momento.');
      } else {
        let msg = '*ADA - Seus Projetos Ativos:*\n\n';
        projects.forEach((p, i) => {
          msg += `${i + 1}. *${p.name}*\nStatus: ${p.state}\nID: ${p.id}\n\n`;
        });
        msg += '_Para cancelar um projeto, diga "cancelar o projeto [nome ou ID]"_';
        await client.sendMessage(userId, msg);
      }
      return;
    }

    // HANDLE CANCEL PROJECT
    if (analysis.type === 'cancel_project') {
      if (!analysis.targetId) {
        await client.sendMessage(userId, 'ADA: Qual o nome ou ID do projeto que você deseja cancelar?');
        return;
      }
      await client.sendMessage(userId, `ADA: ⏳ Cancelando o projeto: ${analysis.targetId}...`);
      const result = await archiveLinearProject(analysis.targetId);
      if (result.success) {
        await client.sendMessage(userId, `ADA: ✅ Projeto "${analysis.targetId}" arquivado com sucesso.`);
      } else {
        await client.sendMessage(userId, `ADA: ❌ Não consegui encontrar ou cancelar o projeto "${analysis.targetId}". Verifique o nome/ID.`);
      }
      return;
    }

    // HANDLE SEARCH ISSUES / STATUS
    if (analysis.type === 'search_issues') {
      const query = analysis.searchQuery || message.body || '';
      await client.sendMessage(userId, `ADA: 🔎 Buscando informações sobre "${query}"...`);
      const issues = await searchLinearIssues(query);
      if (issues.length === 0) {
        await client.sendMessage(userId, 'ADA: Não encontrei nenhuma tarefa correspondente.');
      } else {
        let msg = '*ADA - Tarefas Encontradas:*\n\n';
        issues.forEach(i => {
          msg += `*${i.identifier}*: ${i.title}\nStatus: ${i.status}\nPrioridade: ${i.priority || 'Nenhuma'}\n${i.url}\n\n`;
        });
        await client.sendMessage(userId, msg);
      }
      return;
    }

    // HANDLE UPDATE STATUS
    if (analysis.type === 'update_status') {
      if (!analysis.targetId || !analysis.targetStatus) {
        await client.sendMessage(userId, 'ADA: Por favor, me informe o ID da tarefa (ex: MPR-123) e o novo status.');
        return;
      }
      await client.sendMessage(userId, `ADA: ⏳ Atualizando status da tarefa ${analysis.targetId.toUpperCase()} para "${analysis.targetStatus}"...`);
      const result = await updateIssueStatus(analysis.targetId, analysis.targetStatus);
      if (result.success) {
        await client.sendMessage(userId, `ADA: ✅ Status da tarefa *${analysis.targetId.toUpperCase()}* atualizado para "${result.status}" com sucesso!`);
      } else {
        await client.sendMessage(userId, `ADA: ❌ Falha ao atualizar: ${result.error}`);
      }
      return;
    }

    // HANDLE CREATE ISSUE/PROJECT
    if (analysis.type === 'issue' || analysis.type === 'project') {
      try {
        await client.sendMessage(userId, 'ADA: ⚙️ Entendido. Gerando no Linear...');
      } catch (e) {}

      if (analysis.type === 'project') {
        const result = await createLinearProject(analysis.title, analysis.description);
        if (result.success) {
          await client.sendMessage(userId, `ADA: ✅ Projeto criado!\n*Título:* ${result.title}\n*Link:* ${result.url}`);
          
          if (analysis.issues && analysis.issues.length > 0) {
            await client.sendMessage(userId, `ADA: 🛠️ Criando ${analysis.issues.length} tarefas iniciais para este projeto...`);
            for (const issue of analysis.issues) {
              await createLinearIssue(issue.title, issue.description, issue.priority, result.id);
            }
            await client.sendMessage(userId, `ADA: ✨ Todas as tarefas iniciais foram vinculadas ao projeto.`);
          }
          session.history.push(`ADA: Projeto criado: ${result.url}`);
        } else {
          await client.sendMessage(userId, `ADA: ❌ Erro ao criar o projeto no Linear.`);
        }
      } else {
        const result = await createLinearIssue(analysis.title, analysis.description, analysis.priority || 0);
        if (result.success) {
          const priorityLabels: Record<number, string> = { 0: 'Nenhuma', 1: 'Urgente 🚨', 2: 'Alta 🔴', 3: 'Normal 🟡', 4: 'Baixa 🟢' };
          const pLabel = priorityLabels[analysis.priority || 0];
          await client.sendMessage(userId, `ADA: ✅ Issue criada com sucesso!\n*Título:* ${result.title}\n*Prioridade:* ${pLabel}\n*Link:* ${result.url}`);
          session.history.push(`ADA: Issue criada: ${result.url}`);
        } else {
          await client.sendMessage(userId, `ADA: ❌ Erro ao criar a issue no Linear.`);
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
