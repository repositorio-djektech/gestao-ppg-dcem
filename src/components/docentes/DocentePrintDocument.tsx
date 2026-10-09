import type {
  Docente,
  Publicacao,
  Orientacao,
  Banca,
  ProjetoPesquisa,
  Premicao as Premiacao,
  ProducaoTecnica,
  Patente,
  Evento,
  Mobilidade,
  ImpactoSocial,
} from '@/types/database'

export type TabKey =
  | 'geral'
  | 'publicacoes'
  | 'orientacoes'
  | 'bancas'
  | 'projetos'
  | 'premiacoes'
  | 'producao_tecnica'
  | 'patentes'
  | 'eventos'
  | 'mobilidade'
  | 'impacto_social'

export interface DadosDocenteCompleto {
  docente: Docente | null
  publicacoes: Publicacao[]
  orientacoes: (Orientacao & { discente_nome?: string })[]
  bancas: (Banca & { discente_nome?: string })[]
  projetos: ProjetoPesquisa[]
  premiacoes: Premiacao[]
  producaoTecnica: ProducaoTecnica[]
  patentes: Patente[]
  eventos: Evento[]
  mobilidade: Mobilidade[]
  impactoSocial: ImpactoSocial[]
}

export interface DocentePrintDocumentProps {
  docente: Docente
  dados: DadosDocenteCompleto
  abasSelecionadas: Record<TabKey, boolean>
}

function textoSeguro(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (Array.isArray(val)) {
    const limpo = val.filter((x) => x !== null && x !== undefined && String(x).trim() !== '')
    return limpo.length > 0 ? limpo.join(', ') : '—'
  }
  const str = String(val).trim()
  return str.length > 0 ? str : '—'
}

