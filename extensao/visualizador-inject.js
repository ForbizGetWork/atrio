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
            console.warn('[Atrio Extension] ⚠️ Contexto incompleto/ausente:', response);

            let missing = [];
            if (!response) missing.push('Resposta do Background vazia');
            else {
                if (!response.userInfo) missing.push('UserInfo');
                if (!response.token) missing.push('Token');
            }

            console.warn('[Atrio Extension] ❌ Faltando:', missing.join(', '));
            showWarning(`Contexto incompleto (${missing.join(', ')}). Recarregue a página da Senior X!`);
            return;
        }

        // Verificar se já existe dados (pode ser de setup-login.js ou cache antigo)
        const existingUserInfo = localStorage.getItem('SENIOR_USER_INFO');
        const existingToken = localStorage.getItem('SENIOR_TOKEN');

        if (existingUserInfo || existingToken) {
            console.log('[Atrio Extension] ⚠️ Dados existentes detectados no localStorage. Sobrescrevendo...');
        }

        // Injeta no localStorage (FORÇA sobrescrita)
        localStorage.setItem('SENIOR_USER_INFO', response.userInfo);
        localStorage.setItem('SENIOR_TOKEN', response.token);

        const userInfo = JSON.parse(response.userInfo);
        console.log('[Atrio Extension] ✅ Contexto injetado!');
        console.log('[Atrio Extension]    Usuário:', userInfo.data.username);
        console.log('[Atrio Extension]    Token:', response.token.substring(0, 30) + '...');

        // Dispara evento
        window.dispatchEvent(new CustomEvent('senior-context-ready', {
            detail: { ready: true }
        }));

        // Recarrega página se AuthService já foi carregado mas não tem usuário
        // (significa que carregou antes da extensão injetar)
        if (window.AuthService && !window.AuthService.state.user) {
            console.log('[Atrio Extension] 🔄 Recarregando página para aplicar contexto...');
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
