# 📋 Guia para o Tiago - Integração ETL

## 🎯 Objetivo

O ETL que você desenvolve precisa salvar os dados no Supabase com uma estrutura específica para que o visualizador funcione corretamente com RBAC.

---

## ⚠️ Campo Crítico: `externalId`

O sistema de RBAC (controle de acesso) depende do campo `externalId` da filial para funcionar.

**Sem este campo, os candidatos NÃO serão exibidos para ninguém (Default Deny).**

---

## 📊 Estrutura Esperada no Supabase

### Opção 1: Salvar como JSONB (Recomendado)

Criar tabela/view com estrutura:

```sql
CREATE TABLE applicants (
    id SERIAL PRIMARY KEY,
    body JSONB NOT NULL,              -- Dados completos do candidato
    applicant_name TEXT,               -- Nome do candidato (índice)
    vacancy_title TEXT,                -- Título da vaga (índice)
    senior_vacancy_id UUID,            -- ID da vaga na Senior
    recrutei_vacancy_id TEXT,          -- ID da vaga no Recrutei
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_applicants_vacancy ON applicants(vacancy_title);
CREATE INDEX idx_applicants_branch ON applicants((body->'branchOffice'->>'externalId'));
```

### Opção 2: Tabela Normalizada

Se preferir normalizar:

```sql
CREATE TABLE applicants (
    id SERIAL PRIMARY KEY,
    applicant_name TEXT NOT NULL,
    vacancy_title TEXT NOT NULL,
    senior_vacancy_id UUID,
    recrutei_vacancy_id TEXT,
    
    -- Dados da filial (CRÍTICO)
    branch_office_id UUID,
    branch_office_code INTEGER,
    branch_office_name TEXT,
    branch_office_external_id TEXT NOT NULL,  -- ⚠️ OBRIGATÓRIO
    
    -- Dados da matriz
    head_office_external_id TEXT,
    
    -- Dados do talento
    talent_id INTEGER,
    talent_name TEXT,
    talent_email TEXT,
    talent_telephone TEXT,
    talent_location TEXT,
    
    -- Metadados
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## 🔑 Campos Obrigatórios

### Mínimo para RBAC funcionar:

```json
{
  "body": {
    "branchOffice": {
      "externalId": "47123BAEA78A4AC1AA04CD424B125E48"  // ⚠️ OBRIGATÓRIO
    }
  },
  "applicant": "Nome do Candidato",
  "vacancy_title": "Título da Vaga"
}
```

### Estrutura Completa (Ideal):

```json
{
  "body": {
    "id": 12156527,
    "hired": null,
    "status": 1,
    "stars": 0,
    
    "headOffice": {
      "id": "e1e11a5f-c7a9-4f14-9410-aeef3d04a61c",
      "code": 1,
      "name": "ATRIO HOTEIS SA",
      "externalId": "B353032E36B5408EAC4632458BA81E0A",
      "tradingName": "Atrio Hoteis SA"
    },
    
    "branchOffice": {
      "id": "843060c9-5864-4cf9-9eff-e856ddead51d",
      "code": 25,
      "name": "ATRIO SA - Ibis Jundiai",
      "externalId": "47123BAEA78A4AC1AA04CD424B125E48",  // ⚠️ CRÍTICO
      "tradingName": "Ibis Jundiai"
    },
    
    "talent": {
      "id": 3913326,
      "age": 30,
      "pcd": false,
      "ssn": "364.867.918-02",
      
      "user": {
        "id": 2893506,
        "name": "Kaique Araujo Moreira",
        "email": "kaiquemoreira013@gmail.com",
        "first_name": "Kaique",
        "city": "São Paulo, SP, Brasil"
      },
      
      "address": {
        "location": "São Paulo, SP, Brasil"
      },
      
      "telephone": "13991310345"
    },
    
    "created_at": "2026-02-02 11:31:02"
  },
  
  "applicant": "Kaique Araujo Moreira",
  "vacancy_title": "Atendente Hospedagem Jr. (Cód. 2450)",
  "senior_vacancy_id": "1615c182-374d-473a-876b-3fc45f16a707",
  "recrutei_vacancy_id": "126748"
}
```

---

## 🔍 Como Obter o `externalId`?

O `externalId` vem da API da Senior. Exemplo de chamada:

### Endpoint: Listar Filiais

```http
GET https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/hcm/companystructure/entities/companyBranch
Authorization: Bearer {token}
```

**Resposta:**

```json
[
  {
    "id": "843060c9-5864-4cf9-9eff-e856ddead51d",
    "code": 25,
    "name": "ATRIO SA - Ibis Jundiai",
    "externalId": "47123BAEA78A4AC1AA04CD424B125E48",  // ⚠️ Este campo
    "tradingName": "Ibis Jundiai"
  }
]
```

### No contexto de candidatos

Quando você busca candidatos da API Senior, o `externalId` já vem junto:

```http
POST https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/hcm/vacancymanagement/queries/getApplicants
```

**Resposta inclui:**

```json
{
  "applicants": [
    {
      "branchOffice": {
        "id": "uuid",
        "externalId": "47123BAEA78A4AC1AA04CD424B125E48"  // ⚠️ Salvar este
      }
    }
  ]
}
```

---

## 🚀 Checklist de Implementação

### [ ] 1. Criar Tabela/View no Supabase

- [ ] Incluir campo `branch_office_external_id` (ou JSONB com `body.branchOffice.externalId`)
- [ ] Criar índice no `externalId` para performance
- [ ] Testar query de seleção

### [ ] 2. Atualizar ETL

- [ ] Buscar `externalId` da API Senior
- [ ] Salvar no Supabase junto com os dados do candidato
- [ ] Validar que TODOS os registros têm `externalId`

### [ ] 3. Criar View de Exportação (Opcional)

Se usar tabela normalizada, criar view que retorna no formato esperado:

```sql
CREATE VIEW vw_applicants AS
SELECT 
    jsonb_build_object(
        'id', id,
        'branchOffice', jsonb_build_object(
            'id', branch_office_id,
            'code', branch_office_code,
            'name', branch_office_name,
            'externalId', branch_office_external_id
        ),
        'talent', jsonb_build_object(
            'user', jsonb_build_object(
                'name', talent_name,
                'email', talent_email
            ),
            'telephone', talent_telephone,
            'address', jsonb_build_object(
                'location', talent_location
            )
        ),
        'created_at', created_at
    ) as body,
    applicant_name as applicant,
    vacancy_title,
    senior_vacancy_id,
    recrutei_vacancy_id
