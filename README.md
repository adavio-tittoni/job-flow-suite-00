# Job Flow Suite - Sistema de Gestão de Candidatos

Sistema completo de gestão de candidatos com funcionalidades avançadas de upload de documentos, matrizes de requisitos e indicadores de aderência.

## 🚀 Funcionalidades Principais

### ✅ Sistema de Candidatos
- **Gestão Completa**: CRUD de candidatos com dados pessoais e profissionais
- **Upload de Fotos**: Sistema de upload de fotos para Supabase Storage
- **Sistema de Blacklist**: Controle de candidatos em lista negra
- **Histórico de Eventos**: Rastreamento de todas as atividades do candidato

### ✅ Sistema de Documentos
- **Upload de Arquivos**: Upload seguro para Supabase Storage
- **Preview de Documentos**: Visualização de PDFs e imagens
- **URLs Assinadas**: Acesso seguro aos arquivos
- **Exportação**: Exportação de documentos válidos e pendentes
- **Validação de Validade**: Controle de documentos vencidos

### ✅ Sistema de Matrizes e Indicadores
- **Matrizes de Requisitos**: Definição de documentos obrigatórios por cargo
- **Indicadores de Aderência**: Cálculo automático de percentual de aderência
- **Indicadores por Departamento**: Estatísticas por categoria de documento
- **Indicadores por Obrigatoriedade**: Mandatório, Recomendado, Cliente
- **Documentos Pendentes**: Identificação automática de requisitos não atendidos

### ✅ Sistema de Autenticação e Permissões
- **Roles**: Superadministrador, Administrador, Recrutador
- **RLS Policies**: Controle de acesso por usuário
- **Perfis de Usuário**: Gestão de dados do usuário

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta no Supabase
- Git

### 1. Clone o Repositório
```bash
git clone <repository-url>
cd job-flow-suite-00
```

### 2. Instale as Dependências
```bash
npm install
```

### 3. Configure o Supabase

#### 3.1. Crie um Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a URL e a chave anônima

#### 3.2. Configure as Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

#### 3.3. Execute as Migrações
Execute os arquivos SQL na ordem correta no Supabase SQL Editor:

1. **Primeiro**: `supabase/migrations/20241220000000_update_candidate_system.sql`
2. **Segundo**: `supabase/migrations/20241220000001_storage_configuration.sql`

#### 3.4. Configure os Buckets de Storage
Os buckets serão criados automaticamente pelas migrações:
- `candidate-photos`: Para fotos dos candidatos (público)
- `candidate-documents`: Para documentos dos candidatos (privado)

### 4. Execute o Projeto
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

#### `candidates`
- Dados pessoais e profissionais dos candidatos
- Vinculação com matrizes de requisitos
- Sistema de blacklist

#### `candidate_documents`
- Documentos dos candidatos
- Vinculação com catálogo de documentos
- Controle de validade e carga horária

#### `candidate_history`
- Histórico de eventos dos candidatos
- Rastreamento de atividades

#### `matrices`
- Matrizes de requisitos por cargo/empresa
- Controle de versões

#### `matrix_items`
- Itens específicos de cada matriz
- Definição de obrigatoriedade e carga horária

#### `documents_catalog`
- Catálogo de documentos disponíveis
- Categorização e classificação

#### `user_roles`
- Controle de permissões por usuário
- Roles: superadministrador, administrador, recrutador

#### `profiles`
- Perfis dos usuários
- Dados complementares de autenticação

## 🔧 Funcionalidades Técnicas

### Hooks Personalizados
- `useCandidates`: CRUD completo de candidatos
- `useCandidateDocuments`: Gerenciamento de documentos
- `useCandidateHistory`: Histórico de eventos
- `useCandidateRequirementStatus`: Cálculo de aderência
- `useMatrix`: Sistema de matrizes

### Componentes Principais
- `CandidateDetail`: Página principal com tabs
- `CandidateDocumentsTab`: Gerenciamento de documentos
- `CandidateIndicators`: Dashboard de indicadores
- `CandidateDocumentForm`: Formulário de documentos
- `MatrixForm`: Formulário de matrizes
- `MatrixItemsForm`: Gerenciamento de itens

### Recursos de UX/UI
- Interface responsiva e moderna
- Sistema de tabs organizadas
- Indicadores visuais de status
- Modais interativos
- Feedback visual com toasts
- Sistema de busca e filtros
- Exportação de dados
- Preview de arquivos

## 📈 Sistema de Indicadores

### Métricas Calculadas
- **Aderência Geral**: Percentual de requisitos atendidos
- **Aderência por Departamento**: Estatísticas por categoria
- **Aderência por Obrigatoriedade**: Mandatório, Recomendado, Cliente
- **Documentos Pendentes**: Lista de requisitos não atendidos
- **Status de Validade**: Controle de documentos vencidos

### Cálculos Inteligentes
- Matching de documentos por ID e nome
- Normalização de strings para comparação
- Validação de datas e documentos vencidos
- Cálculo de carga horária mínima

## 🔐 Segurança

### Row Level Security (RLS)
- Todas as tabelas protegidas por RLS
- Políticas de acesso por usuário
- Controle de permissões granular

### Storage Security
- Buckets com políticas de acesso específicas
- URLs assinadas para acesso seguro
- Controle de tipos de arquivo permitidos

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Netlify
1. Conecte o repositório ao Netlify
2. Configure as variáveis de ambiente
3. Deploy automático

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Linting
npm run lint

# Type checking
npm run type-check
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para suporte, entre em contato através de:
- Email: suporte@empresa.com
- Issues no GitHub
- Documentação: [Link para documentação]

## 🔄 Changelog

### v1.0.0 (2024-12-20)
- ✅ Sistema completo de gestão de candidatos
- ✅ Upload de documentos e fotos
- ✅ Sistema de matrizes e indicadores
- ✅ Interface moderna e responsiva
- ✅ Sistema de autenticação e permissões
- ✅ Integração completa com Supabase