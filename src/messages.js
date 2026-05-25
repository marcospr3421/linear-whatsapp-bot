"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueStatusIcon = exports.projectStateIcon = exports.priorityLabel = exports.ADA = void 0;
exports.ADA = '🤖 *ADA*';
const priorityLabel = (p) => {
    const labels = {
        0: '⚪ Nenhuma',
        1: '🚨 Urgente',
        2: '🔴 Alta',
        3: '🟡 Normal',
        4: '🟢 Baixa',
    };
    return labels[p ?? 0] ?? '⚪ Nenhuma';
};
exports.priorityLabel = priorityLabel;
const projectStateIcon = (state) => {
    const s = state.toLowerCase();
    if (s.includes('started'))
        return '🟢';
    if (s.includes('planned'))
        return '📋';
    if (s.includes('backlog'))
        return '⏳';
    if (s.includes('paused'))
        return '⏸️';
    if (s.includes('completed'))
        return '✅';
    if (s.includes('cancel'))
        return '🚫';
    return '📌';
};
exports.projectStateIcon = projectStateIcon;
const issueStatusIcon = (status) => {
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('conclu'))
        return '✅';
    if (s.includes('progress') || s.includes('andamento'))
        return '🔄';
    if (s.includes('todo') || s.includes('backlog'))
        return '📝';
    if (s.includes('cancel'))
        return '🚫';
    if (s.includes('review'))
        return '👀';
    return '📌';
};
exports.issueStatusIcon = issueStatusIcon;
