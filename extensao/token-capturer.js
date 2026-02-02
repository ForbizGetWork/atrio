// token-capturer.js
// Captura token e contexto do usuário em QUALQUER página da Senior
// Este arquivo vai na pasta: c:/Users/Gabriel Artoni/Projetos/Atrio/extensao/

(function () {
    console.log('[Atrio Extension] 🔑 Token Capturer ativo');

    // Intercepta XMLHttpRequest
    const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        if (name.toLowerCase() === 'authorization' && value.includes('Bearer')) {
            chrome.storage.local.set({
                seniorToken: value,
                tokenTimestamp: Date.now()
            });
            console.log('[Atrio Extension] ✅ Token capturado:', value.substring(0, 25) + '...');
        }
        return originalSetHeader.apply(this, arguments);
    };

    // Intercepta Fetch
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (init && init.headers) {
            const headers = init.headers;
            let auth = null;

            if (headers instanceof Headers) {
                auth = headers.get('Authorization') || headers.get('authorization');
            } else if (typeof headers === 'object') {
                auth = headers['Authorization'] || headers['authorization'];
            }

            if (auth && auth.includes('Bearer')) {
                chrome.storage.local.set({
                    seniorToken: auth,
                    tokenTimestamp: Date.now()
                });
                console.log('[Atrio Extension] ✅ Token capturado via Fetch');
            }
        }
        return originalFetch.apply(this, arguments);
    };

    // Captura informações do usuário
    function captureUserInfo() {
        try {
            const userInfoRaw = localStorage.getItem('SENIOR_USER_INFO');
            if (userInfoRaw) {
                const userInfo = JSON.parse(userInfoRaw);
                const userData = userInfo.data || {};

                chrome.storage.local.set({
                    seniorUser: {
                        username: userData.username || userData.subject,
                        tenantDomain: userData.tenantDomain,
                        fullName: userData.fullName || userData.name
                    },
                    userTimestamp: Date.now()
                });

                console.log('[Atrio Extension] ✅ Usuário capturado:', userData.username);
            }
        } catch (e) {
            // Silencioso - normal não ter em todas as páginas
        }
    }

    // Captura imediata e periódica
    captureUserInfo();
    setInterval(captureUserInfo, 5000);
})();
