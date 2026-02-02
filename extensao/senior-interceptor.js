// senior-interceptor.js
// Roda em TODAS as páginas da Senior para capturar token e contexto

(function () {
    console.log('🔌 [Atrio Extension] Interceptor ativo na Senior');

    let capturedToken = null;
    let capturedUser = null;

    // Intercepta XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        if (name.toLowerCase() === 'authorization' && value.includes('Bearer')) {
            capturedToken = value;

            // Salva no storage da extensão
            chrome.storage.local.set({
                seniorToken: value,
                tokenTimestamp: Date.now()
            });

            console.log('✅ [Atrio Extension] Token capturado:', value.substring(0, 30) + '...');
        }
        return originalXHRSetRequestHeader.apply(this, arguments);
    };

    // Intercepta Fetch
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (init && init.headers) {
            const headers = init.headers;
            let authHeader = null;

            if (headers instanceof Headers) {
                authHeader = headers.get('Authorization') || headers.get('authorization');
            } else if (typeof headers === 'object') {
                authHeader = headers['Authorization'] || headers['authorization'];
            }

            if (authHeader && authHeader.includes('Bearer')) {
                capturedToken = authHeader;
                chrome.storage.local.set({
                    seniorToken: authHeader,
                    tokenTimestamp: Date.now()
                });
                console.log('✅ [Atrio Extension] Token capturado via Fetch');
            }
        }
        return originalFetch.apply(this, arguments);
    };

    // Captura informações do usuário do localStorage
    function captureUserInfo() {
        try {
            const userInfoRaw = localStorage.getItem('SENIOR_USER_INFO');
            if (userInfoRaw) {
                const userInfo = JSON.parse(userInfoRaw);
                const userData = userInfo.data || {};

                capturedUser = {
                    username: userData.username || userData.subject,
                    tenantDomain: userData.tenantDomain,
                    fullName: userData.fullName || userData.name
                };

                chrome.storage.local.set({
                    seniorUser: capturedUser,
                    userTimestamp: Date.now()
                });

                console.log('✅ [Atrio Extension] Usuário capturado:', capturedUser.username);
            }
        } catch (e) {
            console.warn('⚠️ [Atrio Extension] Erro ao capturar usuário:', e);
        }
    }

    // Tenta capturar imediatamente
    captureUserInfo();

    // Monitora mudanças no localStorage
    window.addEventListener('storage', captureUserInfo);

    // Tenta capturar periodicamente (fallback)
    setInterval(captureUserInfo, 5000);
})();
