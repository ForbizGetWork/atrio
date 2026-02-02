// content.js
// Roda no GitHub Pages (forbizgetwork.github.io/atrio) para injetar contexto

(function () {
    console.log('🚀 [Atrio Extension] Content script ativo no Visualizador');

    // Função para injetar dados no site
    async function injectSeniorContext() {
        try {
            // Busca os dados salvos pela extensão
            const data = await chrome.storage.local.get(['seniorToken', 'seniorUser', 'tokenTimestamp']);

            if (!data.seniorToken || !data.seniorUser) {
                console.warn('⚠️ [Atrio Extension] Token ou usuário não encontrado. Abra uma aba da Senior X primeiro!');
                return;
            }

            // Verifica se o token não está muito antigo (máximo 30 minutos)
            const tokenAge = Date.now() - (data.tokenTimestamp || 0);
            if (tokenAge > 30 * 60 * 1000) {
                console.warn('⚠️ [Atrio Extension] Token expirado. Recarregue uma página da Senior X.');
                return;
            }

            console.log('✅ [Atrio Extension] Injetando contexto da Senior no site...');

            // Injeta no localStorage para o auth-service.js ler
            const userInfo = {
                data: {
                    username: data.seniorUser.username,
                    subject: data.seniorUser.username,
                    tenantDomain: data.seniorUser.tenantDomain,
                    fullName: data.seniorUser.fullName
                }
            };

            localStorage.setItem('SENIOR_USER_INFO', JSON.stringify(userInfo));
            localStorage.setItem('SENIOR_TOKEN', data.seniorToken);

            console.log('✅ [Atrio Extension] Contexto injetado com sucesso!');
            console.log('   Usuário:', data.seniorUser.username);
            console.log('   Token:', data.seniorToken.substring(0, 30) + '...');

            // Dispara evento customizado para o site saber que o contexto está pronto
            window.dispatchEvent(new CustomEvent('senior-context-ready', {
                detail: {
                    user: data.seniorUser.username,
                    token: data.seniorToken
                }
            }));

        } catch (error) {
            console.error('❌ [Atrio Extension] Erro ao injetar contexto:', error);
        }
    }

    // Injeta imediatamente
    injectSeniorContext();

    // Monitora mudanças no storage (se o token for atualizado)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && (changes.seniorToken || changes.seniorUser)) {
            console.log('🔄 [Atrio Extension] Token/Usuário atualizado, reinjetando...');
            injectSeniorContext();
        }
    });

    // Adiciona um listener para mensagens do background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'reloadContext') {
            injectSeniorContext();
            sendResponse({ success: true });
        }
    });
})();
