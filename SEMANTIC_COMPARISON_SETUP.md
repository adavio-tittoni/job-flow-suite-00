# Configuração da Comparação Semântica com IA

## Visão Geral

O sistema agora inclui comparação semântica avançada usando IA para melhorar a identificação de documentos similares entre candidatos e matrizes. A funcionalidade funciona em dois modos:

1. **Modo Básico** (sem API key): Usa análise de palavras-chave melhorada
2. **Modo Avançado** (com API key): Usa OpenAI GPT para comparação semântica inteligente

## Configuração da API Key da OpenAI

### Passo 1: Obter API Key
1. Acesse [OpenAI Platform](https://platform.openai.com/)
2. Faça login ou crie uma conta
3. Vá para "API Keys" no menu lateral
4. Clique em "Create new secret key"
5. Copie a chave gerada

### Passo 2: Configurar no Projeto
1. Crie um arquivo `.env` na raiz do projeto (se não existir)
2. Adicione a seguinte linha:
   ```
   VITE_OPENAI_API_KEY=sua_api_key_aqui
   ```
3. Substitua `sua_api_key_aqui` pela chave copiada
4. Salve o arquivo
5. Reinicie o servidor de desenvolvimento

### Passo 3: Verificar Configuração
- A comparação semântica avançada será ativada automaticamente
- Você verá mensagens mais precisas sobre similaridade de documentos
- A interface mostrará badges indicando o tipo de comparação usada

## Funcionalidades Implementadas

### ✅ Comparação por Código
- Prioriza comparação exata por campo `codigo`
- Exemplo: "NR-35" = "NR-35"

### ✅ Comparação Semântica
- Analisa significado e contexto dos documentos
- Identifica equivalências funcionais
- Considera códigos técnicos e áreas de conhecimento

### ✅ Visualização Aprimorada
- Mostra todos os dados do `documents_catalog`
- Exibe status completo (Aprovado/Parcial/Pendente)
- Indica tipo de comparação usada (ID Exato/Código Exato/Semântico)
- Mostra percentual de similaridade

### ✅ Interface Intuitiva
- Tabs para filtrar por status
- Estatísticas de aderência
- Ações contextuais (adicionar/visualizar documentos)

## Exemplo de Uso

### Sem API Key (Modo Básico)
```
Documento Candidato: "Segurança em Altura"
Documento Matriz: "NR-35 Segurança em Trabalho em Altura"
Resultado: Similaridade 85% - Alta similaridade encontrada por análise de palavras-chave
```

### Com API Key (Modo Avançado)
```
Documento Candidato: "Curso de Primeiros Socorros"
Documento Matriz: "Atendimento Pré-Hospitalar Offshore"
Resultado: Similaridade 92% - Documentos equivalentes funcionalmente para atendimento médico emergencial
```

## Configurações Avançadas

As configurações podem ser ajustadas em `src/config/semanticComparison.ts`:

- `minSimilarityThreshold`: Limite mínimo para considerar match (padrão: 0.6)
- `model`: Modelo GPT a usar (padrão: gpt-3.5-turbo)
- `temperature`: Criatividade da IA (padrão: 0.1)
- `maxTokens`: Máximo de tokens na resposta (padrão: 200)

## Troubleshooting

### API Key não funciona
- Verifique se a chave está correta no arquivo `.env`
- Confirme que reiniciou o servidor após adicionar a chave
- Verifique se tem créditos disponíveis na conta OpenAI

### Comparação não está funcionando
- O sistema sempre funciona no modo básico
- Verifique o console do navegador para erros
- A comparação semântica é opcional e não afeta a funcionalidade principal

### Performance lenta
- A comparação semântica pode ser mais lenta que a básica
- Considere ajustar `minSimilarityThreshold` para reduzir chamadas à API
- Use o modo básico se a performance for crítica
