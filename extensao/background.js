// background.js
// Service Worker

console.log('[Atrio Extension] 🔌 Background script iniciado');

// Responde a pedidos de contexto
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSeniorContext') {
        // Busca do chrome.storage (foi salvo pelo token-listener.js)
        chrome.storage.local.get(['seniorToken', 'seniorUserInfo'], (data) => {
            if (!data.seniorToken || !data.seniorUserInfo) {
                sendResponse({ error: 'Contexto não encontrado' });
                return;
            }

            sendResponse({
                token: data.seniorToken,
                userInfo: data.seniorUserInfo
            });
        });

        return true; // Mantém o canal aberto para resposta assíncrona
    }
});
