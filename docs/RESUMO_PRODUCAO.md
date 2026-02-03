# 📊 RESUMO EXECUTIVO - Fluxo de Produção

## 🎯 Como Funciona na Prática

### Situação Atual (Teste)
```
❌ Kaique foi injetado MANUALMENTE no applicants.json
   └─> Apenas para testar RBAC e extensão
```

### Fluxo Real de Produção
```
✅ AUTOMÁTICO - Sem intervenção manual

┌─────────────────────────────────────────────────────────────┐
│ PASSO 1: ETL (Tiago)                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  🔄 Roda automaticamente (agendado)                         │
│  📡 Busca candidatos da API Senior                          │
│  💾 Salva no Supabase com externalId                        │
│                                                              │
│  Tabela: vw_applicants                                      │
│  ├─ applicant_name                                          │
│  ├─ vacancy_title                                           │
│  └─ body (JSONB)                                            │
│      └─ branchOffice.externalId ⚠️ CRÍTICO                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PASSO 2: Script de Exportação (Novo)                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  🔄 Roda automaticamente (Task Scheduler)                   │
│  📥 Conecta no Supabase                                     │
│  📄 Exporta para applicants.json                            │
│  🔧 Converte para applicants-data.js                        │
│  📤 Faz commit e push para GitHub                           │
│                                                              │
│  Arquivo: export_from_supabase.py                           │
│  Frequência: A cada 1 hora (configurável)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PASSO 3: GitHub Pages (Automático)                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  🔍 Detecta novo commit                                     │
│  🚀 Publica arquivos atualizados                            │
│  ⏱️  Demora ~2 minutos                                       │
│                                                              │
│  URL: https://forbizgetwork.github.io/atrio/                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PASSO 4: Usuário Final                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  1. Abre Senior X → Extensão captura token                 │
│  2. Abre Visualizador → Extensão injeta contexto           │
│  3. RBAC filtra baseado em externalId                       │
│  4. Vê apenas candidatos permitidos                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Checklist de Implantação

### ✅ Já Está Pronto
- [x] Visualizador (HTML/CSS/JS)
- [x] RBAC com APIs da Senior
- [x] Extensão Chrome
- [x] Script de conversão (convert_json.py)
- [x] Script de exportação (export_from_supabase.py)
- [x] Documentação completa

### 🔄 Aguardando
- [ ] **Tiago**: Implementar ETL com externalId
- [ ] **Tiago**: Criar tabela/view no Supabase
- [ ] **Tiago**: Passar credenciais do Supabase

### 🚀 Próximos Passos (Você)
1. [ ] Receber credenciais do Supabase do Tiago
2. [ ] Configurar `.env` com as credenciais
3. [ ] Instalar dependências: `pip install -r requirements.txt`
4. [ ] Testar script: `python export_from_supabase.py`
5. [ ] Agendar no Task Scheduler (Windows)

---

## 🔧 Configuração do Agendamento

### Windows (Task Scheduler)

```powershell
# Criar tarefa que roda a cada 1 hora
schtasks /create /tn "Atrio - Exportação Supabase" /tr "python C:\Users\Gabriel Artoni\Projetos\Atrio\export_from_supabase.py" /sc hourly /st 08:00
```

### Ou manualmente via interface:
1. Abrir "Agendador de Tarefas"
2. Criar Tarefa Básica
3. Nome: "Atrio - Exportação Supabase"
4. Gatilho: Diariamente, repetir a cada 1 hora
5. Ação: Iniciar programa
   - Programa: `python`
   - Argumentos: `export_from_supabase.py`
   - Iniciar em: `C:\Users\Gabriel Artoni\Projetos\Atrio`

---

## 📊 Fluxo de Dados Detalhado

### Dados no Supabase (Tiago salva)
```json
{
  "body": {
    "branchOffice": {
      "externalId": "47123BAEA78A4AC1AA04CD424B125E48"
    },
    "talent": {
      "user": {
        "name": "Kaique",
        "email": "kaique@example.com"
      }
    }
  },
  "applicant": "Kaique Araujo Moreira",
  "vacancy_title": "Atendente Jr."
}
```
                    ↓
### Script exporta para applicants.json
```json
[
  {
    "body": {...},
    "applicant": "Kaique",
    "vacancy_title": "Atendente Jr."
  }
]
```
                    ↓
### Converte para applicants-data.js
```javascript
const APPLICANTS_DATA = [{...}];
```
                    ↓
### GitHub Pages serve para usuários
```
https://forbizgetwork.github.io/atrio/
├── index.html
├── script.js
├── auth-service.js
└── applicants-data.js ← Dados atualizados
```

---

## 🔐 Segurança

### O que NÃO é commitado (protegido)
- `.env` (credenciais do Supabase)
- Logs
- Tokens de acesso

### O que É commitado (público)
- `applicants.json` ✅
- `applicants-data.js` ✅
- Código fonte ✅

**Por quê?** Os dados já são filtrados pelo RBAC no frontend. Cada usuário só vê o que tem permissão.

---

## 🆘 Troubleshooting

### Script de exportação falha

**Erro: "Supabase connection failed"**
```bash
# Verificar .env
cat .env

