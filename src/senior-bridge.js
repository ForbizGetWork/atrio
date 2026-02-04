import { user } from '@seniorsistemas/senior-platform-data';

console.log('🔌 Senior Bridge: Inicializando...');

window.SeniorBridge = {
    getToken: async () => {
        try {
            console.log('🔌 Senior Bridge: Solicitando token...');
            const tokenData = await user.getToken();
            console.log('✅ Senior Bridge: Token recebido!', tokenData);
            return tokenData; // Retorna { access_token, ... }
        } catch (err) {
            console.error('❌ Senior Bridge: Erro ao obter token:', err);
            return null;
        }
    }
};

// Auto-inicializar se estiver pronto
console.log('🔌 Senior Bridge: Carregado.');
