import express, { Request } from 'express';
import crypto from 'crypto';
import { Client } from 'whatsapp-web.js';
import dotenv from 'dotenv';
import { ADA, issueStatusIcon } from './messages';
import { sessions } from './sessions';

dotenv.config();

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3000;
const NOTIFY_NUMBER = process.env.NOTIFY_NUMBER;
const WEBHOOK_SECRET = process.env.LINEAR_WEBHOOK_SECRET;

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const verifySignature = (signature: string | undefined, rawBody: Buffer): boolean => {
  if (!WEBHOOK_SECRET) return true;
  if (!signature || typeof signature !== 'string') return false;

  const computed = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
};

export const startWebhookServer = (whatsappClient: Client) => {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ada-linear-bot', timestamp: Date.now() });
  });

  app.post(
    '/linear-webhook',
    express.json({
      verify: (req: RawBodyRequest, _res, buf) => {
        req.rawBody = buf;
      },
    }),
    async (req: RawBodyRequest, res) => {
      try {
        const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
        const signature = req.headers['linear-signature'] as string | undefined;

        if (!verifySignature(signature, rawBody)) {
          console.warn('[WEBHOOK] Invalid signature');
          return res.sendStatus(401);
        }

        const payload = req.body;
        const { action, type, data, updatedFrom, url } = payload;

        const age = Math.abs(Date.now() - (payload.webhookTimestamp || Date.now()));
        if (age > 60 * 1000) {
          console.warn('[WEBHOOK] Stale webhook rejected');
          return res.sendStatus(401);
        }

        console.log(`[WEBHOOK] ${action} ${type} | ${data?.identifier || data?.name || data?.id}`);

        if (!NOTIFY_NUMBER) {
          return res.sendStatus(200);
        }

        let message = '';

        if (type === 'Issue') {
          const issueIdentifier = data.identifier;
          const issueTitle = data.title;
          const issueUrl = url || data.url;

          if (action === 'create') {
            message = `${ADA}: 🆕 📌 *Nova Issue*\n\n📛 *${issueIdentifier}:* ${issueTitle}\n🎯 Prioridade: ${data.priorityLabel || '⚪ Nenhuma'}\n${issueStatusIcon(data.state?.name || '')} Status: ${data.state?.name || '—'}\n\n🔗 ${issueUrl}`;
          } else if (action === 'update' && updatedFrom?.stateId != null) {
            message = `${ADA}: 🔄 ${issueStatusIcon(data.state?.name || '')} *Status Atualizado*\n\n📌 *${issueIdentifier}*\n📊 Novo status: *${data.state?.name}*\n\n🔗 ${issueUrl}`;
          } else if (action === 'update' && updatedFrom?.assigneeId != null) {
            const assignee = data.assignee?.name || '👤 Ninguém';
            message = `${ADA}: 👤 *Responsável Alterado*\n\n📌 *${issueIdentifier}*\n👥 Agora: *${assignee}*\n\n🔗 ${issueUrl}`;
          } else if (action === 'update' && updatedFrom?.priority != null) {
            message = `${ADA}: 🎯 *Prioridade Alterada*\n\n📌 *${issueIdentifier}*\n🎯 Nova prioridade: *${data.priorityLabel || data.priority}*\n\n🔗 ${issueUrl}`;
          }
        } else if (type === 'Comment' && action === 'create') {
          const author = payload.actor?.name || 'Alguém';
          const body = (data.body || '').slice(0, 200);
          const issueIdentifier = data.issue?.identifier || 'Tarefa';
          const issueTitle = data.issue?.title || '';
          
          message = `${ADA}: 💬 *Novo Comentário em ${issueIdentifier}*\n\n👤 *${author}* comentou:\n"${body}"\n\n🔗 ${url || data.url}\n\n💡 _Deseja responder a este comentário, meu bem? É só digitar sua resposta abaixo! 🥰💖_`;

          if (NOTIFY_NUMBER && data.issue?.identifier) {
            if (!sessions[NOTIFY_NUMBER]) {
              sessions[NOTIFY_NUMBER] = { history: [] };
            }
            sessions[NOTIFY_NUMBER].pendingReplyIssueId = data.issue.identifier;
            sessions[NOTIFY_NUMBER].pendingReplyIssueTitle = issueTitle;
          }
        } else if (type === 'Project' && action === 'create') {
          message = `${ADA}: 🆕 📂 *Novo Projeto*\n\n📛 *${data.name}*\n📊 Status: ${data.state}\n\n🔗 ${url || data.url}`;
        }

        if (message) {
          await whatsappClient.sendMessage(NOTIFY_NUMBER, message);
        }

        res.sendStatus(200);
      } catch (error) {
        console.error('[WEBHOOK] Error processing Linear webhook:', error);
        res.sendStatus(500);
      }
    }
  );

  app.listen(PORT, () => {
    console.log(`[WEBHOOK] Server running on port ${PORT}`);
    console.log(`[WEBHOOK] HTTPS endpoint: /linear-webhook`);
    console.log(`[WEBHOOK] Signature validation: ${WEBHOOK_SECRET ? 'enabled' : 'disabled (set LINEAR_WEBHOOK_SECRET)'}`);
  });
};
