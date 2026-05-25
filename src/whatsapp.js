"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWhatsAppClient = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
// Initialize the WhatsApp client
const initializeWhatsAppClient = () => {
    const client = new whatsapp_web_js_1.Client({
        authStrategy: new whatsapp_web_js_1.LocalAuth(),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });
    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('Scan the QR Code below to authenticate:');
        qrcode_terminal_1.default.generate(qr, { small: true });
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
exports.initializeWhatsAppClient = initializeWhatsAppClient;
