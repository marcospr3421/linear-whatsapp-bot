# ADA (Ada Lovelace) - Linear WhatsApp Bot 🤖🚀

Este bot, batizado de **ADA (Ada Lovelace)**, integra o **WhatsApp** com o **Linear**, utilizando a inteligência do **Google Gemini 3.5 Flash** para transformar mensagens de texto, áudio e imagem em tarefas (Issues) ou Projetos de forma automática e inteligente.

## ✨ Funcionalidades

- 📝 **Criação e Gestão de Issues:** Transforma mensagens curtas ou comandos em tickets no Linear. Oferece reconhecimento ultra-flexível de IDs de tarefas (ex: aceita `Mpr388`, `MPR 388` ou `mpr-388` e normaliza automaticamente para `MPR-388`).
- 📂 **Criação de Projetos:** Identifica quando uma solicitação é complexa e sugere a criação de um projeto.
- 📋 **Listagem de Projetos:** Lista projetos ativos e permite o gerenciamento direto pelo WhatsApp.
- 🗄️ **Arquivamento de Projetos:** Permite cancelar ou arquivar projetos existentes através de linguagem natural.
- 🎙️ **Suporte a Áudio:** Transcreve e analisa áudios enviados para criar tarefas detalhadas.
- 📸 **Suporte a Imagem:** Analisa prints de tela ou fotos para extrair contexto de bugs ou novas funcionalidades.
- 🧠 **Inteligência Contextual:** ADA possui memória de curto prazo para conversas fluidas e solicita informações faltantes (como prioridade) antes de criar tarefas.
- 🔗 **Geração de Links:** Retorna o link direto da tarefa criada no WhatsApp.

## 🛠️ Tecnologias Utilizadas

- [Node.js](https://nodejs.org/)
- [whatsapp-web.js](https://wwebjs.dev/) - Cliente WhatsApp via Puppeteer.
- [Google Gemini 3.5 Flash](https://ai.google.dev/) - IA para análise multimodal.
- [Linear SDK](https://developers.linear.app/docs/sdk/getting-started) - Integração com a API do Linear.
- [PM2](https://pm2.keymetrics.io/) - Gerenciamento de processo em background.

## 🚀 Como Instalar e Rodar

### Pré-requisitos

1. **Node.js 20+** instalado.
2. **Dependências do Puppeteer** no Linux (Chromium, etc).
3. **Linear API Key**: Gerada em *Settings > Account > Security*.
4. **Google AI API Key**: Gerada no [Google AI Studio](https://aistudio.google.com/).

### Passo a Passo

1. **Clonar e Instalar:**
   ```bash
   # (Caso já tenha clonado do GitHub)
   npm install
   ```

2. **Configurar Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   LINEAR_API_KEY=sua_chave_aqui
   LINEAR_TEAM_ID=id_do_time_opcional
   ```

3. **Rodar em Modo Desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Rodar em Produção (PM2):**
   ```bash
   pm2 start ecosystem.config.js
   ```

## 📱 Como Usar

Para evitar que o bot processe conversas pessoais, ele responde apenas ao comando `!linear`.

- **Texto Simples:** `!linear criar uma issue para revisar o fluxo de checkout`
- **Encaminhando Áudio/Imagem:** Encaminhe a mídia para o bot e envie uma mensagem com `!linear` no mesmo chat.
- **Exemplo de Resposta:**
  > ✅ Issue criada com sucesso!
  > **Título:** Revisar fluxo de checkout
  > **Link:** https://linear.app/workspace/issue/ENG-123

## 📝 Notas de Versão

- **v1.1.0**: Migração para Gemini 3.5 Flash, novos agendadores (Daily Briefing e Weekly AI Retrospective), suporte nativo a comandos de voz direto por áudio, notificações interativas com resposta direta e normalização inteligente de IDs de tarefas.
- **v1.0.0**: Lançamento inicial com suporte multimodal e comando de gatilho.

---
Desenvolvido com ❤️ usando Cursor e Google Cloud VM.
