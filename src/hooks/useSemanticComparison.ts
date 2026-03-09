import { useState } from 'react';
import { SEMANTIC_COMPARISON_CONFIG } from '@/config/semanticComparison';
import { normalizeString, calculateBasicSimilarity } from '@/utils/documentComparison';

interface SemanticComparisonResult {
  similarity: number;
  confidence: number;
  explanation: string;
}

interface SemanticComparisonOptions {
  apiKey?: string;
  model?: string;
}

export const useSemanticComparison = () => {
  const [isLoading, setIsLoading] = useState(false);

  const compareSemantically = async (
    candidateDoc: string,
    matrixDoc: string,
    options: SemanticComparisonOptions = {}
  ): Promise<SemanticComparisonResult> => {
    setIsLoading(true);
    
    try {
      // Usar configuração padrão se não fornecida
      const apiKey = options.apiKey || SEMANTIC_COMPARISON_CONFIG.openaiApiKey;
      const model = options.model || SEMANTIC_COMPARISON_CONFIG.model;
      
      // Se não há API key, usar comparação básica melhorada
      if (!apiKey) {
        const similarity = calculateBasicSimilarity(candidateDoc, matrixDoc);
        
        return {
          similarity,
          confidence: similarity > SEMANTIC_COMPARISON_CONFIG.minSimilarityThreshold ? 0.8 : 0.5,
          explanation: similarity > SEMANTIC_COMPARISON_CONFIG.minSimilarityThreshold 
            ? 'Alta similaridade encontrada por análise de palavras-chave'
            : 'Similaridade baixa - documentos podem ser diferentes'
        };
      }

      // Usar OpenAI para comparação semântica avançada com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: `Você é um especialista em análise de documentos técnicos e certificações. 
                Sua tarefa é comparar dois documentos e determinar se são similares ou equivalentes.
                IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional, sem markdown, sem explicações extras.
                Formato obrigatório: {"similarity": 0.0-1.0, "confidence": 0.0-1.0, "explanation": "texto explicativo"}`
              },
              {
                role: 'user',
                content: `Compare estes dois documentos:
                
                Documento 1: "${candidateDoc}"
                Documento 2: "${matrixDoc}"
                
                Determine se são documentos similares ou equivalentes. Considere:
                - Códigos técnicos (NR-35, STCW, etc.)
                - Área de conhecimento
                - Tipo de certificação
                - Equivalência funcional
                
                Responda APENAS com JSON válido:`
              }
            ],
            temperature: SEMANTIC_COMPARISON_CONFIG.temperature,
            max_tokens: SEMANTIC_COMPARISON_CONFIG.maxTokens
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Limpar e validar o conteúdo JSON
      let cleanContent = content.trim();
      
      // Remover markdown code blocks se presentes
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Tentar fazer parse do JSON
      let result;
      try {
        result = JSON.parse(cleanContent);
      } catch (parseError) {
        console.warn('Failed to parse OpenAI response as JSON:', cleanContent);
        // Fallback: extrair valores usando regex
        const similarityMatch = cleanContent.match(/["']?similarity["']?\s*:\s*([0-9.]+)/i);
        const confidenceMatch = cleanContent.match(/["']?confidence["']?\s*:\s*([0-9.]+)/i);
        const explanationMatch = cleanContent.match(/["']?explanation["']?\s*:\s*["']([^"']+)["']/i);
        
        result = {
          similarity: similarityMatch ? parseFloat(similarityMatch[1]) : 0.5,
          confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
          explanation: explanationMatch ? explanationMatch[1] : 'Análise semântica realizada'
        };
      }
      
      return {
        similarity: Math.max(0, Math.min(1, result.similarity)),
        confidence: Math.max(0, Math.min(1, result.confidence)),
        explanation: result.explanation || 'Análise semântica realizada'
      };

    } catch (error: any) {
      console.error('Erro na comparação semântica:', error);
      
      // Fallback para comparação básica
      const similarity = calculateBasicSimilarity(candidateDoc, matrixDoc);
      
      let explanation = 'Comparação básica devido a erro na API';
      if (error.name === 'AbortError') {
        explanation = 'Timeout na comparação semântica - usando análise básica';
      }
      
      return {
        similarity,
        confidence: 0.3,
        explanation
      };
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return {
    compareSemantically,
    isLoading
  };
};
