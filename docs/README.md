# 🎯 Visualizador de Vagas - Atrio

Sistema de visualização de candidatos com controle de acesso baseado em funções (RBAC) integrado com a plataforma Senior X.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Fluxo de Dados](#fluxo-de-dados)
- [Instalação](#instalação)
- [Uso em Produção](#uso-em-produção)
- [Desenvolvimento](#desenvolvimento)

---

## 🎨 Visão Geral

Este projeto consiste em:

1. **Visualizador Web** (GitHub Pages) - Interface para visualizar candidatos
2. **Extensão Chrome** - Ponte entre Senior X e o visualizador
3. **Script de Exportação** - Automação Supabase → GitHub Pages
4. **RBAC** - Controle de acesso baseado em filiais

### Tecnologias

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Python (ETL + Exportação)
- **Banco**: Supabase (PostgreSQL)
- **Deploy**: GitHub Pages
- **Autenticação**: Senior X Platform APIs

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO DE DADOS                      │
└─────────────────────────────────────────────────────────────────┘

1. ETL (Tiago) - Python
   ↓
   • Extrai dados da API Senior (candidatos + vagas)
   • Inclui externalIds das filiais (para RBAC)
   • Salva no Supabase
   
2. Script de Exportação (export_from_supabase.py)
   ↓
   • Conecta no Supabase
   • Exporta para applicants.json
   • Converte para applicants-data.js
   • Faz commit e push para GitHub
   
3. GitHub Pages (Automático)
   ↓
   • Detecta novo commit
   • Publica arquivos atualizados
   
4. Usuário Final
   ↓
   • Acessa https://forbizgetwork.github.io/atrio/
   • Extensão injeta token + contexto da Senior
   • RBAC filtra candidatos baseado em permissões
   • Visualiza apenas candidatos permitidos
```

---

## 🔄 Fluxo de Dados

### 1. ETL → Supabase (Responsável: Tiago)

O ETL deve salvar os dados com a seguinte estrutura:

```json
{
  "body": {
    "id": 12156527,
    "branchOffice": {
      "id": "uuid",
      "code": 25,
      "name": "ATRIO SA - Ibis Jundiai",
      "externalId": "47123BAEA78A4AC1AA04CD424B125E48"  // ⚠️ CRÍTICO para RBAC
    },
    "headOffice": {
      "externalId": "B353032E36B5408EAC4632458BA81E0A"
    },
    "talent": {
      "user": {
        "name": "Kaique Araujo Moreira",
        "email": "kaique@example.com"
      }
    }
  },
  "applicant": "Kaique Araujo Moreira",
  "vacancy_title": "Atendente Hospedagem Jr.",
  "senior_vacancy_id": "uuid",
  "recrutei_vacancy_id": "126748"
}
```

**Campo Crítico**: `branchOffice.externalId` - Usado pelo RBAC para filtrar acesso

### 2. Exportação Automática

```bash
# Rodar manualmente
python export_from_supabase.py

# Ou agendar (Windows Task Scheduler)
# Executar a cada 1 hora, por exemplo
```

### 3. RBAC - Como Funciona

```javascript
// 1. Extensão captura token e usuário da Senior X
localStorage.setItem('SENIOR_TOKEN', 'Bearer abc123...');
localStorage.setItem('SENIOR_USER_INFO', '{username: "forbiz"}');

// 2. AuthService busca roles do usuário
POST /platform/authorization/queries/getUserDetailRoles
→ Retorna: ["Gestor RH", "Analista"]

// 3. AuthService busca filtros de abrangência
POST /platform/authorization/queries/getRoleFilters
→ Retorna: [
  { name: "companyBranchId", value: "47123BAEA78A4AC1AA04CD424B125E48" }
]

// 4. Filtragem de candidatos
candidatos.filter(c => {
  const externalId = c.body.branchOffice.externalId;
  return allowedCompanies.has(externalId);
});
```

---

## 🚀 Instalação

### Pré-requisitos

- Python 3.8+
- Git
- Conta no GitHub
- Acesso ao Supabase

### 1. Clonar Repositório

```bash
git clone https://github.com/ForbizGetWork/atrio.git
cd atrio
```

### 2. Instalar Dependências Python

```bash
pip install -r requirements.txt
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar template
cp .env.example .env

# Editar .env com suas credenciais
# SUPABASE_URL=https://seu-projeto.supabase.co
# SUPABASE_KEY=sua-chave-aqui
```

### 4. Instalar Extensão Chrome

1. Abrir Chrome/Edge
2. Ir para `chrome://extensions/`
3. Ativar "Modo do desenvolvedor"
4. Clicar "Carregar sem compactação"
5. Selecionar pasta `extensao/`

Ver guia completo: [`extensao/README.md`](extensao/README.md)

---

## 🎯 Uso em Produção

### Fluxo Diário

1. **ETL roda automaticamente** (agendado pelo Tiago)
   - Atualiza dados no Supabase

2. **Script de exportação roda** (agendar no Task Scheduler)
   ```bash
   python export_from_supabase.py
   ```
   - Exporta do Supabase
   - Faz deploy no GitHub Pages

3. **Usuários acessam o visualizador**
   - https://forbizgetwork.github.io/atrio/
   - Extensão injeta contexto automaticamente
   - RBAC filtra candidatos

### Agendar Exportação (Windows)

```powershell
# Criar tarefa agendada para rodar a cada 1 hora
schtasks /create /tn "Atrio Export" /tr "python C:\Users\Gabriel Artoni\Projetos\Atrio\export_from_supabase.py" /sc hourly /st 08:00
```

### Agendar Exportação (Linux/Mac)

```bash
# Adicionar ao crontab (rodar a cada hora)
0 * * * * cd /path/to/atrio && python3 export_from_supabase.py >> logs/export.log 2>&1
```

---

## 🛠️ Desenvolvimento

### Estrutura de Arquivos

```
atrio/
├── index.html              # Página principal
├── script.js               # Lógica do visualizador
├── auth-service.js         # RBAC e autenticação
├── styles.css              # Estilos
├── applicants.json         # Dados fonte (gerado pelo script)
├── applicants-data.js      # Dados compilados (usado pelo site)
├── convert_json.py         # Conversor JSON → JS
├── export_from_supabase.py # Exportação automática
├── requirements.txt        # Dependências Python
├── .env.example            # Template de variáveis
├── extensao/               # Extensão Chrome
│   ├── manifest.json
│   ├── background.js
│   ├── token-capturer.js
│   ├── token-listener.js
│   └── visualizador-inject.js
└── docs/                   # Documentação
    ├── RBAC_IMPLEMENTACAO.md
    ├── PROXIMOS_PASSOS.md
    └── TESTE_FINAL_RBAC.md
```

### Testar Localmente

```bash
# 1. Iniciar servidor local
python -m http.server 8000

# 2. Abrir navegador
# http://localhost:8000

# 3. Verificar console (F12)
# Deve mostrar logs da extensão e RBAC
```

### Atualizar Dados Manualmente

```bash
# 1. Editar applicants.json
# 2. Converter para JS
python convert_json.py

# 3. Testar localmente
python -m http.server 8000

# 4. Fazer deploy
git add applicants.json applicants-data.js
git commit -m "chore: Atualizar dados"
git push origin main
```

---

## 📚 Documentação Adicional

- **[RBAC_IMPLEMENTACAO.md](RBAC_IMPLEMENTACAO.md)** - Detalhes técnicos do RBAC
- **[PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md)** - Checklist de implantação
- **[extensao/README.md](extensao/README.md)** - Guia da extensão Chrome
- **[TESTE_FINAL_RBAC.md](TESTE_FINAL_RBAC.md)** - Testes realizados

---

## 🔐 Segurança

### Princípios

1. **Default Deny**: Sem `externalId` = Acesso negado
2. **Token Real**: Capturado da Senior X (não hardcoded)
3. **RBAC Server-Side**: Filtros vêm da API da Senior
4. **Sem Dados Sensíveis**: Tokens não são commitados

### Variáveis Sensíveis

**NUNCA commitar:**
- `.env` (credenciais do Supabase)
- Tokens de acesso
- Senhas

**Já está no .gitignore:**
```
.env
*.log
```

---

## 🐛 Troubleshooting

### Extensão não injeta contexto

1. Verificar se está logado na Senior X
2. Recarregar extensão (`chrome://extensions/`)
3. Dar F5 na aba da Senior X
4. Verificar console: `[Atrio Extension] ✅ Token capturado`

### Candidatos não aparecem

1. Verificar console: `📊 Total carregado: X, Visíveis: Y`
2. Se `Visíveis: 0`, verificar `externalId` dos candidatos
3. Verificar se usuário tem permissão para a filial

### Erro 401 na API

1. Token expirado → Recarregar aba da Senior X
2. Usuário sem permissão → Verificar roles no Senior

### GitHub Pages não atualiza

1. Verificar Actions: https://github.com/ForbizGetWork/atrio/actions
2. Limpar cache do navegador (Ctrl+Shift+R)
3. Aguardar 2-5 minutos após o push

---

## 👥 Equipe

- **Gabriel Artoni** - Desenvolvimento Frontend + Extensão
- **Tiago** - ETL e integração Supabase
- **Forbiz** - Cliente

---

## 📄 Licença

Uso interno - Atrio Hotéis SA

---

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verificar documentação em `/docs/`
2. Consultar logs do console (F12)
3. Contatar equipe de desenvolvimento
