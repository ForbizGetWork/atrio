// token-capturer.js
// Captura token e envia para o background script
// Roda no contexto MAIN para interceptar XHR/Fetch

(function () {
    console.log('[Atrio Extension] 🔑 Token Capturer ativo');

    let tokenCapturado = null;

    // Intercepta XMLHttpRequest
    const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        if (name.toLowerCase() === 'authorization' && value.includes('Bearer')) {
            tokenCapturado = value;

            // Envia para o window (será capturado por um content script isolado)
            window.postMessage({
                type: 'ATRIO_TOKEN_CAPTURED',
                token: value
            }, '*');

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
                tokenCapturado = auth;

                window.postMessage({
                    type: 'ATRIO_TOKEN_CAPTURED',
                    token: auth
                }, '*');

                console.log('[Atrio Extension] ✅ Token capturado via Fetch');
            }
        }
        return originalFetch.apply(this, arguments);
    };
    // Função para varrer Storage em busca de tokens já existentes
    function scanStorageForToken() {
        if (tokenCapturado) return;

        const candidates = [];
        const potentialKeys = ['token', 'access_token', 'session', 'auth', 'key'];

        // Helper para verificar se parece um JWT
        const isJWT = (str) => typeof str === 'string' && str.startsWith('eyJ') && str.split('.').length >= 3;

        // Varrer localStorage e sessionStorage
        [localStorage, sessionStorage].forEach(storage => {
            try {
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    const value = storage.getItem(key);

                    // 1. Verificar valor direto
                    if (isJWT(value)) {
                        candidates.push(value);
                        continue;
                    }

                    // 2. Tentar parsear JSON
                    if (value && (value.includes('{') || value.includes('['))) {
                        try {
                            const parsed = JSON.parse(value);
                            // Busca profunda simples (top level)
                            Object.values(parsed).forEach(val => {
                                if (isJWT(val)) candidates.push(val);
                            });
                        } catch (e) { }
                    }
                }
            } catch (e) { }
        });

        if (candidates.length > 0) {
            // Pega o maior candidato (geralmente o token de acesso completo)
            const bestToken = candidates.sort((a, b) => b.length - a.length)[0];
            const tokenFormatted = bestToken.startsWith('Bearer ') ? bestToken : 'Bearer ' + bestToken;

            tokenCapturado = tokenFormatted;

            window.postMessage({
                type: 'ATRIO_TOKEN_CAPTURED',
                token: tokenFormatted
            }, '*');

            console.log('[Atrio Extension] 💾 Token recuperado do Storage');
        }
    }

    // Tentar recuperar do storage periodicamente até encontrar
    const scanInterval = setInterval(() => {
        if (tokenCapturado) {
            clearInterval(scanInterval);
            return;
        }
        scanStorageForToken();
    }, 2000);

    // Executa varredura inicial
    setTimeout(scanStorageForToken, 1000);

})();