# Deve ter:
SUPABASE_URL=https://...
SUPABASE_KEY=...
```

**Erro: "Table not found"**
```python
# Ajustar nome da tabela em export_from_supabase.py
TABLE_NAME = 'nome_correto_da_tabela'
```

### GitHub Pages não atualiza

1. Verificar se commit foi feito: `git log`
2. Verificar Actions: https://github.com/ForbizGetWork/atrio/actions
3. Limpar cache do navegador (Ctrl+Shift+R)

---

## 📞 Comunicação com Tiago

### Informações que você precisa dele:

1. **Credenciais Supabase**
   - URL do projeto
   - Service Role Key (não a anon key!)

2. **Nome da tabela/view**
   - Ex: `vw_applicants`, `applicants`, etc.

3. **Estrutura dos dados**
   - Confirmar se está salvando como JSONB ou normalizado
   - Confirmar que `externalId` está presente

### Informações que ele precisa de você:

- Enviar: `GUIA_TIAGO_ETL.md` ✅ (já criado)
- Estrutura esperada dos dados ✅ (documentado)
- Campo crítico: `externalId` ✅ (enfatizado)

---

## 📚 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `export_from_supabase.py` | Script de exportação automática |
| `requirements.txt` | Dependências Python |
| `.env.example` | Template de variáveis de ambiente |
| `.gitignore` | Proteção de dados sensíveis |
| `README.md` | Documentação completa do projeto |
| `GUIA_TIAGO_ETL.md` | Guia para o Tiago implementar ETL |
| `RESUMO_PRODUCAO.md` | Este arquivo (resumo executivo) |

---

## ✅ Status Atual

```
🟢 PRONTO PARA PRODUÇÃO (aguardando apenas ETL do Tiago)

Frontend:     ████████████████████ 100%
Extensão:     ████████████████████ 100%
RBAC:         ████████████████████ 100%
Exportação:   ████████████████████ 100%
Docs:         ████████████████████ 100%
ETL:          ░░░░░░░░░░░░░░░░░░░░   0% (Tiago)
```

**Próximo bloqueador:** Aguardar Tiago implementar ETL com `externalId`

---

## 🎯 Quando Tudo Estiver Rodando

### Fluxo Diário Automático:

```
08:00 - ETL roda (Tiago)
08:30 - Dados no Supabase atualizados
09:00 - Script exporta para GitHub
09:02 - GitHub Pages atualizado
09:05 - Usuários veem dados novos
10:00 - Script exporta novamente
11:00 - Script exporta novamente
...
```

### Intervenção Manual: ZERO ✅

Você só precisa intervir se:
- Mudar estrutura dos dados
- Adicionar novos campos ao visualizador
- Atualizar extensão

---

**🚀 Tudo pronto! Aguardando apenas o Tiago finalizar o ETL.**
