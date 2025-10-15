# 🚀 Guia de Deploy - Job Flow Suite

Este guia contém todas as instruções necessárias para fazer o deploy do sistema Job Flow Suite.

## 📋 Pré-requisitos

- Conta no Supabase
- Conta no Vercel (recomendado) ou Netlify
- Node.js 18+ instalado
- Git configurado

## 🔧 Configuração do Supabase

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Preencha os dados:
   - **Name**: `job-flow-suite`
   - **Database Password**: (anote esta senha)
   - **Region**: Escolha a região mais próxima
4. Aguarde a criação do projeto (pode levar alguns minutos)

### 2. Configurar Banco de Dados

1. No painel do Supabase, vá para **SQL Editor**
2. Execute os arquivos SQL na seguinte ordem:

#### Primeiro: Schema Principal
```sql
-- Copie e cole o conteúdo do arquivo:
-- supabase/migrations/20241220000000_update_candidate_system.sql
```

#### Segundo: Configuração de Storage
```sql
-- Copie e cole o conteúdo do arquivo:
-- supabase/migrations/20241220000001_storage_configuration.sql
```

### 3. Configurar Storage

1. Vá para **Storage** no painel do Supabase
2. Verifique se os buckets foram criados:
   - `candidate-photos` (público)
   - `candidate-documents` (privado)

### 4. Obter Credenciais

1. Vá para **Settings** > **API**
2. Anote:
   - **Project URL**
   - **anon public** key

## 🌐 Deploy no Vercel (Recomendado)

### 1. Preparar o Projeto

```bash
# Clone o repositório
git clone <seu-repositorio>
cd job-flow-suite-00

# Instale as dependências
npm install

# Teste localmente
npm run dev
```

### 2. Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Conecte seu repositório GitHub
4. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`: Sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY`: Sua chave anônima do Supabase
5. Clique em "Deploy"

### 3. Configurar Domínio (Opcional)

1. No painel do Vercel, vá para **Settings** > **Domains**
2. Adicione seu domínio personalizado
3. Configure os registros DNS conforme instruído

## 🌐 Deploy no Netlify

### 1. Preparar o Projeto

```bash
# Build do projeto
npm run build
```

### 2. Deploy no Netlify

1. Acesse [netlify.com](https://netlify.com)
2. Clique em "New site from Git"
3. Conecte seu repositório
4. Configure o build:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`: Sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY`: Sua chave anônima do Supabase
6. Clique em "Deploy site"

## 🔐 Configuração de Segurança

### 1. Configurar RLS Policies

As políticas RLS já estão configuradas nas migrações, mas você pode ajustar conforme necessário:

1. No Supabase, vá para **Authentication** > **Policies**
2. Verifique se todas as tabelas têm políticas ativas
3. Ajuste as políticas conforme suas necessidades

### 2. Configurar Storage Policies

1. Vá para **Storage** > **Policies**
2. Verifique se os buckets têm políticas configuradas
3. Ajuste conforme necessário

## 👥 Configuração de Usuários

### 1. Criar Primeiro Usuário Admin

1. Acesse sua aplicação
2. Registre-se com um email
3. No Supabase SQL Editor, execute:

```sql
-- Tornar o primeiro usuário superadministrador
UPDATE user_roles 
SET role = 'superadministrador' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com');
```

### 2. Configurar Usuários

1. Acesse **Authentication** > **Users** no Supabase
2. Gerencie usuários conforme necessário
3. Atribua roles através da tabela `user_roles`

## 📊 Monitoramento

### 1. Logs do Supabase

1. Vá para **Logs** no painel do Supabase
2. Monitore erros e performance
3. Configure alertas se necessário

### 2. Analytics do Vercel/Netlify

1. Monitore métricas de performance
2. Configure alertas de erro
3. Acompanhe estatísticas de uso

## 🔄 Atualizações

### 1. Atualizar Código

```bash
# Fazer pull das atualizações
git pull origin main

# Instalar novas dependências
npm install

# Testar localmente
npm run dev
```

### 2. Deploy da Atualização

- **Vercel**: Deploy automático ao fazer push
- **Netlify**: Deploy automático ao fazer push

### 3. Atualizar Banco de Dados

1. Execute novas migrações no Supabase SQL Editor
2. Teste as mudanças em ambiente de desenvolvimento
3. Aplique em produção

## 🆘 Troubleshooting

### Problemas Comuns

#### 1. Erro de CORS
- Verifique se a URL do Supabase está correta
- Confirme se o domínio está autorizado no Supabase

#### 2. Erro de RLS
- Verifique se as políticas RLS estão ativas
- Confirme se o usuário tem as permissões necessárias

#### 3. Erro de Storage
- Verifique se os buckets existem
- Confirme se as políticas de storage estão corretas

#### 4. Erro de Build
- Verifique se todas as dependências estão instaladas
- Confirme se as variáveis de ambiente estão configuradas

### Logs Úteis

```bash
# Logs do Vercel
vercel logs

# Logs do Netlify
netlify logs

# Logs do Supabase
# Acesse o painel do Supabase > Logs
```

## 📞 Suporte

Para suporte técnico:
- **Email**: suporte@empresa.com
- **GitHub Issues**: [Link para issues]
- **Documentação**: [Link para documentação]

## ✅ Checklist de Deploy

- [ ] Projeto Supabase criado
- [ ] Migrações executadas
- [ ] Buckets de storage configurados
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado
- [ ] Primeiro usuário admin criado
- [ ] Testes funcionais realizados
- [ ] Monitoramento configurado
- [ ] Backup configurado
- [ ] Documentação atualizada

---

**🎉 Parabéns! Seu sistema Job Flow Suite está funcionando!**
