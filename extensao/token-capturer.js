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
})();
