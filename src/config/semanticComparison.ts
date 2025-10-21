// Configuração para comparação semântica com IA
// Para usar comparação semântica avançada, adicione sua API key da OpenAI

export const SEMANTIC_COMPARISON_CONFIG = {
  // Sua API key da OpenAI (opcional - se não fornecida, usará comparação básica)
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  
  // Modelo a ser usado (GPT-4.1 mini para melhor precisão)
  model: 'gpt-4o-mini',
  
  // Limite mínimo de similaridade para considerar como match semântico
  minSimilarityThreshold: 0.6,
  
  // Configurações de temperatura para a API
  temperature: 0.1,
  
  // Máximo de tokens na resposta
  maxTokens: 200
};

// Instruções para configurar a API key:
// 1. Crie um arquivo .env na raiz do projeto
// 2. Adicione: VITE_OPENAI_API_KEY=sua_api_key_aqui
// 3. Reinicie o servidor de desenvolvimento
// 4. A comparação semântica avançada será ativada automaticamente
