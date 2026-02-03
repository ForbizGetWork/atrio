// Global state
let allApplicants = [];
let groupedVacancies = new Map();
let currentSearchQuery = '';
let isExtensionMode = false;

// Detectar se estamos em ambiente suportado pela extensão (GitHub Pages ou Localhost)
const isExtensionSupported =
    window.location.hostname === 'forbizgetwork.github.io' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

/**
 * Inicializa o aplicativo
 */
async function initializeApp() {
    console.log('🚀 Inicializando aplicativo...');

    // Inicializar autenticação
    const authSuccess = await AuthService.init();

    if (authSuccess) {
        loadApplicants();
        setupSearch();
    } else {
        document.getElementById('vacanciesContainer').innerHTML =
            `<div class="no-results">
                <h3>Acesso Negado ou Erro de Autenticação</h3>
                <p>Não foi possível validar suas permissões de acesso.</p>
             </div>`;
    }
}

// Escutar evento da extensão (se estivermos em ambiente suportado)
if (isExtensionSupported) {
    console.log('🌐 Ambiente compatível com extensão detectado. Aguardando extensão...');

    // Timeout de segurança: se extensão não responder em 3 segundos, continua mesmo assim
    // Timeout de segurança aumentado para 6s
    const extensionTimeout = setTimeout(() => {
        if (!isExtensionMode) { // Keeping isExtensionMode as extensionLoaded is not defined
            console.warn('⏱️ Timeout: Extensão não respondeu em 6s. Iniciando sem dados da extensão...');
            initializeApp();
        }
    }, 6000);

    // Listener para evento da extensão
    window.addEventListener('senior-context-ready', (event) => {
        console.log('✅ Evento senior-context-ready recebido!', event.detail);
        clearTimeout(extensionTimeout);
        isExtensionMode = true;

        // Aguardar 100ms para garantir que localStorage foi atualizado
        setTimeout(() => {
            initializeApp();
        }, 100);
    });

    // Verificar se dados já existem (extensão pode ter injetado antes deste script carregar)
    window.addEventListener('DOMContentLoaded', () => {
        const hasUserInfo = localStorage.getItem('SENIOR_USER_INFO');
        const hasToken = localStorage.getItem('SENIOR_TOKEN');

        if (hasUserInfo && hasToken) {
            console.log('📦 Dados da extensão já presentes no localStorage');
            clearTimeout(extensionTimeout);
            isExtensionMode = true;
            initializeApp();
        }
    });
} else {
    // Modo local: inicializar diretamente
    console.log('💻 Modo local detectado. Inicializando diretamente...');
    document.addEventListener('DOMContentLoaded', initializeApp);
}

// Load applicants data directly from embedded constant
function loadApplicants() {
    try {
        if (typeof APPLICANTS_DATA === 'undefined') {
            throw new Error('APPLICANTS_DATA não está definido. Execute o script Python para gerar applicants-data.js');
        }
        if (!Array.isArray(APPLICANTS_DATA)) {
            throw new Error('APPLICANTS_DATA não é um array');
        }

        // Filtrar candidatos baseados nas permissões do usuário
        allApplicants = APPLICANTS_DATA.filter(applicant => AuthService.canViewApplicant(applicant));

        console.log(`📊 Total carregado: ${APPLICANTS_DATA.length}, Visíveis: ${allApplicants.length}`);

        groupApplicantsByVacancy();
        renderVacancies();
    } catch (error) {
        console.error('Erro ao carregar candidatos:', error);
        const errorMsg = error.message || 'Erro desconhecido';
        document.getElementById('vacanciesContainer').innerHTML =
            `<div class="no-results">
                <p><strong>Erro ao carregar dados dos candidatos:</strong></p>
                <p>${escapeHtml(errorMsg)}</p>
                <p style="margin-top: 15px; font-size: 0.9em; color: #666;">
                    Execute o script Python: <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">python3 convert_json.py</code>
                </p>
            </div>`;
    }
}

// Group applicants by vacancy_title
function groupApplicantsByVacancy() {
    groupedVacancies.clear();

    allApplicants.forEach(applicant => {
        const vacancyTitle = applicant.vacancy_title || 'Vaga Desconhecida';

        if (!groupedVacancies.has(vacancyTitle)) {
            groupedVacancies.set(vacancyTitle, []);
        }

        groupedVacancies.get(vacancyTitle).push(applicant);
    });
}

