import { initializeWhatsAppClient } from './whatsapp';
import { analyzeContent, fileToGenerativePart } from './gemini';
import { createLinearIssue, createLinearProject } from './linear';
const client = initializeWhatsAppClient();
// Add logic to listen for messages
client.on('message', async (message) => {
    try {
        // Only process messages that start with a specific trigger, or process all messages?
        // Let's process all messages sent directly to the bot, or you can add a trigger like "!linear"
        // To avoid spam, let's just log and process them. In a real-world scenario, you might want to check the sender.
        // Check if message is from a specific number or group, or just process it
        // For now, we'll process all incoming messages that are from users (not status updates)
        if (message.isStatus)
            return;
        console.log(`Received message: ${message.body}`);
        await message.reply('Processando sua mensagem e criando no Linear...');
        let textContent = message.body;
        let mediaParts = [];
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
                await message.reply(`✅ Projeto criado com sucesso!\n*Título:* ${result.title}\n*Link:* ${result.url}`);
            }
            else {
                await message.reply(`❌ Erro ao criar o projeto no Linear.`);
            }
        }
        else {
            const result = await createLinearIssue(analysis.title, analysis.description);
            if (result.success) {
                await message.reply(`✅ Issue criada com sucesso!\n*Título:* ${result.title}\n*Link:* ${result.url}`);
            }
            else {
                await message.reply(`❌ Erro ao criar a issue no Linear.`);
            }
        }
    }
    catch (error) {
        console.error('Error processing message:', error);
        await message.reply('❌ Ocorreu um erro interno ao tentar processar sua mensagem.');
    }
});
// Start the client
client.initialize();
//# sourceMappingURL=index.js.map