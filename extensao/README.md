# 🔌 Extensão Atrio - Visualizador de Vagas

## 📋 O que a extensão faz?

Esta extensão conecta o **Visualizador de Vagas** (GitHub Pages) com a **plataforma Senior X**, permitindo:

✅ Capturar automaticamente o **token de autenticação**  
✅ Identificar o **usuário logado**  
✅ Habilitar **RBAC** (controle de acesso baseado em permissões)  
✅ Funcionar **sem hospedar na Senior** (usa GitHub Pages)

---

## 🚀 Como Instalar

### **Passo 1: Preparar os Arquivos**

1. Navegue até a pasta: `c:/Users/Gabriel Artoni/Projetos/Atrio/extensao/`
2. Você deve ter os seguintes arquivos:
   - ✅ `manifest.json`
   - ✅ `background.js`
   - ✅ `content.js`
   - ✅ `senior-interceptor.js`

### **Passo 2: Criar Ícones (Opcional)**

Crie 3 imagens PNG na pasta `extensao/`:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

**Ou use ícones temporários:**
- Baixe qualquer ícone de "briefcase" ou "recruitment" de sites como https://flaticon.com

### **Passo 3: Carregar no Chrome/Edge**

1. Abra o navegador (Chrome ou Edge)
2. Digite na barra de endereços:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Ative o **"Modo do desenvolvedor"** (canto superior direito)
4. Clique em **"Carregar sem compactação"** ou **"Load unpacked"**
5. Selecione a pasta: `c:/Users/Gabriel Artoni/Projetos/Atrio/extensao/`
6. A extensão será instalada!

---

## 🎯 Como Usar

### **Passo 1: Logar na Senior**

1. Abra uma aba e acesse: `https://platform.senior.com.br`
2. Faça login normalmente
3. Navegue em qualquer página da Senior (ex: Dashboard, Vagas, etc)
4. **Aguarde 5 segundos** para a extensão capturar o token

**Você verá no console (F12):**
```
✅ [Atrio Extension] Token capturado: Bearer eyJ...
✅ [Atrio Extension] Usuário capturado: 087305836087
```

### **Passo 2: Abrir o Visualizador de Vagas**

1. Abra uma **nova aba**
2. Acesse: `https://forbizgetwork.github.io/atrio/`
3. A extensão vai injetar automaticamente o contexto

**Você verá no console:**
```
🚀 [Atrio Extension] Content script ativo no Visualizador
✅ [Atrio Extension] Injetando contexto da Senior no site...
✅ [Atrio Extension] Contexto injetado com sucesso!
   Usuário: 087305836087
   Token: Bearer eyJ...
```

### **Passo 3: Verificar RBAC**

O visualizador agora vai:
- Buscar seus papéis (`getUserDetailRoles`)
- Buscar suas permissões de filiais (`getRoleFilters`)
- Mostrar **apenas** os candidatos das filiais permitidas

---

## 🔍 Troubleshooting

### ❌ "Token ou usuário não encontrado"

**Causa:** Extensão não conseguiu capturar o token  
**Solução:**
1. Recarregue uma página da Senior X (F5)
2. Aguarde 5 segundos
3. Abra o DevTools (F12) → aba Console
4. Verifique se aparece: `✅ Token capturado`

### ❌ "401 Unauthorized" nas chamadas de API

**Causa:** Token expirou (> 30 minutos)  
**Solução:**
1. Vá para uma aba da Senior X
2. Recarregue a página (F5)
3. Volte para o visualizador e recarregue

### ❌ "CORS Error"

**Causa:** Headers CORS não foram configurados  
**Solução:**
1. Verifique se a extensão está **ativada**
2. Se o problema persistir, a API da Senior pode estar bloqueando CORS
3. Nesse caso, será necessário hospedar como Custom Page

### ❌ Nenhuma vaga aparece

**Diagnóstico:**
1. Verifique o console: procure por `🚫 ACESSO NEGADO`
2. Verifique se você tem permissão para alguma filial

**Solução:**
- Confirme que seu usuário tem um papel com abrangência configurada
- Teste com um usuário SuperUser

---

## 🔄 Atualizar a Extensão

Quando você modificar os arquivos da extensão:

1. Vá para `chrome://extensions/`
2. Encontre "Atrio - Visualizador de Vagas"
3. Clique no ícone de **reload** (🔄)
4. Pronto!

---

## 📦 Distribuir para Outros Usuários

### **Opção 1: Modo Desenvolvedor (Simples)**
- Zipie a pasta `extensao/`
- Envie o ZIP para os usuários
- Eles carregam usando "Carregar sem compactação"

### **Opção 2: Chrome Web Store (Oficial)**
1. Acesse: https://chrome.google.com/webstore/devconsole
2. Crie uma conta de desenvolvedor (taxa única de $5)
3. Faça upload da extensão
4. Aguarde aprovação
5. Distribua o link oficial

---

## 🔒 Segurança

A extensão:
- ✅ **NÃO** envia dados para servidores externos
- ✅ **NÃO** armazena senhas
- ✅ Apenas captura o token de sessão (temporário)
- ✅ Tokens expiram automaticamente após 30 minutos

**Código-fonte:** Totalmente aberto e auditável

---

## 📝 Permissões Solicitadas

- `storage`: Salvar token e contexto do usuário
- `webRequest`: Interceptar requisições para capturar token
- `declarativeNetRequest`: Configurar headers CORS
- `host_permissions`: Acessar Senior e GitHub Pages

---

**Criado em:** 02/02/2026  
**Versão:** 1.0.0
