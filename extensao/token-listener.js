// token-listener.js
// Roda em contexto isolado para receber mensagens do token-capturer.js

console.log('[Atrio Extension] 👂 Token Listener ativo');

// Escuta mensagens do contexto MAIN
window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'ATRIO_TOKEN_CAPTURED') {
        const token = event.data.token;

        // Salva via chrome.storage (disponível em contexto isolado)
        chrome.storage.local.set({
            seniorToken: token,
            tokenTimestamp: Date.now()
        }).then(() => {
            console.log('[Atrio Extension] 💾 Token salvo no storage');
        });
    }
});

// Também captura dados do usuário do localStorage
function captureUserInfo() {
    try {
        const userInfoRaw = localStorage.getItem('SENIOR_USER_INFO');
        if (userInfoRaw) {
            chrome.storage.local.set({
                seniorUserInfo: userInfoRaw,
                userTimestamp: Date.now()
            });
        }
    } catch (e) {
        // Silencioso
    }
}

// Captura periodicamente
setInterval(captureUserInfo, 5000);
captureUserInfo();
