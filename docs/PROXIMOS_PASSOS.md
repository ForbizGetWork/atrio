# 🎯 PRÓXIMOS PASSOS - Extensão + GitHub Pages

## ✅ O que já está pronto:

1. ✅ Código do Visualizador (GitHub Pages)
2. ✅ RBAC completo com APIs da Senior
3. ✅ Extensão criada (`/extensao/`)
4. ✅ Ícone da extensão gerado

---

## 📋 Checklist de Implantação:

### **1. Copiar o ícone para a pasta da extensão**

Você recebeu a imagem `icon_extension_128.png`. Precisa:

```powershell
# No terminal:
cd "c:/Users/Gabriel Artoni/Projetos/Atrio/extensao"

# Copiar o ícone gerado (está nos artifacts) para:
# icon128.png, icon48.png, icon16.png
# (pode usar o mesmo arquivo para todos os tamanhos)
```

Ou manualmente:
1. Salvar a imagem que apareceu como `icon128.png`
2. Redimensionar para 48x48 → salvar como `icon48.png`
3. Redimensionar para 16x16 → salvar como `icon16.png`
4. Colocar na pasta `extensao/`

---

### **2. Testar a extensão localmente**

1. Abrir Chrome/Edge
2. Ir para `chrome://extensions/`
3. Ativar "Modo do desenvolvedor"
4. Clicar "Carregar sem compactação"
5. Selecionar pasta: `c:/Users/Gabriel Artoni/Projetos/Atrio/extensao/`

---

### **3. Testar o fluxo completo**

**Teste 1: Captura de Token**
1. Abrir `https://platform.senior.com.br`
2. Fazer login
3. Abrir DevTools (F12) → Console
4. Procurar: `✅ [Atrio Extension] Token capturado`

**Teste 2: Injeção no GitHub Pages**
1. Abrir nova aba: `https://forbizgetwork.github.io/atrio/`
2. DevTools → Console
3. Procurar: `✅ [Atrio Extension] Contexto injetado`

**Teste 3: RBAC Funcionando**
1. No visualizador, verificar se candidatos aparecem
2. Console deve mostrar:
   ```
   ✅ AuthService: 1 roles carregadas
   ✅ Filial permitida: C964...
   ```

---

### **4. Aguardar JSON do Tiago**

Quando o Tiago entregar o `applicants.json` com `externalIds`:

1. Substituir o arquivo local
2. Rodar: `py convert_json.py`
3. Fazer commit e push:
   ```bash
   git add applicants-data.js
   git commit -m "feat: Atualizar dados com externalIds"
   git push origin main
   ```
4. Aguardar deploy do GitHub Pages (~2 min)
5. Recarregar a página

---

### **5. Distribuir para a equipe**

**Opção A: Modo Desenvolvedor (Rápido)**
1. Zipar a pasta `extensao/`
2. Enviar para os usuários
3. Instruir a instalação conforme `extensao/README.md`

**Opção B: Chrome Web Store (Oficial)**
1. Pagar taxa de $5 (uma vez)
2. Enviar para revisão
3. Aguardar aprovação (1-3 dias)
4. Distribuir link oficial

---

## 🔧 Se der problema de CORS

Algumas empresas bloqueiam CORS mesmo com extensão. Nesse caso:

**Solução:** Hospedar como Custom Page na Senior (guia já criado: `GUIA_HOSPEDAGEM_SENIOR.md`)

---

## 📚 Documentação

- `extensao/README.md` → Guia completo da extensão
- `RBAC_IMPLEMENTACAO.md` → Documentação técnica do RBAC
- `GUIA_HOSPEDAGEM_SENIOR.md` → Alternativa (Custom Page)

---

**Status atual:** Aguardando ícones e teste da extensão

**Próximo passo:** Instalar a extensão e testar o fluxo completo
