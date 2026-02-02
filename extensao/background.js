// background.js
// Service Worker da extensão (roda em background)

console.log('🔌 [Atrio Extension] Background service iniciado');

// Monitora instalação da extensão
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ [Atrio Extension] Extensão instalada com sucesso!');

    // Limpa dados antigos
    chrome.storage.local.clear();
});

// Adiciona headers CORS para permitir chamadas de API do GitHub Pages
chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: [
        {
            id: 1,
            priority: 1,
            action: {
                type: 'modifyHeaders',
                responseHeaders: [
                    {
                        header: 'Access-Control-Allow-Origin',
                        operation: 'set',
                        value: 'https://forbizgetwork.github.io'
                    },
                    {
                        header: 'Access-Control-Allow-Methods',
                        operation: 'set',
                        value: 'GET, POST, PUT, DELETE, OPTIONS'
                    },
                    {
                        header: 'Access-Control-Allow-Headers',
                        operation: 'set',
                        value: 'Authorization, Content-Type'
                    }
                ]
            },
            condition: {
                urlFilter: 'https://platform.senior.com.br/*',
                resourceTypes: ['xmlhttprequest']
            }
        }
    ]
}).catch(err => {
    console.warn('⚠️ [Atrio Extension] Não foi possível configurar CORS:', err);
});

// Listener para mensagens dos content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getContext') {
        chrome.storage.local.get(['seniorToken', 'seniorUser'], (data) => {
            sendResponse(data);
        });
        return true; // Necessário para resposta assíncrona
    }
});
