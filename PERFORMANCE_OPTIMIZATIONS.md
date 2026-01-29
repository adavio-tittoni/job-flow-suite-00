# Otimizações de Performance - RH Gestão

## Resumo das Otimizações Implementadas

### 1. Cache Global com React Query

**Arquivo:** `src/App.tsx`

Configurações otimizadas:
- **staleTime: 2 minutos** - Dados permanecem frescos por 2 minutos sem refetch
- **gcTime: 10 minutos** - Cache mantido por 10 minutos após componente desmontar
- **refetchOnWindowFocus: false** - Não recarrega ao focar janela
- **retry: 2** - Tentativas automáticas em caso de erro

### 2. Paginação Server-Side

**Novos Hooks:**
- `src/hooks/usePaginatedCandidates.tsx` - Paginação para candidatos
- `src/hooks/usePaginatedVacancies.tsx` - Paginação para vagas

**Benefícios:**
- Carrega apenas 20 registros por página (configurável)
- Busca server-side (não carrega tudo no cliente)
- Prefetch da próxima página ao passar o mouse
- Debounce de 300ms na busca para evitar requisições excessivas

### 3. Code Splitting com React.lazy()

**Arquivo:** `src/App.tsx`

Todas as páginas agora são carregadas sob demanda:
```javascript
const Candidates = lazy(() => import("./pages/Candidates"));
```

**Benefício:** Reduz bundle inicial significativamente

### 4. Prefetch de Dados na Navegação

**Arquivo:** `src/hooks/usePrefetch.tsx`

Pré-carrega dados ao passar o mouse nos links do sidebar, resultando em navegação instantânea.

### 5. Build Otimizado para Produção

**Arquivo:** `vite.config.ts`

Configurações:
- **Manual Chunks:** Separação de vendors por categoria
- **Minificação com Terser:** Remove console.log em produção
- **Content Hash:** Cache busting para assets

---

## Deploy com Cloudflare

### Opção 1: Cloudflare Pages (Recomendado)

1. **Conectar Repositório:**
   ```bash
   # Fazer push do código
   git add .
   git commit -m "feat: performance optimizations"
   git push origin main
   ```

2. **Configurar no Cloudflare Pages:**
   - Acesse https://dash.cloudflare.com
   - Vá em Workers & Pages > Create > Pages
   - Conecte seu repositório GitHub/GitLab
   - Configure:
     - Build command: `npm run build`
     - Output directory: `dist`
     - Environment variables (se necessário)

3. **Headers de Cache (criar `public/_headers`):**
   ```
   /assets/*
     Cache-Control: public, max-age=31536000, immutable

   /js/*
     Cache-Control: public, max-age=31536000, immutable

   /*.html
     Cache-Control: public, max-age=0, must-revalidate

   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
   ```

### Opção 2: Cloudflare CDN + Cache Rules

Se já tem um servidor, configure o Cloudflare como proxy:

1. **Adicionar domínio no Cloudflare**

2. **Configurar Cache Rules:**
   - Vá em Caching > Cache Rules
   - Criar regra para assets estáticos:
     ```
     Se URI contém "/assets/" ou "/js/"
     Então: Cache tudo por 1 ano
     ```

3. **Configurar Page Rules:**
   ```
   URL: *seusite.com/assets/*
   Configuração: Cache Level: Cache Everything
   Edge TTL: 1 month
   ```

### Opção 3: Cloudflare Workers para API Cache

Para cache de respostas da API Supabase:

```javascript
// workers/api-cache.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Cache apenas GET requests
    if (request.method !== 'GET') {
      return fetch(request);
    }
    
    // Verificar cache
    const cache = caches.default;
    let response = await cache.match(request);
    
    if (!response) {
      response = await fetch(request);
      
      // Cache por 60 segundos para dados de listagem
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'public, max-age=60');
      
      response = new Response(response.body, {
        status: response.status,
        headers,
      });
      
      // Salvar no cache
      event.waitUntil(cache.put(request, response.clone()));
    }
    
    return response;
  },
};
```

---

## Métricas de Performance Esperadas

| Métrica | Antes | Depois |
|---------|-------|--------|
| Bundle Inicial | ~800KB | ~200KB |
| Tempo de Load (Cold) | ~3s | ~1s |
| Tempo de Load (Warm) | ~2s | ~200ms |
| Navegação entre páginas | ~500ms | ~100ms |
| Listagem 100 candidatos | Carrega tudo | 20 por página |

---

## Checklist de Deploy

- [ ] Variáveis de ambiente configuradas (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Build de produção sem erros: `npm run build`
- [ ] Headers de cache configurados
- [ ] HTTPS habilitado
- [ ] Compressão Brotli/Gzip ativada no Cloudflare
- [ ] Auto Minify (JS, CSS, HTML) ativado no Cloudflare
- [ ] Polish/WebP ativado para imagens

---

## Monitoramento

Recomendações:
- **Cloudflare Analytics:** Métricas de cache hit/miss
- **Lighthouse:** Performance score periódico
- **Sentry:** Monitoramento de erros em produção