FROM applicants;
```

### [ ] 4. Testar Integração

```python
# Testar query no Supabase
from supabase import create_client

supabase = create_client(url, key)
result = supabase.table('vw_applicants').select('*').limit(1).execute()

# Verificar se tem externalId
data = result.data[0]
external_id = data['body']['branchOffice']['externalId']
print(f"✅ ExternalId encontrado: {external_id}")
```

---

## 📞 Integração com Script de Exportação

Após você salvar os dados no Supabase, o Gabriel vai rodar:

```bash
python export_from_supabase.py
```

Este script vai:
1. Conectar no Supabase
2. Buscar dados da tabela/view que você criar
3. Exportar para `applicants.json`
4. Converter para `applicants-data.js`
5. Fazer deploy no GitHub Pages

**Você só precisa garantir que os dados estão no Supabase com a estrutura correta!**

---

## ⚠️ Validações Importantes

### Antes de considerar pronto:

```python
# Validar que TODOS os registros têm externalId
query = """
SELECT COUNT(*) as total,
       COUNT(body->'branchOffice'->>'externalId') as com_external_id
FROM applicants;
"""

# Se total != com_external_id, tem problema!
```

### Logs Recomendados:

```python
# No seu ETL, adicionar logs:
if not candidate.get('branchOffice', {}).get('externalId'):
    logger.warning(f"⚠️ Candidato sem externalId: {candidate['name']}")
    # Decidir: pular ou buscar de outra fonte
```

---

## 🆘 Dúvidas?

**Perguntas Frequentes:**

### 1. "Posso usar outro nome de campo?"

Sim, mas avise o Gabriel para ajustar o `export_from_supabase.py`.

### 2. "E se a API não retornar externalId?"

Isso seria um problema crítico. Verifique:
- Se está usando o endpoint correto
- Se o token tem permissões adequadas
- Se a filial existe no sistema Senior

### 3. "Preciso salvar dados históricos?"

Sim, recomendado. Use `updated_at` para rastrear mudanças.

### 4. "Quantos candidatos em média?"

Planejar para ~1000-5000 candidatos ativos.

---

## 📋 Nome da Tabela/View

**Combinar com Gabriel:**

Atualmente o script espera: `vw_applicants`

Se usar outro nome, avisar para atualizar em:
```python
# export_from_supabase.py, linha 18
TABLE_NAME = 'seu_nome_aqui'
```

---

## ✅ Quando Estiver Pronto

1. Avisar o Gabriel
2. Passar credenciais do Supabase (URL + Service Role Key)
3. Informar nome da tabela/view
4. Fazer um teste conjunto

---

**Boa sorte! 🚀**
