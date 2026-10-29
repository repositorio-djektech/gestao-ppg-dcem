import { useState, useEffect, useMemo, useCallback } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { premiacoesService } from '@/services/premiacoes'
import { impactoSocialService } from '@/services/impacto-social'
import { impactosVinculosService } from '@/services/impactos-vinculos'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'
import type { Premicao, ImpactoSocial } from '@/types/database'
import { normalizarTituloAcademico } from '@/lib/normalizacao'
import { toTitleCase } from '@/lib/titleCase'
import {
  SeletorImpactos,
  BadgesImpactosListagem,
} from '@/components/impacto-social/SeletorImpactos'

const emptyForm = {
  titulo: '',
  ano: null,
  nome_premiado: '',
  instituicao: '',
  link_comprovacao: '',
  observacoes: '',
  impactos_vinculados_ids: [] as number[],
}

export default function PremiacoesPage() {
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
        impactosVinculosService.listarPorEntidade('premiacoes'),
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
      console.error('Erro ao carregar impactos e vínculos de premiações:', err)
    }
  }, [])

  useEffect(() => {
    carregarDadosVinculos()
  }, [carregarDadosVinculos])

  const customService = useMemo(() => {
    return {
      ...premiacoesService,
      create: async (item: Partial<Premicao>) => {
        const itemAny = item as any
        const impactosIds: number[] = itemAny.impactos_vinculados_ids || []
        const payload = { ...item }
        delete (payload as any).impactos_vinculados_ids

        const novo = await premiacoesService.create(payload)
        if (novo?.id) {
          await impactosVinculosService.sincronizarVinculosRegistro(
            'premiacoes',
            Number(novo.id),
            impactosIds,
          )
          await carregarDadosVinculos()
        }
        return novo
      },
      update: async (id: number | string, item: Partial<Premicao>) => {
        const itemAny = item as any
        const impactosIds: number[] = itemAny.impactos_vinculados_ids || []
        const payload = { ...item }
        delete (payload as any).impactos_vinculados_ids

        const atualizado = await premiacoesService.update(id, payload)
        await impactosVinculosService.sincronizarVinculosRegistro(
          'premiacoes',
          Number(id),
          impactosIds,
        )
        await carregarDadosVinculos()
        return atualizado
      },
      remove: async (id: number | string) => {
        await premiacoesService.remove(id)
        await impactosVinculosService.sincronizarVinculosRegistro('premiacoes', Number(id), [])
        await carregarDadosVinculos()
      },
    }
  }, [carregarDadosVinculos])

  const columns: ColumnDef<Premicao>[] = [
    {
      key: 'titulo',
      label: 'Prêmio',
      className: 'font-medium text-slate-900 text-left',
      render: (p) => toTitleCase(p.titulo) || normalizarTituloAcademico(p.titulo),
    },
    {
      key: 'nome_premiado',
      label: 'Premiado',
      render: (p) => toTitleCase(p.nome_premiado),
    },
    {
      key: 'instituicao',
      label: 'Instituição',
      render: (p) => toTitleCase(p.instituicao),
    },
    {
      key: 'ano',
      label: 'Ano',
      render: (p) => (
        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-0">
          {p.ano ?? '-'}
        </Badge>
      ),
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
    {
      key: 'titulo',
      label: 'Título do Prêmio / Distinção',
      type: 'text',
      required: true,
      placeholder: 'Ex: Prêmio CAPES de Tese, Melhor Artigo CBECiMat',
    },
    {
      key: 'nome_premiado',
      label: 'Nome do Premiado (Docente / Discente)',
      type: 'text',
      required: true,
      placeholder: 'Nome da pessoa ou equipe premiada',
    },
    {
      key: 'instituicao',
      label: 'Instituição Concedente',
      type: 'text',
      required: true,
      placeholder: 'Ex: CAPES, CNPq, ABM, FAPESP...',
    },
    {
      key: 'ano',
      label: 'Ano da Premiação',
      type: 'number',
      required: true,
      min: 2000,
      max: 2035,
      placeholder: 'Ex: 2025',
    },
    {
      key: 'link_comprovacao',
      label: 'Link de Comprovação',
      type: 'url',
      placeholder: 'https://...',
      helperText: 'Diploma de premiação ou notícia oficial',
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
    { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
  ]

  return (
    <CrudPage
      title="Premiações"
      icon={<Trophy className="h-6 w-6 text-primary shrink-0" />}
      description="Gerencie as premiações recebidas pelo programa."
      service={customService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Premiação"
      tableName="premiacoes"
      printModule="premiacoes"
    />
  )
}
