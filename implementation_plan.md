# Plano de Implementação - Recursos Avançados para a ADA Lovelace

Este plano detalha o status dos backups gerais realizados e descreve o design técnico para implementar as novas capacidades avançadas no seu robô de WhatsApp do Linear (**ADA Lovelace**).

---

## 📂 Status do Backup Geral (Concluído e Seguro)

Antes de fazer qualquer modificação, realizei um backup completo de segurança:

1. **Backup em Arquivo Local (Tarball)**:
   * **Localização**: `/home/marcos/linear-whatsapp-bot-2-backup-1779737370.tar.gz` (tamanho: ~60KB).
   * **Conteúdo**: Todos os arquivos de código (`src`), as configurações do ambiente (`.env`), arquivos de documentação (`README.md`, `DOCS.md`, `MEMORY.md`), excluindo as pastas pesadas de sessão (`.wwebjs_auth`) e bibliotecas (`node_modules`).
2. **Backup na Nuvem (GitHub)**:
   * Realizei o commit de todas as nossas melhorias de hoje (correção do loop de auto-resposta, migração para Gemini 3.5 Flash, novos status de projetos e instalação do `antigravity-sdk`).
   * Enviei tudo com sucesso para a branch principal no seu GitHub oficial (`main -> main`). Seu repositório online está 100% atualizado e seguro!

---

## 🎯 Novas Funcionalidades Planejadas

Implementaremos as funcionalidades de forma incremental e robusta:

### 🎙️ 1. Transcrição de Áudio e Comandos de Voz
Permitir que você envie áudios diretamente para a Ada no WhatsApp. Ela ouvirá o áudio, transcreverá e executará as ações de projetos/tarefas.
* **Como será feito**: O WhatsApp Web JS baixa o áudio (mimetype `audio/ogg; codecs=opus`). Converteremos esse áudio para base64 e enviaremos diretamente ao modelo `gemini-3.5-flash` como uma parte multimodal, permitindo que ele transcreva e decida a ação de uma única vez no prompt!

### 📅 2. Notificações Interativas com Resposta Direta
Quando alguém comentar em uma tarefa sua ou te atribuir algo, a Ada te notificará e você poderá responder a essa notificação diretamente pelo WhatsApp!
* **Como será feito**: Armazenaremos o ID da tarefa notificada no contexto da sua sessão de chat. Se você responder à notificação, a Ada interceptará a mensagem e postará automaticamente como um comentário na mesma tarefa do Linear, mantendo a conversa fluida sem sair do WhatsApp!

### 🌅 3. "Daily Briefing" (Resumo Matinal Diário)
Ada enviará a você um resumo matinal diário de segunda a sexta-feira às 08:30 (horário de Brasília) no WhatsApp.
* **Como será feito**: Criaremos um agendador (*cron scheduler*) ativo que busca suas tarefas com prazo para hoje, tarefas atrasadas e um resumo rápido das atualizações recentes da equipe, enviando um relatório matinal super motivador e carinhoso!

### 📊 4. Retrospectiva Semanal da IA nas Sextas-Feiras
Toda sexta-feira às 17:00 (Brasília), a Ada fará uma análise de tudo o que a equipe entregou na semana e enviará uma retrospectiva inteligente sobre o desempenho do time.
* **Como será feito**: O agendador coletará todas as ações do Linear dos últimos 7 dias e as enviará a uma chamada especializada do Gemini 3.5 Flash para gerar uma análise produtiva e divertida ("Quem foi o destaque da semana", gargalos, e conselhos de liderança).

---

## 🛠️ Plano de Verificação

### Testes Automatizados:
* Rodar o compilador TypeScript (`npx tsc`) para certificar que todas as importações e tipos estão 100% íntegros.
* Reiniciar o PM2 e monitorar logs (`pm2 logs`) para garantir que os agendadores iniciem com sucesso.

### Testes Manuais:
1. **Comando de Voz**: Enviar uma mensagem de voz no WhatsApp e testar a criação de uma tarefa por voz.
2. **Notificação Interativa**: Comentar no Linear e responder à notificação pelo WhatsApp.
3. **Daily Briefing**: Rodar o agendador de testes de forma imediata para validar a formatação do briefing de tarefas.
