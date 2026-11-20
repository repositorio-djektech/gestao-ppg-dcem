/**
 * Discentes ligados a um registro de produção (P-35): seletor reutilizável e a cola com o CrudPage.
 * `useDiscentesVinculados` devolve o campo do formulário e um envoltório do serviço que grava os
 * vínculos depois de salvar o registro (e os remove ao apagá-lo, quando o banco não o faz sozinho).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FieldDef } from '@/components/crud/types'
import { discentesService } from '@/services/discentes'
import { ordenarPorNome } from '@/lib/ordenacao'
import type { Discente } from '@/types/database'
import type { criarServicoVinculosDiscentes } from '@/services/vinculos-discentes-registro'

interface SeletorProps {
  discentes: Discente[]
  selecionados: number[]
  disabled?: boolean
  onChange: (ids: number[]) => void
}

export function SeletorDiscentes({ discentes, selecionados, disabled, onChange }: SeletorProps) {
  const disponiveis = discentes.filter((d) => !selecionados.includes(Number(d.id)))
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-700">Discentes vinculados</Label>
      <div className="flex flex-wrap gap-1.5" data-testid="discentes-selecionados">
        {selecionados.length === 0 && (
          <span className="text-xs text-slate-400">Nenhum discente vinculado</span>
        )}
        {selecionados.map((id) => {
          const d = discentes.find((x) => Number(x.id) === id)
          return (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {d?.nome ?? `Discente ${id}`}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remover ${d?.nome ?? id}`}
                onClick={() => onChange(selecionados.filter((x) => x !== id))}
                className="rounded p-0.5 hover:bg-slate-300/60"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </Badge>
          )
        })}
      </div>
      <Select
        value=""
        disabled={disabled || disponiveis.length === 0}
        onValueChange={(v) => v && onChange([...selecionados, Number(v)])}
      >
        <SelectTrigger className="bg-white" aria-label="Adicionar discente">
          <SelectValue placeholder="Adicionar discente..." />
        </SelectTrigger>
        <SelectContent>
          {disponiveis.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>
              {d.nome}
              {d.tipo_curso ? ` (${d.tipo_curso})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

type ServicoVinculos = ReturnType<typeof criarServicoVinculosDiscentes>

export function useDiscentesVinculados(servico: ServicoVinculos) {
  const [discentes, setDiscentes] = useState<Discente[]>([])
  const [porRegistro, setPorRegistro] = useState<Record<number, number[]>>({})

  const carregar = useCallback(async () => {
    try {
      setPorRegistro(await servico.listarPorRegistro())
    } catch {
      setPorRegistro({}) // tabela ainda não criada ou sem permissão: o campo só abre vazio
    }
  }, [servico])

  useEffect(() => {
    discentesService
      .list()
      .then((l) => setDiscentes(ordenarPorNome(l)))
      .catch(() => setDiscentes([]))
    void carregar()
  }, [carregar])

  const campo: FieldDef = useMemo(
    () => ({
      key: 'discentes_ids',
      label: 'Discentes vinculados',
      type: 'text',
      customRender: ({ formData, setFormData, submitting }) => {
        const selecionados: number[] =
          formData.discentes_ids ??
          (formData.id ? porRegistro[Number(formData.id)] : undefined) ??
          []
        return (
          <SeletorDiscentes
            discentes={discentes}
            selecionados={selecionados}
            disabled={submitting}
            onChange={(ids) => setFormData({ ...formData, discentes_ids: ids })}
          />
        )
      },
    }),
    [discentes, porRegistro],
  )

  /** Envolve create/update do serviço da tela: salva o registro e depois os discentes ligados. */
  const envolverServico = useCallback(
    <S extends { create: (i: any) => Promise<any>; update: (id: any, i: any) => Promise<any> }>(
      base: S,
    ): S => ({
      ...base,
      create: async (item: any) => {
        const { discentes_ids, ...resto } = item
        const novo = await base.create(resto)
        if (novo?.id && discentes_ids !== undefined) {
          await servico.sincronizar(novo.id, discentes_ids).catch((e: any) => {
            toast.error(
              `Registro salvo, mas não foi possível ligar os discentes: ${e?.message ?? ''}`,
            )
          })
          await carregar()
        }
        return novo
      },
      update: async (id: any, item: any) => {
        const { discentes_ids, ...resto } = item
        const atualizado = await base.update(id, resto)
        if (discentes_ids !== undefined) {
          await servico.sincronizar(id, discentes_ids).catch((e: any) => {
            toast.error(
              `Registro salvo, mas não foi possível ligar os discentes: ${e?.message ?? ''}`,
            )
          })
          await carregar()
        }
        return atualizado
      },
    }),
    [servico, carregar],
  )

  return { campo, envolverServico, carregar }
}
