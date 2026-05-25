# ADA Lovelace - Master Context & Memory

## 📌 Estado Atual do Projeto
Bot Node.js integrado via `whatsapp-web.js` e `Linear SDK`, utilizando `Gemini 3.5 Flash` para inteligência multimodal.

## 🚀 Funcionalidades Implementadas
- [x] **Criação Multimodal:** Cria Issues e Projetos a partir de texto, áudio e imagem.
- [x] **Decomposição de Projetos:** Cria um projeto e gera automaticamente 3-5 sub-tarefas iniciais.
- [x] **Gestão de Projetos:** Listagem, arquivamento e resumo inteligente de progresso.
- [x] **Atribuição de Responsáveis:** Atribuir tarefas pelo nome.
- [x] **Suporte a Múltiplos Projetos:** Vincula issues ao projeto pelo nome.
- [x] **Edição Completa:** Status, prioridade e prazos via chat.
- [x] **Comentários:** Adicionar comentários em issues pelo WhatsApp.
- [x] **Detecção de Duplicados:** Avisa tarefas similares antes de criar.
- [x] **Consulta de Equipe:** Listagem de membros.
- [x] **Webhooks:** Notificações de issues, projetos, status, atribuição e comentários.
- [x] **Relatório Semanal:** Manual + automático (segundas 9h BRT).
- [x] **Busca Avançada:** Filtro por responsável.
- [x] **Segurança:** Whitelist de números, assinatura de webhook, alerta de desconexão.
- [x] **UI com Ícones:** Respostas formatadas com emojis.
- [x] **Comandos por Voz:** Transcrição de áudios diretos.
- [x] **Notificações Interativas:** Permite resposta direta no WhatsApp.
- [x] **Daily Briefing:** Resumo matinal automático de tarefas e atrasos às 08:30 BRT.
- [x] **Retrospectiva Semanal:** Análise de retrospectiva semanal divertida às sextas 17h BRT.
- [x] **Reconhecimento Flexível de IDs:** Aceita `Mpr388`, `MPR 388` e normaliza para `MPR-388`.

## 🛠️ Infraestrutura
- **VM:** Google Cloud (`n8n-az-acessorios`)
- **Processo:** PM2 (`linear-whatsapp-bot`) em `linear-whatsapp-bot-2`
- **Webhook HTTPS:** `https://n8n.mprlabs.com.br/linear-webhook`
- **Repositório:** `https://github.com/marcospr3421/linear-whatsapp-bot`

## 🧠 Próximos Passos (Roadmap)
1. **Configurar `LINEAR_WEBHOOK_SECRET`** no `.env` (se necessário).
2. **Migrar para WhatsApp Business API** (longo prazo, mais estável).

## 🔑 Configurações Críticas
- Modelo: `gemini-3.5-flash`
- Memória: 10 mensagens por sessão
- Bot: número Salvy | Notificações: número pessoal Marcos
