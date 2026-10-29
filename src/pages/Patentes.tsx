import { useState, useEffect, useMemo, useCallback } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { patentesService } from '@/services/patentes'
import { impactoSocialService } from '@/services/impacto-social'
import { impactosVinculosService } from '@/services/impactos-vinculos'
import { Badge } from '@/components/ui/badge'
import { Lightbulb } from 'lucide-react'
import type { Patente, ImpactoSocial } from '@/types/database'
import {
  SeletorImpactos,
  BadgesImpactosListagem,
} from '@/components/impacto-social/SeletorImpactos'

const emptyForm = {
  titulo: '',
  tipo: '',
  status: 'Pendente',
  autores: '',
  inpi: '',
  link_comprovacao: '',
  observacoes: '',
  impactos_vinculados_ids: [] as number[],
}

const statusColors: Record<string, string> = {
  Concessão: 'bg-emerald-50 text-emerald-700',
  Licenciamento: 'bg-blue-50 text-blue-700',
  Pendente: 'bg-amber-50 text-amber-700',
}

const OPCOES_TIPO_INPI = [
  { value: 'Patente de Invenção (PI)', label: 'Patente de Invenção (PI)' },
  { value: 'Modelo de Utilidade (MU)', label: 'Modelo de Utilidade (MU)' },
  { value: 'Certificado de Adição', label: 'Certificado de Adição' },
  { value: 'Desenho Industrial', label: 'Desenho Industrial' },
  { value: 'Programa de Computador', label: 'Programa de Computador' },
  { value: 'Topografia de Circuitos', label: 'Topografia de Circuitos' },
  { value: 'Marca', label: 'Marca' },
]

export default function PatentesPage() {
  const [impactos, setImpactos] = useState<ImpactoSocial[]>([])
  const [vinculosPorRegistro, setVinculosPorRegistro] = useState<Record<number, number[]>>({})

  const impactosMap = useMemo(() => {
    const map: Record<number, ImpactoSocial> = {}
    impactos.forEach((imp) => {
      map[imp.id] = imp
    })
    return map
  }, [impactos])

  const carregarDadosVinculos = useCallback(async () => {
    try {
      const [listaImpactos, vinculos] = await Promise.all([
        impactoSocialService.list(),
        impactosVinculosService.listarPorEntidade('patentes'),
      ])
      setImpactos(listaImpactos || [])

      const porRegistro: Record<number, number[]> = {}
      ;(vinculos || []).forEach((v) => {
        const rId = Number(v.entidade_id)
        if (!porRegistro[rId]) porRegistro[rId] = []
        porRegistro[rId].push(Number(v.impacto_social_id))
      })
      setVinculosPorRegistro(porRegistro)
    } catch (err) {
      console.error('Erro ao carregar impactos e vínculos de patentes:', err)
    }
  }, [])

  useEffect(() => {
    carregarDadosVinculos()
  }, [carregarDadosVinculos])

  const customService = useMemo(() => {
    return {
      ...patentesService,
      create: async (item: Partial<Patente>) => {
        const itemAny = item as any
        const impactosIds: number[] = itemAny.impactos_vinculados_ids || []
        const payload = { ...item }
        delete (payload as any).impactos_vinculados_ids
        if (!payload.tipo) {
          payload.tipo = null
        }

        const novo = await patentesService.create(payload)
        if (novo?.id) {
          await impactosVinculosService.sincronizarVinculosRegistro(
            'patentes',
            Number(novo.id),
            impactosIds,
          )
          await carregarDadosVinculos()
        }
        return novo
      },
      update: async (id: number | string, item: Partial<Patente>) => {
        const itemAny = item as any
        const impactosIds: number[] = itemAny.impactos_vinculados_ids || []
        const payload = { ...item }
        delete (payload as any).impactos_vinculados_ids
        if (!payload.tipo) {
          payload.tipo = null
        }

        const atualizado = await patentesService.update(id, payload)
        await impactosVinculosService.sincronizarVinculosRegistro(
          'patentes',
          Number(id),
          impactosIds,
        )
        await carregarDadosVinculos()
        return atualizado
      },
      remove: async (id: number | string) => {
        await patentesService.remove(id)
        await impactosVinculosService.sincronizarVinculosRegistro('patentes', Number(id), [])
        await carregarDadosVinculos()
      },
    }
  }, [carregarDadosVinculos])

  const columns: ColumnDef<Patente>[] = [
    { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (p) =>
        p.tipo ? (
          <Badge
            variant="secondary"
            className="border-0 bg-indigo-50 text-indigo-700 whitespace-nowrap text-xs"
          >
            {p.tipo}
          </Badge>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => (
        <Badge variant="secondary" className={`border-0 ${statusColors[p.status] ?? ''}`}>
          {p.status}
        </Badge>
      ),
    },
    {
      key: 'autores',
      label: 'Autores',
      render: (p) => <span className="text-sm text-slate-600 line-clamp-1">{p.autores}</span>,
    },
    {
      key: 'inpi',
      label: 'INPI',
      render: (p) => <span className="font-mono text-sm text-slate-600">{p.inpi || '-'}</span>,
    },
    {
      key: 'impactos' as any,
      label: 'Impacto',
      render: (p) => (
        <BadgesImpactosListagem impactosIds={vinculosPorRegistro[p.id]} impactosMap={impactosMap} />
      ),
    },
  ]

  const fields: FieldDef[] = [
    { key: 'titulo', label: 'Título da Patente', type: 'text', required: true },
    {
      key: 'tipo',
      label: 'Tipo de Propriedade Intelectual (INPI)',
      type: 'select',
      required: false,
      placeholder: 'Selecione o tipo do INPI...',
      options: OPCOES_TIPO_INPI,
      helperText:
        'Classificação oficial conforme o Instituto Nacional da Propriedade Industrial (INPI)',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'Pendente', label: 'Pendente' },
        { value: 'Concessão', label: 'Concessão' },
        { value: 'Licenciamento', label: 'Licenciamento' },
      ],
    },
    {
      key: 'autores',
      label: 'Autores',
      type: 'text',
      required: true,
      placeholder: 'Ex: Silva, J.; Mendes, A.',
    },
    {
      key: 'inpi',
      label: 'Registro INPI',
      type: 'text',
      required: true,
      placeholder: 'Número do registro no INPI',
    },
    {
      key: 'link_comprovacao',
      label: 'Link de Comprovação (INPI / Carta Patente)',
      type: 'url',
      placeholder: 'https://...',
      helperText: 'Link para consulta da patente ou certificado',
    },
    {
      key: 'impactos_vinculados_ids',
      label: 'Impactos Sociais Vinculados',
      type: 'text',
      customRender: ({ formData, setFormData, submitting }) => {
        let selecionados: number[] = formData.impactos_vinculados_ids
        if (selecionados === undefined && formData.id) {
          selecionados = vinculosPorRegistro[formData.id] || []
        }
        selecionados = selecionados || []

        return (
          <SeletorImpactos
            impactosDisponiveis={impactos}
            impactosSelecionadosIds={selecionados}
            disabled={submitting}
            onChange={(novosIds) => {
              setFormData({
                ...formData,
                impactos_vinculados_ids: novosIds,
              })
            }}
          />
        )
      },
    },
    { key: 'observacoes', label: 'Observações', type: 'textarea' },
  ]

  return (
    <CrudPage
      title="Patentes"
      icon={<Lightbulb className="h-6 w-6 text-primary shrink-0" />}
      description="Gerencie as patentes do programa."
      service={customService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Patente"
      tableName="patentes"
      printModule="patentes"
    />
  )
}
