# Correção de Rotas no Netlify - SPA Routing

## Problema
Ao acessar rotas diretamente (como `/candidates/e274896c-e303-4b85-9e5d-fd1f8e81d26f?tab=documents`) no Netlify, ocorre erro 404 porque o servidor tenta buscar um arquivo físico nesse caminho, mas em uma SPA (Single Page Application) todas as rotas devem ser redirecionadas para o `index.html` para que o React Router possa gerenciar as rotas.

## Solução Implementada

### 1. Arquivo `_redirects` na pasta `public`
Criado arquivo `public/_redirects` com:
```
/*    /index.html   200
```

Este arquivo é automaticamente copiado para a pasta `dist` durante o build do Vite e instrui o Netlify a redirecionar todas as rotas para o `index.html` com status 200 (não 301/302, para manter a URL original).

### 2. Atualização do `netlify.toml`
Adicionado `force = true` na configuração de redirecionamento para garantir que todas as rotas sejam redirecionadas, mesmo que existam arquivos estáticos correspondentes.

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = true
```

## Como Funciona

1. Usuário acessa: `https://seu-site.netlify.app/candidates/123?tab=documents`
2. Netlify recebe a requisição e verifica o arquivo `_redirects`
3. Como não existe um arquivo físico nesse caminho, redireciona para `/index.html` (status 200)
4. O `index.html` carrega o React Router
5. O React Router lê a URL (`/candidates/123?tab=documents`) e renderiza o componente correto

## Próximos Passos

1. **Fazer commit das alterações:**
   ```bash
   git add public/_redirects netlify.toml
   git commit -m "Fix: Adiciona redirecionamento de rotas para SPA no Netlify"
   git push
   ```

2. **Fazer novo deploy no Netlify:**
   - O Netlify detectará automaticamente as mudanças
   - Ou faça um deploy manual se necessário

3. **Testar após o deploy:**
   - Acesse uma rota direta como: `/candidates/[id]?tab=documents`
   - A página deve carregar corretamente sem erro 404

## Notas Importantes

- O arquivo `_redirects` deve estar na pasta `public` para ser copiado automaticamente para `dist` durante o build
- O status 200 (não 301/302) é importante para manter a URL original visível no navegador
- O `force = true` garante que o redirecionamento aconteça mesmo para rotas que possam ter correspondência com arquivos estáticos

## Referências

- [Netlify Redirects Documentation](https://docs.netlify.com/routing/redirects/)
- [Vite Public Directory](https://vitejs.dev/guide/assets.html#the-public-directory)

