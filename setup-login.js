/**
 * ARQUIVO DE AJUDA PARA TESTE DE LOGIN
 * 
 * Siga os passos:
 * 1. Na aba da Senior, copie o user info: copy(localStorage.getItem('SENIOR_USER_INFO'))
 * 2. Cole o conteúdo DENTRO das aspas abaixo, substituindo o texto TEM_QUE_COLAR_AQUI
 * 3. Salve este arquivo.
 * 4. Recarregue o index.html no navegador.
 */

(function () {
    // ⚠️ MODO FALLBACK: Só injeta se NÃO existir dados (compatível com extensão)
    const INFO_COPIADA = '{"data":{"changePassword":false,"properties":[],"admin":true,"allowedToChangePassword":true,"passwordExpirationExempt":false,"phoneNumber":"(47) 99746-5892","expiredPassword":false,"activeAccessibility":false,"id":"4905b3d1-3523-4fbf-a984-852ec1a8ac2c","username":"admin","fullName":"Reginaldo d Espindola","description":"Tenant Admin","email":"reginaldo@atriohoteis.com.br","locale":"pt-BR","tenantDomain":"atriohoteis.com.br","tenantName":"atriohoteiscombr","tenantLocale":"pt-BR","blocked":false,"authenticationType":"G7","integration":{"integrationName":"admin"},"_discriminator":"completeUser"},"ttl":1769706481027}';

    // SÓ injeta se localStorage estiver vazio (prioriza extensão)
    const existingData = localStorage.getItem('SENIOR_USER_INFO');

    if (existingData) {
        console.log('🔌 SetupLogin: Dados já existem (extensão ou cache). Pulando injeção.');
        return;
    }

    // Verificação de segurança simples
    if (INFO_COPIADA && INFO_COPIADA.includes('data')) {
        try {
            console.log('🔄 SetupLogin: Injetando dados de FALLBACK (modo local/teste)...');
            localStorage.setItem('SENIOR_USER_INFO', INFO_COPIADA);
            console.log('✅ SetupLogin: Dados fallback injetados. Use extensão para dados reais.');
        } catch (e) {
            console.error('❌ SetupLogin: Erro ao injetar dados. Verifique se as aspas estão corretas.', e);
        }
    } else {
        console.log('ℹ️ SetupLogin: Aguardando você colar os dados no arquivo setup-login.js');
    }
})();
