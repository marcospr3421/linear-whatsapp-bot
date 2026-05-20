# Documentação Técnica: ADA (Ada Lovelace) - Linear WhatsApp Bot

## 🤖 Visão Geral
ADA é uma assistente inteligente que integra o WhatsApp ao Linear. Ela utiliza o **Google Gemini 2.5 Flash** para processar entradas multimodais (texto, áudio e imagem) e gerenciar o fluxo de trabalho no Linear de forma conversacional.

## 🧠 Inteligência e Comportamento
- **Personalidade:** ADA segue o legado de Ada Lovelace — profissional, eficiente e lógica.
- **Memória de Curto Prazo:** Mantém o contexto das últimas 10 interações por usuário.
- **Processamento Multimodal:** Texto, áudio e imagem.
- **Decomposição de Projetos:** Cria projeto + 3-5 tarefas iniciais automaticamente.
- **Detecção de Duplicados:** Avisa antes de criar tarefas similares.

## 🛠️ Comandos (Linguagem Natural)
1. **Criação:** "Crie uma tarefa para...", "Novo projeto sobre..."
2. **Listagem:** "Quais são meus projetos?", "Liste a equipe"
3. **Busca:** "Busque tarefas do Marcos", "Status da MPR-123"
4. **Edição:** Status, prioridade, prazo, atribuição
5. **Comentários:** "Comente na MPR-123 que o orçamento foi aprovado"
6. **Resumo:** "Como está o projeto App Mobile?"
7. **Relatório:** "Relatório semanal" (também automático às segundas 9h)

## 🏗️ Arquitetura
- `src/index.ts` — Orquestrador e handlers
- `src/gemini.ts` — IA e intenções
- `src/linear.ts` — Linear SDK
- `src/webhook.ts` — Notificações do Linear (HTTPS)
- `src/scheduler.ts` — Relatório semanal automático
- `src/auth.ts` — Whitelist de números
- `src/messages.ts` — Formatação com ícones

## 🚀 Deploy na VM (Google Cloud)
```bash
cd ~/linear-whatsapp-bot-2
pm2 restart linear-whatsapp-bot
pm2 logs linear-whatsapp-bot
```

## 🔗 Webhook Linear
- **URL:** `https://n8n.mprlabs.com.br/linear-webhook`
- **Eventos:** Issues, Projects, Comments
- **Secret:** Configure `LINEAR_WEBHOOK_SECRET` no `.env` (copie do Linear ao criar o webhook)
- **Health check:** `https://n8n.mprlabs.com.br/health` (via proxy nginx — adicionar se necessário)

## 🔐 Segurança
- Apenas DMs (ignora grupos)
- `ALLOWED_NUMBERS` — lista de IDs autorizados (`5511999999999@c.us`)
- Validação de assinatura HMAC do Linear
- Chaves apenas no `.env` (nunca no Git)

## 📱 Números
- **Bot (Salvy):** Número que responde comandos
- **Notificações:** `NOTIFY_NUMBER` — recebe alertas de webhook
