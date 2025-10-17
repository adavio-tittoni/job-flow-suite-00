# 🚀 Instruções para Aplicar as Migrações

## ⚠️ IMPORTANTE: Execute as migrações no Supabase antes de usar o sistema de vagas!

### 📋 Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - Vá para o seu projeto no Supabase
   - Clique em "SQL Editor"

2. **Execute as Migrações em Ordem:**
   
   **Primeiro:** Execute o arquivo `20241220000006_add_vacancy_fields.sql`
   ```sql
   -- Este arquivo adiciona os campos necessários à tabela vacancies
   ```

3. **Verifique se funcionou:**
   - Teste criar uma nova vaga em `/vacancies/new`
   - Verifique se consegue selecionar uma matriz
   - Teste salvar a vaga

### 🔧 O que cada migração faz:

- **`20241220000006_add_vacancy_fields.sql`**: Adiciona campos `company`, `role_title`, `matrix_id`, `salary`, `due_date`, `notes` à tabela `vacancies`

### ✅ Após aplicar as migrações:

1. **Descomente o componente de candidatos** em `VacancyEditor.tsx`:
   ```typescript
   import VacancyCandidatesSection from "@/components/VacancyCandidatesSection";
   ```

2. **Substitua a mensagem temporária** por:
   ```typescript
   <VacancyCandidatesSection 
     vacancyId={id} 
     matrixId={formData.matrix_id || null}
   />
   ```

### 🎯 Funcionalidades que funcionarão após as migrações:

- ✅ Criação de vagas com vinculação à matriz
- ✅ Edição de vagas existentes  
- ✅ Seleção de matrizes no dropdown
- ✅ Salvamento de todos os campos da vaga
- ✅ Navegação entre abas (Candidatos será habilitada)

### 🚨 Se houver erro:

1. Verifique se a tabela `matrices` existe
2. Verifique se você tem permissão para alterar a tabela `vacancies`
3. Execute as migrações uma por vez
4. Verifique os logs do Supabase para erros específicos

---

**Pronto! Após aplicar a migração, o sistema de vagas estará funcionando perfeitamente! 🎉**
