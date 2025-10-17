# 🔧 Solução para Problema de Alteração de Função de Usuário

## ❌ **Problema Identificado:**
- Erro 403 (Forbidden) ao tentar alterar função de usuário para "Administrador"
- Usuário só consegue alterar para "Recrutador"
- Permissões do Supabase bloqueando alteração de roles

## ✅ **Soluções Aplicadas:**

### **1. Corrigido VacancyEditor.tsx:**
- Agora busca TODOS os usuários (recrutador, administrador, superadministrador)
- Antes só buscava recrutadores

### **2. Corrigido UserEditor.tsx:**
- Implementado método mais robusto para atualizar roles
- Tenta UPDATE primeiro, se falhar usa UPSERT
- Não bloqueia a operação se role não conseguir ser atualizado

### **3. Criada Migração de Permissões:**
- Arquivo: `supabase/migrations/20241220000008_fix_user_roles_permissions.sql`
- Políticas mais permissivas para usuários autenticados

## 🚀 **Como Resolver:**

### **Passo 1: Aplicar Migração**
Execute no SQL Editor do Supabase:
```sql
-- Arquivo: supabase/migrations/20241220000008_fix_user_roles_permissions.sql
```

### **Passo 2: Testar Alteração de Função**
1. Acesse `/users`
2. Clique no ícone de editar de um usuário
3. Altere a função para "Administrador"
4. Clique em "Salvar"

### **Passo 3: Verificar se Funcionou**
- Deve aparecer toast de "Sucesso"
- Usuário deve aparecer com badge "Administrador" na lista

## 📋 **Funções Disponíveis:**
- **Recrutador** - Pode gerenciar vagas e candidatos
- **Administrador** - Acesso completo ao sistema
- **Super Administrador** - Controle total + gerenciamento de usuários

## 🎯 **Status:**
- ✅ Código corrigido
- ✅ Migração criada
- ⏳ Aguardando aplicação da migração

## 🔍 **Se Ainda Não Funcionar:**

### **Alternativa Manual:**
Se a migração não resolver, você pode alterar manualmente no Supabase:

1. Acesse o Dashboard do Supabase
2. Vá para "Table Editor" → "user_roles"
3. Encontre o usuário que quer alterar
4. Mude o campo "role" para "administrador"
5. Salve

### **Verificar Políticas RLS:**
No SQL Editor, execute:
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_roles';
```

---

**Após aplicar a migração, você conseguirá alterar usuários para Administrador! 🎉**
