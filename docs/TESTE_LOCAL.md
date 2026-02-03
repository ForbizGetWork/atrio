# 🧪 GUIA DE TESTE LOCAL (SOLUÇÃO IMEDIATA)

Como o GitHub Actions está lento, vamos rodar tudo no seu computador.

## ✅ Pré-requisitos (Configurados)

1. Extensão atualizada para aceitar `localhost`
2. Script atualizado para integrar com a extensão localmente
3. Dados corrigidos (Ibis Jundiai)

---

## 🚀 Passo a Passo

### 1. Atualizar a Extensão
1. Vá em `chrome://extensions`
2. Clique no botão de **Reload** (🔄) na extensão Atrio
   - *Importante: Isso aplica as novas permissões de localhost*

### 2. Rodar Servidor Local
Abra o **Terminal** (PowerShell ou VS Code) na pasta do projeto e execute:

```powershell
python -m http.server 8000
```
*(Se não tiver python, tente `python3` ou use o "Live Server" do VS Code)*

### 3. Login na Senior X
1. Mantenha a aba da Senior X aberta e logada com `forbiz`
2. Certifique-se de que o token está ativo

### 4. Acessar Visualizador Local
1. Abra no navegador: **[http://localhost:8000](http://localhost:8000)**
2. Abra o Console (F12)

---

## 📋 Resultado Esperado

No console do `localhost:8000`:

```
🌐 Ambiente compatível com extensão detectado. Aguardando extensão...
[Atrio Extension] ✅ Contexto injetado!
✅ Evento senior-context-ready recebido!
✅ AuthService: Usuário detectado: forbiz
...
✅ Filial permitida: 47123BAEA... (Ibis Jundiai)
📊 Total carregado: 1, Visíveis: 1
```

O candidato **Kaique** deve aparecer na tela!

---

## ⚠️ Dicas
- Se der erro de CORS na API da Senior, pode ser que a Senior bloqueie localhost.
- Se isso acontecer, **aguarde o deploy do GitHub** (agora que fizemos novo push, pode destravá-lo).
- Verifique o status aqui: https://github.com/ForbizGetWork/atrio/actions
