// visualizador-inject.js  
// Injeta contexto da Senior no Visualizador de Vagas (GitHub Pages)

(function () {
    console.log('[Atrio Extension] 🚀 Visualizador Inject ativo');

    // Pede dados para o background script
    chrome.runtime.sendMessage({ action: 'getSeniorContext' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[Atrio Extension] ❌ Erro ao comunicar com background:', chrome.runtime.lastError);
            showWarning('Erro na extensão. Verifique se está instalada corretamente.');
            return;
        }

        if (!response || !response.userInfo || !response.token) {
            console.warn('[Atrio Extension] ⚠️ Nenhum contexto da Senior encontrado');
            showWarning('Faça login na Senior X em outra aba primeiro!');
            return;
        }

        // Injeta no localStorage
        localStorage.setItem('SENIOR_USER_INFO', response.userInfo);
        localStorage.setItem('SENIOR_TOKEN', response.token);

        console.log('[Atrio Extension] ✅ Contexto injetado!');
        console.log('[Atrio Extension]    Usuário:', JSON.parse(response.userInfo).data.username);
        console.log('[Atrio Extension]    Token:', response.token.substring(0, 30) + '...');

        // Dispara evento
        window.dispatchEvent(new CustomEvent('senior-context-ready', {
            detail: { ready: true }
        }));

        // Recarrega se necessário
        if (window.AuthService && !window.AuthService.state.user) {
            location.reload();
        }
    });

    function showWarning(message) {
        console.warn('[Atrio Extension] ⚠️', message);
        setTimeout(() => {
            const toast = document.getElementById('toast');
            if (toast) {
                toast.textContent = `⚠️ ${message}`;
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 5000);
            }
        }, 1000);
    }
})();