// Render all vacancy groups
function renderVacancies() {
    const container = document.getElementById('vacanciesContainer');
    const noResults = document.getElementById('noResults');

    if (groupedVacancies.size === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    container.innerHTML = '';

    // Sort vacancies alphabetically
    const sortedVacancies = Array.from(groupedVacancies.entries()).sort((a, b) =>
        a[0].localeCompare(b[0])
    );

    sortedVacancies.forEach(([vacancyTitle, applicants]) => {
        const vacancyGroup = createVacancyGroup(vacancyTitle, applicants);
        container.appendChild(vacancyGroup);
    });
}

// Create a vacancy group element
function createVacancyGroup(vacancyTitle, applicants) {
    const group = document.createElement('div');
    group.className = 'vacancy-group';
    group.dataset.vacancyTitle = vacancyTitle;

    // Filter applicants based on search query
    const filteredApplicants = filterApplicants(applicants);

    if (filteredApplicants.length === 0 && currentSearchQuery) {
        group.style.display = 'none';
        return group;
    }

    group.style.display = 'block';

    const header = document.createElement('div');
    header.className = 'vacancy-header';
    header.innerHTML = `
        <div class="vacancy-title">${highlightText(vacancyTitle)}</div>
        <span class="vacancy-count">${filteredApplicants.length} candidato${filteredApplicants.length !== 1 ? 's' : ''}</span>
        <span class="toggle-icon">▼</span>
    `;

    header.addEventListener('click', () => {
        group.classList.toggle('expanded');
    });

    const candidatesList = document.createElement('div');
    candidatesList.className = 'candidates-list';

    const table = document.createElement('table');
    table.className = 'candidates-table';

    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Candidato</th>
            <th>Localização</th>
            <th>Email</th>
            <th>Telefone</th>
            <th>Data de Criação</th>
        </tr>
    `;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');

    // Sort applicants by created_at (newest first)
    const sortedApplicants = [...filteredApplicants].sort((a, b) => {
        const dateA = new Date(a.body?.created_at || 0);
        const dateB = new Date(b.body?.created_at || 0);
        return dateB - dateA;
    });

    sortedApplicants.forEach(applicant => {
        const row = createCandidateRow(applicant);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    candidatesList.appendChild(table);

    group.appendChild(header);
    group.appendChild(candidatesList);

    // Auto-expand if search is active
    if (currentSearchQuery) {
        group.classList.add('expanded');
    }

    return group;
}

// Create a candidate row
function createCandidateRow(applicant) {
    const row = document.createElement('tr');

    const applicantName = applicant.applicant || 'N/D';
    const location = applicant.body?.talent?.address?.location || 'N/D';
    const email = applicant.body?.talent?.user?.email || 'N/D';
    const telephone = applicant.body?.talent?.telephone || 'N/D';
    const createdAt = formatDate(applicant.body?.created_at) || 'N/D';

    row.innerHTML = `
        <td data-label="Candidato">
            <span class="copyable" data-value="${escapeHtml(applicantName)}">${highlightText(applicantName)}</span>
        </td>
        <td data-label="Localização">
            <span class="copyable" data-value="${escapeHtml(location)}">${highlightText(location)}</span>
        </td>
        <td data-label="Email">
            <span class="copyable copyable-email" data-value="${escapeHtml(email)}">${highlightText(email)}</span>
        </td>
        <td data-label="Telefone">
            <span class="copyable" data-value="${escapeHtml(telephone)}">${highlightText(telephone)}</span>
        </td>
        <td data-label="Data de Criação">
            <span class="copyable" data-value="${escapeHtml(createdAt)}">${highlightText(createdAt)}</span>
        </td>
    `;

    // Add copy functionality to all copyable elements
    row.querySelectorAll('.copyable').forEach(element => {
        element.addEventListener('click', () => copyToClipboard(element));
    });

    return row;
}

// Copy to clipboard functionality
async function copyToClipboard(element) {
    let value = element.dataset.value;
    const isEmail = element.classList.contains('copyable-email');

    if (isEmail && value !== 'N/D') {
        value = `"${value}"`;
    }

    // Tentativa 1 — Clipboard API moderna
    try {
        await navigator.clipboard.writeText(value);
        showToast(`Copiado: ${value}`);
        markCopied(element);
        return;
    } catch (e) {
        // segue para fallback
    }

    // Tentativa 2 — execCommand
    const execOk = copyWithExecCommand(value);
    if (execOk) {
        showToast(`Copiado: ${value}`);
        markCopied(element);
        return;
    }

    // Tentativa 3 — seleção manual
    selectForManualCopy(element);
    showToast('Texto selecionado. Use Ctrl+C');
}

function markCopied(element) {
    element.classList.add('copied');
    setTimeout(() => {
        element.classList.remove('copied');
    }, 2000);
}



// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            currentSearchQuery = e.target.value.trim().toLowerCase();
            filterAndRender();
        }, 300); // Debounce for 300ms
    });
}

// Filter applicants based on search query
function filterApplicants(applicants) {
    if (!currentSearchQuery) {
        return applicants;
    }

    return applicants.filter(applicant => {
        const applicantName = (applicant.applicant || '').toLowerCase();
        const email = (applicant.body?.talent?.user?.email || '').toLowerCase();
        const location = (applicant.body?.talent?.address?.location || '').toLowerCase();
        const telephone = (applicant.body?.talent?.telephone || '').toLowerCase();
        const vacancyTitle = (applicant.vacancy_title || '').toLowerCase();

        return applicantName.includes(currentSearchQuery) ||
            email.includes(currentSearchQuery) ||
            location.includes(currentSearchQuery) ||
            telephone.includes(currentSearchQuery) ||
            vacancyTitle.includes(currentSearchQuery);
    });
}

// Filter and re-render vacancies
function filterAndRender() {
    renderVacancies();
}

// Highlight matching text in search results
function highlightText(text) {
    if (!currentSearchQuery || !text) {
        return escapeHtml(text);
    }

    const escapedText = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(currentSearchQuery)})`, 'gi');
    return escapedText.replace(regex, '<span class="highlight">$1</span>');
}

// Format date
function formatDate(dateString) {
    if (!dateString) return null;

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function copyWithExecCommand(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;

    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.left = '-1000px';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let success = false;
    try {
        success = document.execCommand('copy');
    } catch {
        success = false;
    }

    document.body.removeChild(textarea);
    return success;
}

function selectForManualCopy(element) {
    const range = document.createRange();
    range.selectNodeContents(element);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

