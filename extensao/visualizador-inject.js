// visualizador-inject.js  
// Injeta contexto da Senior no Visualizador de Vagas (GitHub Pages)
// Este arquivo vai na pasta: c:/Users/Gabriel Artoni/Projetos/Atrio/extensao/

(function () {
    console.log('[Atrio Extension] 🚀 Visualizador Inject ativo');

    async function injectContext() {
        try {
            // Busca dados salvos
            const data = await chrome.storage.local.get(['seniorToken', 'seniorUser', 'tokenTimestamp']);

            if (!data.seniorToken || !data.seniorUser) {
                console.warn('[Atrio Extension] ⚠️ Token ou usuário não encontrado.');
                console.warn('[Atrio Extension] 💡 Abra uma aba da Senior X e faça login primeiro!');

                // Mostra aviso na página
                setTimeout(() => {
                    const toast = document.getElementById('toast');
                    if (toast) {
                        toast.textContent = '⚠️ Extensão: Faça login na Senior X em outra aba primeiro!';
                        toast.classList.add('show');
                        setTimeout(() => toast.classList.remove('show'), 5000);
                    }
                }, 2000);

                return;
            }

            // Verifica idade do token (máximo 1 hora)
            const tokenAge = Date.now() - (data.tokenTimestamp || 0);
            if (tokenAge > 60 * 60 * 1000) {
                console.warn('[Atrio Extension] ⚠️ Token expirado. Recarregue uma página da Senior X.');
                return;
            }

            console.log('[Atrio Extension] ✅ Injetando contexto...');

            // Cria objeto de usuário no formato que o auth-service.js espera
            const userInfo = {
                data: {
                    username: data.seniorUser.username,
                    subject: data.seniorUser.username,
                    tenantDomain: data.seniorUser.tenantDomain,
                    fullName: data.seniorUser.fullName
                }
            };

            // Injeta no localStorage
            localStorage.setItem('SENIOR_USER_INFO', JSON.stringify(userInfo));
            localStorage.setItem('SENIOR_TOKEN', data.seniorToken);

            console.log('[Atrio Extension] ✅ Contexto injetado!');
            console.log('[Atrio Extension]    Usuário:', data.seniorUser.username);
            console.log('[Atrio Extension]    Token:', data.seniorToken.substring(0, 30) + '...');

            // Dispara evento para o site
            window.dispatchEvent(new CustomEvent('senior-context-ready', {
                detail: {
                    user: data.seniorUser.username,
                    token: data.seniorToken
                }
            }));

        } catch (error) {
            console.error('[Atrio Extension] ❌ Erro ao injetar contexto:', error);
        }
    }

    // Injeta imediatamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectContext);
    } else {
        injectContext();
    }

    // Monitora mudanças no storage
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && (changes.seniorToken || changes.seniorUser)) {
            console.log('[Atrio Extension] 🔄 Contexto atualizado, reinjetando...');
            injectContext();
        }
    });
})();
