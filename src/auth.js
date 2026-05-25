"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAllowedNumber = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const isAllowedNumber = async (userId, client) => {
    const allowed = process.env.ALLOWED_NUMBERS;
    if (!allowed?.trim())
        return true;
    const allowedList = allowed.split(',').map((n) => n.trim());
    // Direct check
    if (allowedList.includes(userId))
        return true;
    // Check if it's a LID and resolve phone number
    if (userId.endsWith('@lid')) {
        try {
            const result = await client.getContactLidAndPhone(userId);
            // getContactLidAndPhone can return an object or an array of objects
            if (result) {
                const item = Array.isArray(result) ? result[0] : result;
                if (item && item.pn && allowedList.includes(item.pn)) {
                    return true;
                }
            }
        }
        catch (e) {
            console.error('Error resolving LID to phone number:', e);
        }
    }
    return false;
};
exports.isAllowedNumber = isAllowedNumber;
