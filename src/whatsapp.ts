import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

// Initialize the WhatsApp client
export const initializeWhatsAppClient = (): Client => {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('Scan the QR Code below to authenticate:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Client authenticated successfully.');
  });

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp Authentication failure:', msg);
  });

  client.on('disconnected', (reason) => {
    console.error('[WHATSAPP] Disconnected:', reason);
  });

  return client;
};
