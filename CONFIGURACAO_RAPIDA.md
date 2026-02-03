# ⚡ CONFIGURAÇÃO RÁPIDA - Passo a Passo

## 📋 Você Tem as Credenciais PostgreSQL ✅

Perfeito! Vamos configurar tudo agora.

---

## 🚀 Passo 1: Instalar Dependências

```powershell
# Abrir terminal na pasta do projeto
cd "C:\Users\Gabriel Artoni\Projetos\Atrio"

# Instalar bibliotecas Python
pip install -r requirements.txt
```

**Saída esperada:**
```
Successfully installed psycopg2-binary-2.9.9 python-dotenv-1.0.0
```

---

## 🔧 Passo 2: Configurar Credenciais

O arquivo `.env` já foi criado para você! Agora só precisa preencher:

```powershell
# Abrir .env no bloco de notas
notepad .env
```

**Preencher com as credenciais que você tem:**

```bash
# ========== POSTGRESQL (Supabase) ==========
DB_HOST=seu-host-aqui.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_NAME=postgres
DB_PASSWORD=sua-senha-aqui
```

> 💡 **Dica:** Cole os valores que o Tiago te passou!

**Salvar e fechar o arquivo.**

---

## 🧪 Passo 3: Testar Conexão

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
- ❌ "DB_HOST not configured" → Verificar se salvou o `.env`
- ❌ "Connection failed" → Verificar se DB_HOST e DB_PASSWORD estão corretos
- ❌ "Table not found" → Verificar com Tiago se ETL está rodando

---

## 🎯 Passo 4: Rodar Primeira Exportação

```powershell
# Executar exportação
python export_from_supabase.py
```

**O que vai acontecer:**
```
🔌 Conectando no PostgreSQL (Supabase)...
✅ Conectado com sucesso!
📡 Buscando candidatos...
✅ X candidatos encontrados
🔄 Validando dados...
✅ X candidatos válidos
💾 Salvando em applicants.json...
✅ Arquivo salvo
🔄 Convertendo para applicants-data.js...
✅ Arquivo JS gerado
📤 Fazendo deploy no GitHub...
✅ Deploy concluído!
✨ EXPORTAÇÃO CONCLUÍDA COM SUCESSO!
```

---

## 🌐 Passo 5: Verificar GitHub Pages

```powershell
# Aguardar ~2 minutos e abrir no navegador
start https://forbizgetwork.github.io/atrio/
```

**Deve mostrar:**
- ✅ Todos os candidatos da tabela `audit_log`
- ✅ Filtrados por RBAC (se extensão estiver ativa)

---

## ⏰ Passo 6: Agendar Execução Automática (Opcional)

### Opção A: Linha de Comando

```powershell
# Criar tarefa que roda a cada 1 hora
schtasks /create /tn "Atrio - Exportação Supabase" /tr "python C:\Users\Gabriel Artoni\Projetos\Atrio\export_from_supabase.py" /sc hourly /st 08:00
```

### Opção B: Interface Gráfica

1. Pressionar `Win + R`
2. Digitar: `taskschd.msc` e Enter
3. Clicar em "Criar Tarefa Básica"
4. Nome: `Atrio - Exportação Supabase`
5. Gatilho: **Diariamente**, repetir a cada **1 hora**
6. Ação: **Iniciar um programa**
   - Programa: `python`
   - Argumentos: `export_from_supabase.py`
   - Iniciar em: `C:\Users\Gabriel Artoni\Projetos\Atrio`
7. Finalizar

---

## ✅ Checklist Final

- [ ] Dependências instaladas (`pip install -r requirements.txt`)
- [ ] Arquivo `.env` preenchido com credenciais
- [ ] Teste de conexão passou (`python test_supabase_connection.py`)
- [ ] Primeira exportação funcionou (`python export_from_supabase.py`)
- [ ] GitHub Pages atualizado (https://forbizgetwork.github.io/atrio/)
- [ ] Agendamento configurado (opcional)

---

## 🔍 Troubleshooting Rápido

### Erro: "ModuleNotFoundError: No module named 'psycopg2'"
```powershell
pip install -r requirements.txt
```

### Erro: "DB_HOST not configured"
```powershell
# Verificar se .env existe e está preenchido
notepad .env
```

### Erro: "Connection failed"
- Verificar DB_HOST (deve terminar com `.supabase.co`)
- Verificar DB_PASSWORD (copiar exatamente como está)
- Verificar se IP está liberado no Supabase (Settings → Database → Connection Pooling)

### Candidatos não aparecem
```powershell
# Verificar se tabela tem dados
python test_supabase_connection.py
```

---

## 🎉 Pronto!

Após configurar o agendamento, o sistema vai rodar sozinho:

```
08:00 - ETL roda (Tiago) → Salva no Supabase
09:00 - Script exporta → GitHub Pages atualiza
10:00 - Script exporta → GitHub Pages atualiza
11:00 - Script exporta → GitHub Pages atualiza
...
```

**Intervenção manual: ZERO!** 🚀

---

## 📞 Precisa de Ajuda?

- **Erro de conexão:** Verificar credenciais no `.env`
- **Tabela vazia:** Aguardar ETL do Tiago
- **Git error:** Verificar se há mudanças (`git status`)

**Consultar documentação completa:** `README.md`
