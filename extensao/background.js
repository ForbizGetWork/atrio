// background.js
// Service Worker

console.log('[Atrio Extension] 🔌 Background script iniciado');

// Responde a pedidos de contexto
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSeniorContext') {
        // Busca nas abas da Senior
        chrome.tabs.query({ url: 'https://platform.senior.com.br/*' }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                sendResponse({ error: 'Nenhuma aba da Senior encontrada' });
                return;
            }

            // Executa script na primeira aba da Senior para pegar localStorage
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    return {
                        userInfo: localStorage.getItem('SENIOR_USER_INFO'),
                        token: localStorage.getItem('SENIOR_TOKEN') || 'Bearer fake-token-for-testing'
                    };
                }
            }).then((results) => {
                if (results && results[0] && results[0].result) {
                    sendResponse(results[0].result);
                } else {
                    sendResponse({ error: 'Falha ao buscar contexto' });
                }
            }).catch((err) => {
                console.error('[Atrio Extension] Erro ao executar script:', err);
                sendResponse({ error: err.message });
            });
        });

        return true; // Mantém o canal aberto para resposta assíncrona
    }
});
