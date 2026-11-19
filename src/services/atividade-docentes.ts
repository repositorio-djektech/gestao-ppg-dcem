/**
 * Carrega os dados que dizem se o docente teve atividade num período (H-28): publicações,
 * orientações e projetos. Só leitura; usado pelo filtro da tela Docentes e pela impressão.
 */
import { supabase } from '@/lib/supabase/client'
import { publicacoesService } from '@/services/publicacoes'
import { publicacoesDocentesService } from '@/services/publicacoes-docentes'
import { orientacoesService } from '@/services/orientacoes'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import type { DadosAtividadeDocente } from '@/lib/periodos/filtro'

export async function carregarDadosAtividadeDocentes(): Promise<DadosAtividadeDocente> {
  const [publicacoes, publicacoesDocentes, orientacoes, projetos, participantes] =
    await Promise.all([
      publicacoesService.list(),
      publicacoesDocentesService.listarTodos(),
      orientacoesService.list(),
      projetosPesquisaService.list(),
      supabase
        .from('projetos_participantes')
        .select('projeto_id, docente_id')
        .then(({ data }) => (data ?? []) as { projeto_id: number; docente_id: number }[]),
    ])
  return {
    publicacoes: publicacoes as any[],
    publicacoesDocentes: publicacoesDocentes as any[],
    orientacoes: orientacoes as any[],
    projetos: projetos as any[],
    participantes,
  }
}
