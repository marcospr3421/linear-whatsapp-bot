import { initializeWhatsAppClient } from './whatsapp';
import { analyzeContent, fileToGenerativePart } from './gemini';
import { createLinearIssue, createLinearProject } from './linear';
import { Part } from '@google/generative-ai';

const client = initializeWhatsAppClient();

// Add logic to listen for all messages (including sent by you to yourself)
client.on('message_create', async (message: any) => {
  try {
    // Only process messages that start with a specific trigger
    const trigger = '!linear';
    if (!message.body.toLowerCase().startsWith(trigger)) {
      return;
    }

    console.log(`[TRIGGER MATCH] Found trigger in message: ${message.body}`);

    // Remove the trigger from the content to be analyzed
    const cleanContent = message.body.slice(trigger.length).trim();
    
    // If it's just the trigger without content, and no media, ignore
    if (!cleanContent && !message.hasMedia) {
      console.log('Empty trigger message, ignoring.');
      return;
    }

    if (message.isStatus) return;

    const chat = await message.getChat();
    console.log(`[PROCESSING] From: ${chat.name} (${message.from}) | Body: ${cleanContent}`);
    
    try {
      // If the message is from "me", we might want to send a separate message instead of a reply
      // or just reply normally. Let's try to reply.
      await client.sendMessage(message.from, '🤖 Processando sua solicitação para o Linear...');
    } catch (e) {
      console.warn('Initial status message failed:', e);
    }

    let textContent = cleanContent;
    let mediaParts: Part[] = [];

    // Handle media (image, audio, etc.)
    if (message.hasMedia) {
      const media = await message.downloadMedia();
      if (media) {
        mediaParts.push(fileToGenerativePart(media.data, media.mimetype));
        // If the message is just media with no text, provide a default text
        if (!textContent) {
          textContent = 'Analyze the attached media and determine what to create in Linear.';
        }
      }
    }

    // Call Gemini to analyze the content
    const analysis = await analyzeContent(textContent, mediaParts);

    if (!analysis) {
      await message.reply('❌ Falha ao analisar o conteúdo com o Gemini.');
      return;
    }

    console.log('Gemini Analysis:', analysis);

    // Create Issue or Project in Linear
    if (analysis.type === 'project') {
      const result = await createLinearProject(analysis.title, analysis.description);
      if (result.success) {
        await client.sendMessage(message.from, `✅ Projeto criado com sucesso!\n*Título:* ${result.title}\n*Link:* ${result.url}`);
      } else {
        await client.sendMessage(message.from, `❌ Erro ao criar o projeto no Linear.`);
      }
    } else {
      const result = await createLinearIssue(analysis.title, analysis.description);
      if (result.success) {
        await client.sendMessage(message.from, `✅ Issue criada com sucesso!\n*Título:* ${result.title}\n*Link:* ${result.url}`);
      } else {
        await client.sendMessage(message.from, `❌ Erro ao criar a issue no Linear.`);
      }
    }

  } catch (error) {
    console.error('Error processing message:', error);
    try {
      await client.sendMessage(message.from, '❌ Ocorreu um erro interno ao tentar processar sua mensagem.');
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  }
});

// Start the client
client.initialize();
