# Documentação Técnica: ADA (Ada Lovelace) - Linear WhatsApp Bot

## 🤖 Visão Geral
ADA é uma assistente inteligente que integra o WhatsApp ao Linear. Ela utiliza o **Google Gemini 2.5 Flash** para processar entradas multimodais (texto, áudio e imagem) e gerenciar o fluxo de trabalho no Linear de forma conversacional.

## 🧠 Inteligência e Comportamento
- **Personalidade:** ADA segue o legado de Ada Lovelace — profissional, eficiente e lógica.
- **Memória de Curto Prazo:** Mantém o contexto das últimas 10 interações por usuário para permitir conversas fluidas.
- **Processamento Multimodal:**
  - **Áudio:** Transcreve e analisa comandos de voz.
  - **Imagem:** Identifica bugs ou contextos em capturas de tela.
- **Decomposição de Projetos:** Ao criar um projeto, ADA sugere e cria automaticamente 3-5 tarefas iniciais relacionadas.

## 🛠️ Comandos e Intenções (Linguagem Natural)
ADA não exige comandos rígidos, mas entende intenções como:
1. **Criação de Issues:** "Crie uma tarefa para...", "Preciso consertar..."
2. **Criação de Projetos:** "Crie um projeto sobre...", "Vamos iniciar a iniciativa..."
3. **Listagem:** "Quais são meus projetos ativos?", "Liste o que temos em andamento."
4. **Cancelamento:** "Cancele o projeto [Nome]", "Arquive o projeto [ID]."
5. **Gestão de Prioridade:** Entende níveis 1 (Urgente) a 4 (Baixa).

## 🏗️ Arquitetura do Sistema
- **`src/index.ts`:** Orquestrador principal, gerencia sessões de usuário e fluxo de mensagens.
- **`src/gemini.ts`:** Interface com a IA. Define os prompts do sistema e a estrutura de decisão (JSON).
- **`src/linear.ts`:** Módulo de integração com o Linear SDK (Criação, Listagem, Arquivamento).
- **`src/whatsapp.ts`:** Configuração do cliente `whatsapp-web.js` e autenticação via QR Code.

## 🚀 Manutenção na VM (Google Cloud)
O bot está rodando na VM `n8n-az-acessorios` sob o gerenciamento do **PM2**.

- **Ver Logs:** `pm2 logs linear-whatsapp-bot`
- **Reiniciar:** `pm2 restart linear-whatsapp-bot`
- **Parar:** `pm2 stop linear-whatsapp-bot`

## 🔐 Segurança e Privacidade
- O bot processa apenas mensagens em **chats privados (DMs)** para evitar spam em grupos.
- Possui filtro de "lixo" (garbage filter) para evitar a criação de tarefas vazias ou por engano (ex: agradecimentos ou testes).
- As chaves de API são armazenadas estritamente no arquivo `.env` local, nunca enviadas ao repositório público.
