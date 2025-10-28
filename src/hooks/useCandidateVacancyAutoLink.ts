import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para auto-vincular candidato a vagas relacionadas quando documentos são importados
 * Quando um candidato tem uma matrix_id e documentos são importados, ele é automaticamente
 * vinculado a todas as vagas que usam essa mesma matriz
 */
export const useCandidateVacancyAutoLink = (candidateId: string) => {
  const { toast } = useToast();

  useEffect(() => {
    const autoLinkToVacancies = async () => {
      if (!candidateId) {
        console.log('⚠️ Sem candidato ID, pulando auto-link');
        return;
      }

      try {
        console.log('🔗 Iniciando auto-link de candidato para vagas...');

        // 1. Obter candidato e seu matrix_id
        const { data: candidate, error: candidateError } = await supabase
          .from('candidates')
          .select('id, matrix_id, name')
          .eq('id', candidateId)
          .single();

        if (candidateError) {
          console.error('❌ Erro ao buscar candidato:', candidateError);
          return;
        }

        if (!candidate.matrix_id) {
          console.log('ℹ️ Candidato sem matrix_id, pulando auto-link');
          return;
        }

        console.log('✅ Candidato encontrado:', candidate.name);
        console.log('📋 Matrix ID:', candidate.matrix_id);

        // 2. Encontrar vagas que usam esta matriz e ainda não têm este candidato
        const { data: vacancies, error: vacanciesError } = await supabase
          .from('vacancies')
          .select('id, title, matrix_id')
          .eq('matrix_id', candidate.matrix_id);

        if (vacanciesError) {
          console.error('❌ Erro ao buscar vagas:', vacanciesError);
          return;
        }

        if (!vacancies || vacancies.length === 0) {
          console.log('ℹ️ Nenhuma vaga encontrada com esta matriz');
          return;
        }

        console.log(`📌 Encontradas ${vacancies.length} vagas com esta matriz`);

        // 3. Verificar quais vagas já têm este candidato
        const { data: existingLinks, error: existingError } = await supabase
          .from('vacancy_candidates')
          .select('vacancy_id')
          .eq('candidate_id', candidateId);

        if (existingError) {
          console.error('❌ Erro ao verificar links existentes:', existingError);
          return;
        }

        const existingVacancyIds = new Set(existingLinks?.map(l => l.vacancy_id) || []);

        // 4. Vincular candidato a vagas que ainda não o têm
        const linksToCreate = vacancies
          .filter(v => !existingVacancyIds.has(v.id))
          .map(v => ({
            vacancy_id: v.id,
            candidate_id: candidateId
          }));

        if (linksToCreate.length > 0) {
          console.log(`🔗 Criando ${linksToCreate.length} vínculos com vagas...`);

          const { error: insertError } = await supabase
            .from('vacancy_candidates')
            .insert(linksToCreate);

          if (insertError) {
            console.error('❌ Erro ao criar vínculos:', insertError);
            toast({
              title: "Erro ao vincular candidato",
              description: insertError.message,
              variant: "destructive",
            });
            return;
          }

          console.log(`✅ ${linksToCreate.length} vínculo(s) criado(s) com sucesso`);
          
          toast({
            title: "Candidato vinculado automaticamente",
            description: `Candidato vinculado a ${linksToCreate.length} vaga(s) automaticamente`,
          });
        } else {
          console.log('ℹ️ Candidato já estava vinculado a todas as vagas');
        }
      } catch (error: any) {
        console.error('❌ Erro no auto-link:', error);
        toast({
          title: "Erro ao vincular candidato",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    autoLinkToVacancies();
  }, [candidateId, toast]);
};