export function DocentePrintDocument({
  docente,
  dados,
  abasSelecionadas,
}: DocentePrintDocumentProps) {
  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const doc = dados.docente || docente

  const totalGeralRegistros =
    dados.publicacoes.length +
    dados.orientacoes.length +
    dados.bancas.length +
    dados.projetos.length +
    dados.premiacoes.length +
    dados.producaoTecnica.length +
    dados.patentes.length +
    dados.eventos.length +
    dados.mobilidade.length +
    dados.impactoSocial.length

  return (
    <div className="docente-print-document text-slate-900 p-0 m-0">
      {/* Cabeçalho Institucional ABNT */}
      <header className="print-header border-b-2 border-slate-900 pb-3 mb-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider font-bold text-slate-700">
              Programa de Pós-Graduação em Ciência e Engenharia de Materiais — PPG DCEM
            </p>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Relatório Curricular Individual — {doc.nome}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Dados cadastrais e produção acadêmica registrada no sistema de avaliação
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            <p className="font-medium text-slate-700">Data de emissão:</p>
            <p>{currentDateFormatted}</p>
            <p className="mt-1 font-mono font-medium text-slate-800">
              {totalGeralRegistros} registro(s) associado(s)
            </p>
          </div>
        </div>
      </header>

      {/* 1. Aba Geral (Identificação e Índices) */}
      {abasSelecionadas.geral && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-3 text-slate-900">
            1. Identificação e Índices Bibliométricos
          </h2>
          <table className="w-full text-left border-collapse print-table mb-4">
            <tbody>
              <tr>
                <td className="w-1/4 font-bold bg-slate-100">Nome Completo</td>
                <td className="w-1/4">{textoSeguro(doc.nome)}</td>
                <td className="w-1/4 font-bold bg-slate-100">ID Lattes (CNPq)</td>
                <td className="w-1/4 font-mono">{doc.id_lattes || '—'}</td>
              </tr>
              <tr>
                <td className="font-bold bg-slate-100">Scopus Author ID</td>
                <td className="font-mono">{doc.scopus_id || '—'}</td>
                <td className="font-bold bg-slate-100">OpenAlex ID</td>
                <td className="font-mono">{doc.openalex_id || '—'}</td>
              </tr>
              <tr>
                <td className="font-bold bg-slate-100">Índice-H</td>
                <td className="font-mono font-bold">{doc.indice_h ?? 0}</td>
                <td className="font-bold bg-slate-100">Bolsa Produtividade CNPq</td>
                <td>{doc.bolsa_cnpq || '—'}</td>
              </tr>
              <tr>
                <td className="font-bold bg-slate-100">Jovem Doutor Pesquisador (JDP)</td>
                <td>{doc.jdp ? 'Sim' : 'Não'}</td>
                <td className="font-bold bg-slate-100">Licença</td>
                <td>{doc.licenca || '—'}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* 2. Publicações */}
      {abasSelecionadas.publicacoes && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Publicações em Periódicos ({dados.publicacoes.length})
          </h2>
          {dados.publicacoes.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">Nenhuma publicação registrada.</p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-12 text-center font-bold">Ano</th>
                  <th className="py-1 px-2 w-[45%] font-bold">Título</th>
                  <th className="py-1 px-2 w-[20%] font-bold">Periódico</th>
                  <th className="py-1 px-2 w-[25%] font-bold">Autores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.publicacoes.map((pub) => (
                  <tr key={pub.id}>
                    <td className="py-1 px-2 text-center font-mono font-semibold">
                      {pub.ano || '—'}
                    </td>
                    <td className="py-1 px-2 font-medium">
                      {pub.titulo}
                      {pub.doi && (
                        <span className="block text-[10px] text-slate-500 font-mono">
                          DOI: {pub.doi}
                        </span>
                      )}
                    </td>
                    <td className="py-1 px-2 text-slate-700">{pub.periodico || '—'}</td>
                    <td className="py-1 px-2 text-slate-600">{pub.autores || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 3. Orientações */}
      {abasSelecionadas.orientacoes && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Orientações e Supervisões ({dados.orientacoes.length})
          </h2>
          {dados.orientacoes.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">Nenhuma orientação registrada.</p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-[18%] font-bold">Tipo</th>
                  <th className="py-1 px-2 w-[35%] font-bold">Discente</th>
                  <th className="py-1 px-2 w-[18%] font-bold">Período</th>
                  <th className="py-1 px-2 w-[14%] font-bold">Status</th>
                  <th className="py-1 px-2 font-bold">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.orientacoes.map((ori) => (
                  <tr key={ori.id}>
                    <td className="py-1 px-2 font-semibold">{ori.tipo || '—'}</td>
                    <td className="py-1 px-2 font-medium">{ori.discente_nome || '—'}</td>
                    <td className="py-1 px-2 font-mono">
                      {ori.inicio || '—'} {ori.fim ? `– ${ori.fim}` : ''}
                    </td>
                    <td className="py-1 px-2 capitalize">{ori.status || '—'}</td>
                    <td className="py-1 px-2 text-slate-600">{ori.observacoes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 4. Bancas */}
      {abasSelecionadas.bancas && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Bancas Examinadoras ({dados.bancas.length})
          </h2>
          {dados.bancas.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">Nenhuma banca registrada.</p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-[15%] font-bold">Tipo</th>
                  <th className="py-1 px-2 w-[40%] font-bold">Trabalho</th>
                  <th className="py-1 px-2 w-[20%] font-bold">Candidato</th>
                  <th className="py-1 px-2 w-[12%] font-bold">Data</th>
                  <th className="py-1 px-2 font-bold">Membros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.bancas.map((banca) => (
                  <tr key={banca.id}>
                    <td className="py-1 px-2">{banca.tipo || '—'}</td>
                    <td className="py-1 px-2 font-medium">{banca.titulo_trabalho || '—'}</td>
                    <td className="py-1 px-2">{banca.discente_nome || '—'}</td>
                    <td className="py-1 px-2 font-mono">{banca.data || '—'}</td>
                    <td className="py-1 px-2 text-slate-600">{banca.membros || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 5. Projetos */}
      {abasSelecionadas.projetos && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Projetos de Pesquisa ({dados.projetos.length})
          </h2>
          {dados.projetos.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">Nenhum projeto registrado.</p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-[40%] font-bold">Título</th>
                  <th className="py-1 px-2 w-[18%] font-bold">Período</th>
                  <th className="py-1 px-2 w-[18%] font-bold">Financiamento</th>
                  <th className="py-1 px-2 font-bold">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.projetos.map((proj) => (
                  <tr key={proj.id}>
                    <td className="py-1 px-2 font-medium">{proj.titulo}</td>
                    <td className="py-1 px-2 font-mono">
                      {proj.inicio || '—'} {proj.fim ? `– ${proj.fim}` : ''}
                    </td>
                    <td className="py-1 px-2">
                      {proj.financiamento ? `Sim (${proj.orgao_fomento || 'Fomento'})` : 'Não'}
                    </td>
                    <td className="py-1 px-2 text-slate-600">{proj.descricao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 6. Premiações */}
      {abasSelecionadas.premiacoes && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Premiações e Distinções ({dados.premiacoes.length})
          </h2>
          {dados.premiacoes.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">Nenhuma premiação registrada.</p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-16 text-center font-bold">Ano</th>
                  <th className="py-1 px-2 w-[50%] font-bold">Título</th>
                  <th className="py-1 px-2 font-bold">Entidade Promotora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.premiacoes.map((prem) => (
                  <tr key={prem.id}>
                    <td className="py-1 px-2 text-center font-mono">{prem.ano ?? '—'}</td>
                    <td className="py-1 px-2 font-medium">{prem.titulo}</td>
                    <td className="py-1 px-2 text-slate-600">{prem.instituicao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 7. Produção Técnica */}
      {abasSelecionadas.producao_tecnica && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Produção Técnica e Tecnológica ({dados.producaoTecnica.length})
          </h2>
          {dados.producaoTecnica.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">
              Nenhuma produção técnica registrada.
            </p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-[15%] font-bold">Tipo</th>
                  <th className="py-1 px-2 w-14 text-center font-bold">Ano</th>
                  <th className="py-1 px-2 w-[45%] font-bold">Título</th>
                  <th className="py-1 px-2 font-bold">Autores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.producaoTecnica.map((pt) => (
                  <tr key={pt.id}>
                    <td className="py-1 px-2">{pt.tipo || '—'}</td>
                    <td className="py-1 px-2 text-center font-mono">{pt.ano ?? '—'}</td>
                    <td className="py-1 px-2 font-medium">{pt.titulo}</td>
                    <td className="py-1 px-2 text-slate-600">{pt.autores || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 8. Patentes */}
      {abasSelecionadas.patentes && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Patentes e Propriedade Intelectual ({dados.patentes.length})
          </h2>
          {dados.patentes.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">Nenhuma patente registrada.</p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-[40%] font-bold">Título</th>
                  <th className="py-1 px-2 w-[20%] font-bold">Registro INPI</th>
                  <th className="py-1 px-2 w-[15%] font-bold">Status</th>
                  <th className="py-1 px-2 font-bold">Autores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.patentes.map((pat) => (
                  <tr key={pat.id}>
                    <td className="py-1 px-2 font-medium">{pat.titulo}</td>
                    <td className="py-1 px-2 font-mono">{pat.inpi || '—'}</td>
                    <td className="py-1 px-2">{pat.status || 'Pendente'}</td>
                    <td className="py-1 px-2 text-slate-600">{pat.autores || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 9. Eventos */}
      {abasSelecionadas.eventos && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Participação em Eventos ({dados.eventos.length})
          </h2>
          {dados.eventos.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">Nenhum evento registrado.</p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-[35%] font-bold">Evento</th>
                  <th className="py-1 px-2 w-[20%] font-bold">Papel</th>
                  <th className="py-1 px-2 w-[20%] font-bold">Local / Data</th>
                  <th className="py-1 px-2 font-bold">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.eventos.map((eve) => (
                  <tr key={eve.id}>
                    <td className="py-1 px-2 font-medium">{eve.evento}</td>
                    <td className="py-1 px-2">{eve.papel || '—'}</td>
                    <td className="py-1 px-2">{eve.local_data || '—'}</td>
                    <td className="py-1 px-2 text-slate-600">{eve.observacoes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 10. Mobilidade */}
      {abasSelecionadas.mobilidade && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Mobilidade Acadêmica e Cooperação ({dados.mobilidade.length})
          </h2>
          {dados.mobilidade.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">Nenhum registro de mobilidade.</p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-[18%] font-bold">Modalidade</th>
                  <th className="py-1 px-2 w-[35%] font-bold">Instituição</th>
                  <th className="py-1 px-2 w-[20%] font-bold">Período</th>
                  <th className="py-1 px-2 font-bold">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.mobilidade.map((mob) => (
                  <tr key={mob.id}>
                    <td className="py-1 px-2 capitalize">{mob.modalidade || '—'}</td>
                    <td className="py-1 px-2 font-medium">{mob.instituicao}</td>
                    <td className="py-1 px-2 font-mono">{mob.periodo || '—'}</td>
                    <td className="py-1 px-2 text-slate-600">{mob.observacoes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 11. Impacto Social */}
      {abasSelecionadas.impacto_social && (
        <section className="print-section mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
            Impacto Social e Extensão ({dados.impactoSocial.length})
          </h2>
          {dados.impactoSocial.length === 0 ? (
            <p className="text-xs text-slate-500 italic mb-3">Nenhum registro de impacto social.</p>
          ) : (
            <table className="w-full text-left border-collapse print-table mb-4">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                  <th className="py-1 px-2 w-14 text-center font-bold">Ano</th>
                  <th className="py-1 px-2 w-[40%] font-bold">Título da Ação</th>
                  <th className="py-1 px-2 font-bold">Descrição e Impacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dados.impactoSocial.map((imp) => (
                  <tr key={imp.id}>
                    <td className="py-1 px-2 text-center font-mono">{imp.ano ?? '—'}</td>
                    <td className="py-1 px-2 font-medium">{imp.titulo}</td>
                    <td className="py-1 px-2 text-slate-600">{imp.descricao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Rodapé ABNT */}
      <footer className="print-footer mt-8 pt-3 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500">
        <div>PPG-DCEM — Programa de Pós-Graduação em Ciência e Engenharia de Materiais / UFS</div>
        <div>Documento gerado automaticamente pelo Sistema Gestão PPG-DCEM</div>
      </footer>
    </div>
  )
}
