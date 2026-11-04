interface DocenteContatoProps {
  docente: { email?: string | null; cpf?: string | null; siape?: string | null }
  /** CPF e SIAPE só aparecem para quem pode ver os dados pessoais deste docente (D-25). */
  mostrarDadosPessoais: boolean
}

/** Linha de e-mail, CPF e SIAPE na tabela de docentes. */
export function DocenteContato({ docente, mostrarDadosPessoais }: DocenteContatoProps) {
  const cpf = mostrarDadosPessoais ? docente.cpf : null
  const siape = mostrarDadosPessoais ? docente.siape : null
  if (!docente.email && !cpf && !siape) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-normal">
      {docente.email && <span className="text-slate-600">{docente.email}</span>}
      {cpf && <span>• CPF: {cpf}</span>}
      {siape && <span>• SIAPE: {siape}</span>}
    </div>
  )
}
