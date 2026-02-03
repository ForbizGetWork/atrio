# 🚀 GUIA RÁPIDO - Configuração e Uso

## ✅ Pré-requisitos

- [x] Python 3.8+ instalado
- [x] Git configurado
- [x] Tiago já implementou ETL (tabela `audit_log`)
- [ ] Credenciais do Supabase

---

## 📋 Passo a Passo

### 1️⃣ Instalar Dependências

```powershell
# No terminal, na pasta do projeto:
cd "C:\Users\Gabriel Artoni\Projetos\Atrio"

# Instalar bibliotecas Python
pip install -r requirements.txt
```

**Saída esperada:**
```
Successfully installed supabase-2.3.0 python-dotenv-1.0.0 ...
```

---

### 2️⃣ Configurar Credenciais

```powershell
# Copiar template
copy .env.example .env

# Editar .env com suas credenciais
notepad .env
```

**Preencher no .env:**
```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-service-role-aqui
```

> ⚠️ **Importante:** Use a **Service Role Key**, não a anon key!
> 
> Onde encontrar:
> 1. Abrir projeto no Supabase
> 2. Settings → API
> 3. Copiar "service_role" (secret)

---

### 3️⃣ Testar Conexão

```powershell
# Rodar script de teste
python test_supabase_connection.py
```

**Resultado esperado:**
```
✅ TESTE CONCLUÍDO COM SUCESSO!
📊 Total de candidatos na tabela: X
```

**Se der erro:**
- Verificar URL e KEY no `.env`
- Verificar se tabela `audit_log` existe
- Verificar se coluna `details` tem dados

---

### 4️⃣ Rodar Exportação Manual

```powershell
# Primeira execução (teste)
python export_from_supabase.py
```

**O que vai acontecer:**
1. ✅ Conecta no Supabase
2. ✅ Busca dados da tabela `audit_log`
3. ✅ Valida campos (especialmente `externalId`)
4. ✅ Salva em `applicants.json`
5. ✅ Converte para `applicants-data.js`
6. ✅ Faz commit e push para GitHub
7. ✅ GitHub Pages atualiza (~2 min)

**Saída esperada:**
```
✨ EXPORTAÇÃO CONCLUÍDA COM SUCESSO!
📊 Total: X candidatos
🌐 URL: https://forbizgetwork.github.io/atrio/
```

---

### 5️⃣ Verificar no GitHub Pages

```powershell
# Aguardar ~2 minutos e acessar:
start https://forbizgetwork.github.io/atrio/
```

**Deve mostrar:**
- Todos os candidatos da tabela `audit_log`
- Filtrados por RBAC (se extensão estiver ativa)

---

### 6️⃣ Agendar Execução Automática (Opcional)

#### Opção A: Task Scheduler (Windows)

```powershell
# Criar tarefa que roda a cada 1 hora
schtasks /create /tn "Atrio - Exportação Supabase" /tr "python C:\Users\Gabriel Artoni\Projetos\Atrio\export_from_supabase.py" /sc hourly /st 08:00
```

#### Opção B: Interface Gráfica

1. Abrir "Agendador de Tarefas" (Task Scheduler)
2. Criar Tarefa Básica
3. Nome: `Atrio - Exportação Supabase`
4. Gatilho: Diariamente, repetir a cada 1 hora
5. Ação: Iniciar programa
   - **Programa:** `python`
   - **Argumentos:** `export_from_supabase.py`
   - **Iniciar em:** `C:\Users\Gabriel Artoni\Projetos\Atrio`

---

## 🔍 Troubleshooting

### Erro: "ModuleNotFoundError: No module named 'supabase'"

```powershell
pip install -r requirements.txt
```

### Erro: "SUPABASE_URL not configured"

```powershell
# Verificar se .env existe
dir .env

# Se não existir, criar:
copy .env.example .env
notepad .env
```

### Erro: "Table 'audit_log' does not exist"

- Verificar com Tiago se ETL está rodando
- Verificar nome da tabela no Supabase

### Erro: "No data found in 'details' column"

- Aguardar ETL popular a tabela
- Verificar se coluna `details` está preenchida

### Candidatos não aparecem no site

1. Verificar se `externalId` está presente nos dados
2. Rodar teste: `python test_supabase_connection.py`
3. Verificar console do navegador (F12)

---

## 📊 Monitoramento

### Ver últimos candidatos exportados

```powershell
# Ver applicants.json
notepad applicants.json
```

### Ver logs do Git

```powershell
git log --oneline -5
```

### Forçar nova exportação

```powershell
python export_from_supabase.py
```

---

## 🎯 Fluxo Diário (Automático)

Após configurar o agendamento:

```
08:00 - ETL roda (Tiago)
08:30 - Dados no Supabase atualizados
09:00 - Script exporta para GitHub ← AUTOMÁTICO
09:02 - GitHub Pages atualizado
10:00 - Script exporta novamente ← AUTOMÁTICO
11:00 - Script exporta novamente ← AUTOMÁTICO
...
```

**Intervenção manual: ZERO!** 🎉

---

## 📞 Suporte

**Erros comuns:**
- Credenciais erradas → Verificar `.env`
- Tabela vazia → Aguardar ETL do Tiago
- Git error → Verificar se há mudanças (`git status`)

**Dúvidas:**
- Consultar `README.md` (documentação completa)
- Consultar `RESUMO_PRODUCAO.md` (fluxo visual)

---

## ✅ Checklist Final

- [ ] Dependências instaladas (`pip install -r requirements.txt`)
- [ ] Arquivo `.env` configurado com credenciais
- [ ] Teste de conexão passou (`python test_supabase_connection.py`)
- [ ] Primeira exportação manual funcionou (`python export_from_supabase.py`)
- [ ] GitHub Pages atualizado (https://forbizgetwork.github.io/atrio/)
- [ ] Agendamento configurado (Task Scheduler)

**Tudo OK? Sistema em produção! 🚀**
