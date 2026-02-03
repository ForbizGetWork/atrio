const AuthService = {
    // Configurações da API
    config: {
        baseUrl: 'https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform/authorization',
        // Mock token para desenvolvimento local APENAS
        mockToken: 'a6fPEGv8G061y88gCaBvuOyrhERcqUk8'
    },

    // Estado do usuário
    state: {
        user: null, // ID do usuário
        token: null, // Token Bearer
        tenant: null, // Domínio do tenant
        roles: [],
        allowedCompanies: new Set(),
        isMockMode: false
    },

    /**
     * Inicializa o serviço
     */
    async init() {
        try {
            console.log('🔐 AuthService: Iniciando...');

            // 1. Tentar contexto real (Senior X ou Extensão)
            this.tryLoadFromContext();

            // 2. Validação do Contexto
            if (!this.state.user) {
                console.warn('⚠️ AuthService: Nenhum usuário encontrado. Usando MOCK completo.');
                this.state.isMockMode = true;
                this.state.user = '087305836087'; // Mock para testes
                this.state.token = this.config.mockToken;
            } else {
                console.log(`✅ AuthService: Usuário detectado: ${this.state.user}`);

                // Se temos usuário mas não temos token, usar fallback
                if (!this.state.token) {
                    console.warn('⚠️ AuthService: Token não encontrado. Usando token de fallback para chamadas API.');
                    this.state.token = this.config.mockToken;
                    this.state.isMockMode = true; // Marca como mock pois não é um token real
                }
            }

            // 3. Buscar roles (se não estiver em modo mock completo)
            await this.fetchUserRoles();

            // 4. Buscar filtros de abrangência (filiais permitidas)
            const filters = await this.fetchRoleFilters();

            // 5. Configurar permissões baseadas nos filtros
            await this.setupPermissions(filters);

            return true;
        } catch (error) {
            console.error('🔐 AuthService Error:', error);
            return false;
        }
    },

    /**
     * Tenta ler informações do localStorage da Senior
     */
    tryLoadFromContext() {
        console.log('🔍 AuthService: Verificando localStorage...');

        try {
            // 1. Verificar SENIOR_USER_INFO
            const rawInfo = localStorage.getItem('SENIOR_USER_INFO');
            console.log('📦 SENIOR_USER_INFO presente:', !!rawInfo);

            if (rawInfo) {
                const info = JSON.parse(rawInfo);
                const data = info.data || {};

                // Tenta extrair o usuario (pode variar a estrutura)
                this.state.user = data.username || data.subject || null;
                this.state.tenant = data.tenantDomain || null;

                console.log('👤 Usuário extraído:', this.state.user);
                console.log('🏢 Tenant extraído:', this.state.tenant);
                console.log('📄 User Info completo:', data);
            } else {
                console.warn('⚠️ SENIOR_USER_INFO não encontrado no localStorage!');
            }

            // 2. Verificar SENIOR_TOKEN (injetado pela extensão)
            const seniorToken = localStorage.getItem('SENIOR_TOKEN');
            console.log('🔑 SENIOR_TOKEN presente:', !!seniorToken);

            if (seniorToken) {
                this.state.token = seniorToken; // Já vem com 'Bearer '
                console.log('✅ Token capturado:', seniorToken.substring(0, 30) + '...');
            } else {
                console.warn('⚠️ SENIOR_TOKEN não encontrado no localStorage!');
            }

            // 3. Resumo do estado atual
            console.log('📊 Estado após leitura do localStorage:', {
                user: this.state.user,
                tenant: this.state.tenant,
                hasToken: !!this.state.token
            });

        } catch (e) {
            console.error('❌ AuthService: Erro ao ler localStorage:', e);
        }
    },

    /**
     * Define as permissões baseadas nos filtros de abrangência
     * @param {Array} filters - Filtros retornados pela API getRoleFilters
     */
    async setupPermissions(filters) {
        // Modo Mock (fallback para desenvolvimento local)
        if (this.state.isMockMode) {
            console.log('🚧 AuthService: Usando permissões MOCK (Ambiente Local)');
            // IDs de teste (externalIds)
            this.state.allowedCompanies.add('B353032E36B5408EAC4632458BA81E0A'); // Matriz
            this.state.allowedCompanies.add('C964EDC57CA24457AF6E4FB72C820EB0'); // Filial teste
            this.state.allowedCompanies.add('366D2C34EDCC4B75ACF0230F60D7074B'); // Ibis Curitiba Aero (Evander)
            this.state.isSuperUser = true; // Mock sempre é superuser
            return;
        }

        // Processar filtros reais da API
        if (!filters || filters.length === 0) {
            console.warn('⚠️ AuthService: Nenhum filtro de abrangência encontrado. Acesso negado por padrão.');
            this.state.isSuperUser = false;
            return;
        }

        console.log('🔍 AuthService: Processando filtros de abrangência...');

        // Extrair todos os companyBranchId dos filtros
        filters.forEach(filterGroup => {
            if (filterGroup.filters && Array.isArray(filterGroup.filters)) {
                filterGroup.filters.forEach(filter => {
                    // Procurar por companyBranchId ou companyId
                    if (filter.name === 'companyBranchId' && filter.value) {
                        this.state.allowedCompanies.add(filter.value);
                        console.log(`  ✅ Filial permitida: ${filter.value}`);
                    }
                    if (filter.name === 'companyId' && filter.value) {
                        this.state.allowedCompanies.add(filter.value);
                        console.log(`  ✅ Matriz permitida: ${filter.value}`);
                    }
                });
            }
        });

        // Verificar se é superuser (se não tem filtros de restrição, tem acesso total)
        this.state.isSuperUser = this.state.allowedCompanies.size === 0;

        if (this.state.isSuperUser) {
            console.log('👑 AuthService: Usuário é SUPERUSER (sem restrições de filial)');
        } else {
            console.log(`🔐 AuthService: ${this.state.allowedCompanies.size} filial(is) permitida(s)`);
        }
    },

    /**
     * Busca as roles do usuário usando a API da Senior
     */
    async fetchUserRoles() {
        const url = `${this.config.baseUrl}/queries/getUserDetailRoles`;

        try {
            console.log(`📡 AuthService: Buscando roles em ${url}...`);
            console.log(`👤 Usuário para consulta: ${this.state.user}`);
            console.log(`🔑 Token sendo usado: ${this.state.token?.substring(0, 30)}...`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.state.token
                },
                body: JSON.stringify({
                    user: this.state.user
                })
            });

            console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                console.warn(`⚠️ AuthService: Erro ao buscar roles (${response.status}). Usando fallback.`);

                // Tentar ler corpo da resposta para mais detalhes
                try {
                    const errorBody = await response.text();
                    console.warn('📄 Corpo da resposta de erro:', errorBody);
                } catch (e) {
                    console.warn('❌ Não foi possível ler corpo do erro');
                }

                // Fallback para ambiente local/desenvolvimento
                this.state.roles = [];
                this.state.isMockMode = true;
                return;
            }

            const data = await response.json();
            this.state.roles = data.roles || [];

            console.log(`✅ AuthService: ${this.state.roles.length} roles carregadas:`,
                this.state.roles.map(r => r.name).join(', '));
        } catch (error) {
            console.warn('⚠️ AuthService: Falha ao buscar roles (CORS ou rede). Usando fallback.', error);
            this.state.roles = [];
            this.state.isMockMode = true;
        }
    },

    /**
     * Busca os filtros de abrangência (filiais permitidas) para os papéis do usuário
     */
    async fetchRoleFilters() {
        if (this.state.roles.length === 0) {
            console.log('📋 AuthService: Sem roles para buscar filtros.');
            return [];
        }

        const url = `${this.config.baseUrl}/queries/getRoleFilters`;
        const roleNames = this.state.roles.map(r => r.name);

        try {
            console.log(`📡 AuthService: Buscando filtros de abrangência para ${roleNames.length} papel(is)...`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.state.token
                },
                body: JSON.stringify({
                    roles: roleNames,
                    domainName: 'hcm',
                    serviceName: 'vacancymanagement'
                })
            });

            if (!response.ok) {
                console.warn(`⚠️ AuthService: Erro ao buscar filtros (${response.status})`);
                return [];
            }

            const data = await response.json();
            return data.filters || [];
        } catch (error) {
            console.warn('⚠️ AuthService: Falha ao buscar filtros de abrangência', error);
            return [];
        }
    },

    /**
     * Verifica se o usuário tem permissão para visualizar um candidato
     * @param {Object} applicant Objeto do candidato
     * @returns {boolean}
     */
    canViewApplicant(applicant) {
        // Se for superuser, vê tudo
        if (this.state.isSuperUser) return true;

        /* 
           LÓGICA DE SEGURANÇA ATIVA - RBAC COMPLETO
           Compara o externalId da filial do candidato com as permissões do usuário
        */

        // Busca o externalId da filial (UUID que vem da API Senior)

        // DEBUG: Verificar estrutura exata
        if (!window._debugKeysLogged) {
            console.log('🔍 DEBUG Applicant Structure:', applicant);
            console.log('🔍 DEBUG Applicant Keys:', Object.keys(applicant));
            console.log('🔍 DEBUG branch_office:', applicant.branch_office);
            window._debugKeysLogged = true;
        }

        // Suporte para múltiplos formatos (snake_case na raiz ou camelCase no body)
        const branchObj = applicant.branch_office || applicant.branchOffice || applicant.body?.branchOffice;
        const headObj = applicant.head_office || applicant.headOffice || applicant.body?.headOffice;

        const branchExternalId = branchObj?.externalId;
        const headExternalId = headObj?.externalId;

        const companyExternalId = branchExternalId || headExternalId;

        // Se não tiver externalId de filial, bloqueia por segurança (Default Deny)
        if (!companyExternalId) {
            // Log apenas uma vez para não spam
            if (!window._loggedMissingId) {
                const candidateName = applicant.body?.talent?.user?.name || applicant.applicant || 'Desconhecido';
                console.warn('⚠️ BLOQUEADO: Candidato sem externalId de filial no JSON:', {
                    candidato: candidateName,
                    estrutura: applicant.body
                });
                window._loggedMissingId = true;
            }
            return false;
        }

        // Verifica se o usuário tem permissão para esta filial
        const temPermissao = this.state.allowedCompanies.has(companyExternalId);

        // Log de debug (apenas primeira negação de acesso)
        if (!temPermissao && !window._loggedAccessDenied) {
            const branchName = applicant.body?.branchOffice?.name || 'Desconhecida';
            console.warn(`🚫 ACESSO NEGADO: Usuário não tem permissão para a filial "${branchName}" (${companyExternalId})`);
            window._loggedAccessDenied = true;
        }

        return temPermissao;
    }
};

// Exporta para uso global
window.AuthService = AuthService;
