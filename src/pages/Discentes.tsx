import { useState, useEffect, useMemo } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { discentesService } from '@/services/discentes'
import { docentesService } from '@/services/docentes'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { Badge } from '@/components/ui/badge'
import type { Discente, Docente, ProjetoPesquisa } from '@/types/database'
import { formatarCpf } from '@/lib/utils'
import { normalizarNomePessoa } from '@/lib/normalizacao'

const emptyForm = {
  nome: '',
  cpf: '',
  data_ingresso: '',
  status: 'ativo',
  link_lattes: '',
  link_comprovacao: '',
  observacoes: '',
  orientador: '',
  ano_conclusao: '',
  tipo_curso: 'Mestrado',
  projeto_id: '',
  docente_orientador_id: '',
}

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700',
  titulado: 'bg-blue-50 text-blue-700',
  desligado: 'bg-red-50 text-red-700',
}

export default function Discentes() {
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [projetos, setProjetos] = useState<ProjetoPesquisa[]>([])

  useEffect(() => {
    Promise.all([docentesService.list(), projetosPesquisaService.list()])
      .then(([docList, projList]) => {
        setDocentes(docList)
        setProjetos(projList)
      })
      .catch(console.error)
  }, [])

  const docenteMap = useMemo(() => {
    const m = new Map<number, string>()
    docentes.forEach((d) => m.set(d.id, d.nome))
    return m
  }, [docentes])

  const projetoMap = useMemo(() => {
    const m = new Map<number, string>()
    projetos.forEach((p) => m.set(p.id, p.titulo))
    return m
  }, [projetos])

  const columns: ColumnDef<Discente>[] = useMemo(
    () => [
      {
        key: 'nome',
        label: 'Nome & Informações',
        className: 'font-medium text-slate-900',
        render: (d) => {
          const nomeOrientador =
            d.docente_orientador_id && docenteMap.has(d.docente_orientador_id)
              ? docenteMap.get(d.docente_orientador_id)
              : d.orientador
          const tituloProjeto =
            d.projeto_id && projetoMap.has(d.projeto_id) ? projetoMap.get(d.projeto_id) : null

          return (
            <div className="flex flex-col items-start gap-0.5">
              <span>{normalizarNomePessoa(d.nome)}</span>
              {(d.tipo_curso || nomeOrientador || d.ano_conclusao || tituloProjeto) && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-normal">
                  {d.tipo_curso && (
                    <span className="font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                      {d.tipo_curso}
                    </span>
                  )}
                  {nomeOrientador && (
                    <span className="text-slate-700">
                      • Orientador: <strong className="font-medium">{nomeOrientador}</strong>
                      {d.docente_orientador_id && (
                        <span className="text-emerald-600 ml-1 text-[10px] font-medium">
                          (vinculado)
                        </span>
                      )}
                    </span>
                  )}
                  {tituloProjeto && (
                    <span className="text-blue-700 line-clamp-1" title={tituloProjeto}>
                      • Projeto:{' '}
                      {tituloProjeto.length > 40 ? `${tituloProjeto.slice(0, 40)}…` : tituloProjeto}
                    </span>
                  )}
                  {d.ano_conclusao && <span>• Conclusão: {d.ano_conclusao}</span>}
                </div>
              )}
            </div>
          )
        },
      },
      {
        key: 'cpf',
        label: 'CPF',
        render: (d) => (d.cpf ? formatarCpf(d.cpf) : '—'),
      },
      { key: 'data_ingresso', label: 'Ingresso' },
      {
        key: 'status',
        label: 'Status',
        render: (d) => (
          <div className="flex flex-col gap-1 items-start">
            <Badge
              variant="secondary"
              className={`border-0 capitalize ${statusColors[d.status] ?? ''}`}
            >
              {d.status}
            </Badge>
            {d.ano_conclusao && d.status === 'titulado' && (
              <span className="text-[10px] text-slate-400">Ano: {d.ano_conclusao}</span>
            )}
          </div>
        ),
      },
    ],
    [docenteMap, projetoMap],
  )

  const fields: FieldDef[] = useMemo(
    () => [
      {
        key: 'nome',
        label: 'Nome Completo',
        type: 'text',
        required: true,
        placeholder: 'Nome completo do aluno',
      },
      {
        key: 'cpf',
        label: 'CPF',
        type: 'text',
        placeholder: '000.000.000-00',
        helperText: 'Apenas números ou formatado',
      },
      {
        key: 'data_ingresso',
        label: 'Data de Ingresso',
        type: 'date',
        required: true,
        helperText: 'Data de matrícula inicial no programa',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'ativo', label: 'Ativo' },
          { value: 'titulado', label: 'Titulado' },
          { value: 'desligado', label: 'Desligado' },
        ],
      },
      {
        key: 'tipo_curso',
        label: 'Tipo do Curso',
        type: 'select',
        options: [
          { value: 'Mestrado', label: 'Mestrado' },
          { value: 'Doutorado', label: 'Doutorado' },
          { value: 'Pós-Doutorado', label: 'Pós-Doutorado' },
        ],
        placeholder: 'Selecione o nível...',
      },
      {
        key: 'docente_orientador_id',
        label: 'Orientador (docente)',
        type: 'select',
        options: docentes.map((d) => ({
          value: String(d.id),
          label: d.nome,
        })),
        placeholder: 'Selecione o docente orientador...',
        helperText: 'Ao escolher um docente, preenche automaticamente o campo texto abaixo',
        onValueChangeWithFormData: (val, currentData) => {
          const dId = val ? Number(val) : null
          const docente = dId ? docentes.find((d) => d.id === dId) : null
          let novoOrientadorTexto = currentData.orientador || ''
          if (docente) {
            if (!novoOrientadorTexto.trim()) {
              novoOrientadorTexto = docente.nome
            } else if (novoOrientadorTexto.trim() !== docente.nome) {
              const confirmar =
                typeof window === 'undefined' ||
                window.confirm(
                  `Deseja atualizar o campo de texto do orientador para "${docente.nome}"? (Texto atual: "${novoOrientadorTexto}")`,
                )
              if (confirmar) {
                novoOrientadorTexto = docente.nome
              }
            }
          }
          return {
            ...currentData,
            docente_orientador_id: val,
            orientador: novoOrientadorTexto,
          }
        },
      },
      {
        key: 'orientador',
        label: 'Orientador (texto livre / fallback)',
        type: 'text',
        placeholder: 'Nome do orientador do discente',
        helperText:
          'Nome para exibição e histórico (preenchido automaticamente ao vincular docente)',
      },
      {
        key: 'projeto_id',
        label: 'Projeto',
        type: 'select',
        options: projetos.map((p) => ({
          value: String(p.id),
          label: `${p.titulo.slice(0, 70)}${p.titulo.length > 70 ? '…' : ''}`,
        })),
        placeholder: 'Selecione o projeto vinculado...',
        helperText: 'Projeto de pesquisa institucional ou individual em que o discente atua',
      },
      {
        key: 'ano_conclusao',
        label: 'Ano de Conclusão',
        type: 'text',
        placeholder: 'Ex: 2026',
        helperText: 'Ano de defesa ou previsão de conclusão',
      },
      {
        key: 'link_lattes',
        label: 'Currículo Lattes',
        type: 'url',
        placeholder: 'http://lattes.cnpq.br/...',
      },
      {
        key: 'link_comprovacao',
        label: 'Link de Comprovação',
        type: 'url',
        placeholder: 'https://...',
        helperText: 'Ficha de matrícula ou documento comprobatório',
      },
      { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
    ],
    [docentes, projetos],
  )

  return (
    <CrudPage
      title="Discentes"
      description="Gerencie os discentes do programa de pós-graduação."
      service={discentesService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Discente"
      printModule="discentes"
    />
  )
}
