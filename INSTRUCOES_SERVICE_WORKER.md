# Correção dos Erros do Service Worker

## O que foi feito

1. **Criado novo service worker otimizado** (`public/sw.js`) que:
   - Ignora requisições com método diferente de GET (POST, HEAD, PUT, DELETE)
   - Ignora requisições com esquema não suportado (chrome-extension, chrome, about, etc.)
   - Ignora WebSocket e HMR do Vite
   - Só cacheia respostas válidas (status 200-299)
   - Adiciona tratamento de erros para evitar crashes

2. **Registrado o service worker** no `src/main.tsx` para substituir qualquer SW problemático

## Como aplicar a correção

### Passo 1: Limpar service workers antigos

No navegador (Chrome/Edge):

1. Abra o DevTools (F12)
2. Vá em **Application** → **Service Workers**
3. Clique em **Unregister** em todos os service workers listados
4. Vá em **Application** → **Storage** → **Clear site data**
5. Marque todas as opções e clique em **Clear site data**

### Passo 2: Recarregar a aplicação

1. Feche todas as abas do localhost:35000
2. Reinicie o servidor Vite se necessário:
   ```powershell
   # Pare o servidor (Ctrl+C) e reinicie
   npm run dev
   ```
3. Abra novamente http://localhost:35000
4. Faça um hard refresh: **Ctrl + Shift + R** (ou Ctrl + F5)

### Passo 3: Verificar se funcionou

No console do navegador, você deve ver:
```
[SW] Registrado com sucesso: http://localhost:35000/
```

E **não deve mais** ver os erros:
- `Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported`
- `Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported`
- `Failed to execute 'put' on 'Cache': Request method 'HEAD' is unsupported`

## Sobre o erro 500 do NewTemplateReport.tsx

O erro `GET http://localhost:35000/src/pages/partner/NewTemplateReport.tsx net::ERR_ABORTED 500` indica que o Vite está tendo problema ao compilar/servir esse arquivo.

### Possíveis causas:

1. **Erro de sintaxe ou TypeScript** no arquivo ou em suas dependências
2. **Problema com o pacote html2pdf.js** (pode precisar de configuração especial no Vite)
3. **Erro em tempo de execução** que está crashando o servidor Vite

### Como debugar:

1. Olhe o **terminal onde o Vite está rodando** - deve ter um stack trace do erro
2. Se não aparecer nada, tente acessar diretamente a rota no navegador e veja o overlay de erro do Vite
3. Verifique se há erros de import circular ou dependências faltando

### Se o problema persistir:

Cole aqui a mensagem de erro completa do terminal do Vite ou do overlay vermelho do navegador.
