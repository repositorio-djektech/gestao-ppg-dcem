import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { TablePaginationFooter } from '@/components/crud/TablePaginationFooter'
import {
  usuariosService,
  type UsuarioComDetalhes,
  type CriarUsuarioInput,
} from '@/services/usuarios'
import { docentesService } from '@/services/docentes'
import type { Docente, Role } from '@/types/database'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Search,
  RefreshCw,
  Lock,
  Mail,
  User as UserIcon,
  KeyRound,
  Check,
} from 'lucide-react'

const ROLE_INFO: Record<
  Role,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  suporte: {
    label: 'Suporte',
    bg: 'bg-red-50 text-red-700 border-red-200',
    text: 'text-red-700',
    border: 'border-red-200',
    desc: 'Acesso irrestrito a configurações, criação/exclusão de usuários e promoções',
  },
  coordenador: {
    label: 'Coordenador',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    border: 'border-purple-200',
    desc: 'Gestão completa acadêmica, relatórios CAPES e promoção de docentes a auxiliares',
  },
  auxiliar: {
    label: 'Auxiliar',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'text-blue-700',
    border: 'border-blue-200',
    desc: 'Edição acadêmica e operacional ampla (antigo Editor)',
  },
  docente: {
    label: 'Docente',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    desc: 'Edição estrita limitada aos seus próprios registros e orientações vinculadas',
  },
  capes: {
    label: 'CAPES',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-200',
    desc: 'Somente leitura para auditoria externa e visualização (antigo Viewer)',
  },
}

export default function Usuarios() {
  const { user: currentUser, role: currentRole, isSuporte, isCoordenador } = useAuth()

  const [usuarios, setUsuarios] = useState<UsuarioComDetalhes[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroPapel, setFiltroPapel] = useState<string>('todos')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  // Modais de Criação
  const [modalCriarAberto, setModalCriarAberto] = useState(false)
  const [novoUsuario, setNovoUsuario] = useState<CriarUsuarioInput>({
    nome: '',
    email: '',
    password: '',
    role: 'capes',
    docente_id: null,
  })
  const [criando, setCriando] = useState(false)

  // Modais de Troca de Papel
  const [usuarioParaTrocarPapel, setUsuarioParaTrocarPapel] = useState<UsuarioComDetalhes | null>(
    null,
  )
  const [papelEscolhido, setPapelEscolhido] = useState<Role>('capes')
  const [salvandoPapel, setSalvandoPapel] = useState(false)

  // Modal de Exclusão
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<UsuarioComDetalhes | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Carregar dados
  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [listaUsuarios, listaDocentes] = await Promise.all([
        usuariosService.listar(),
        docentesService.list(),
      ])
      setUsuarios(listaUsuarios)
      setDocentes(listaDocentes)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: err.message || 'Não foi possível carregar a listagem de usuários.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Lista filtrada
  const usuariosFiltrados = useMemo(() => {
    const termo = busca
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

    return usuarios.filter((u) => {
      if (filtroPapel !== 'todos' && u.role !== filtroPapel) {
        return false
      }
      if (!termo) return true

      const normalizar = (txt?: string | null) =>
        (txt || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()

      const matchNome = normalizar(u.name).includes(termo)
      const matchEmail = normalizar(u.email).includes(termo)
      const matchDocente = normalizar(u.docente_nome || u.docente?.nome).includes(termo)
      const matchPapel = normalizar(ROLE_INFO[u.role]?.label || u.role).includes(termo)
      return matchNome || matchEmail || matchDocente || matchPapel
    })
  }, [usuarios, busca, filtroPapel])

  const totalPages = Math.ceil(usuariosFiltrados.length / PER_PAGE)
  const paginatedUsuarios = useMemo(() => {
    return usuariosFiltrados.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  }, [usuariosFiltrados, page])

  // Ações de Criação
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoUsuario.nome.trim() || !novoUsuario.email.trim() || !novoUsuario.password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome, e-mail e defina uma senha de acesso.',
        variant: 'destructive',
      })
      return
    }

    if (novoUsuario.password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha provisória deve ter no mínimo 6 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setCriando(true)
    try {
      await usuariosService.criarUsuario({
        nome: novoUsuario.nome.trim(),
        email: novoUsuario.email.trim(),
        password: novoUsuario.password,
        role: novoUsuario.role,
        docente_id: novoUsuario.docente_id,
      })

      toast({
        title: 'Usuário criado com sucesso!',
        description: `A conta para ${novoUsuario.email} foi criada com papel ${ROLE_INFO[novoUsuario.role]?.label || novoUsuario.role}.`,
      })

      setModalCriarAberto(false)
      setNovoUsuario({
        nome: '',
        email: '',
        password: '',
        role: 'capes',
        docente_id: null,
      })
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar usuário',
        description: err.message || 'Falha ao registrar novo usuário.',
        variant: 'destructive',
      })
    } finally {
      setCriando(false)
    }
  }

  // Ação de Troca de Papel
  const handleAbrirTrocarPapel = (u: UsuarioComDetalhes) => {
    setUsuarioParaTrocarPapel(u)
    setPapelEscolhido(u.role)
  }

  const handleConfirmarTrocaPapel = async () => {
    if (!usuarioParaTrocarPapel) return

    setSalvandoPapel(true)
    try {
      await usuariosService.alterarPapel(usuarioParaTrocarPapel.user_id, papelEscolhido)
      toast({
        title: 'Papel atualizado com sucesso!',
        description: `O papel de ${usuarioParaTrocarPapel.name || usuarioParaTrocarPapel.email} agora é ${ROLE_INFO[papelEscolhido]?.label}.`,
      })
      setUsuarioParaTrocarPapel(null)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Não foi possível alterar o papel',
        description: err.message || 'Erro inesperado na promoção/rebaixamento.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoPapel(false)
    }
  }

  // Ação de Exclusão
  const handleConfirmarExclusao = async () => {
    if (!usuarioParaExcluir) return

    setExcluindo(true)
    try {
      await usuariosService.excluirUsuario(usuarioParaExcluir.user_id)
      toast({
        title: 'Usuário excluído',
        description: `A conta de ${usuarioParaExcluir.name || usuarioParaExcluir.email} foi removida com sucesso.`,
      })
      setUsuarioParaExcluir(null)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir usuário',
        description: err.message || 'Falha ao remover o usuário.',
        variant: 'destructive',
      })
    } finally {
      setExcluindo(false)
    }
  }

  // Permissões contextuais para troca de papel
  const podeMudarPapelPara = (alvo: UsuarioComDetalhes, novoP: Role): boolean => {
    if (currentUser?.id === alvo.user_id) return false // Ninguém altera o próprio papel
    if (isSuporte) return true // Suporte tem permissão plena para os 5 papéis
    if (isCoordenador) {
      // Coordenador só pode transformar docente em auxiliar
      return alvo.role === 'docente' && novoP === 'auxiliar'
    }
    return false
  }

  const podeGerenciarPapelDoUsuario = (alvo: UsuarioComDetalhes): boolean => {
    if (currentUser?.id === alvo.user_id) return false
    if (isSuporte) return true
    if (isCoordenador) return alvo.role === 'docente'
    return false
  }

  // Formatar data em PT-BR
  const formatarData = (dataIso: string | null | undefined) => {
    if (!dataIso) return '—'
    try {
      const d = new Date(dataIso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dataIso
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in flex-1">
      {/* Cabeçalho da Página Padronizado com CrudPage */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Usuários</h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle de perfis, concessão de papéis no PPG-DCEM e vinculação com docentes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {isSuporte && (
            <Button onClick={() => setModalCriarAberto(true)} className="gap-2 shrink-0 h-9 px-4">
              <UserPlus className="h-4 w-4" />
              <span>Novo Usuário</span>
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nome, e-mail ou docente..."
            className="pl-9 h-9 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:inline">
            Papel:
          </span>
          <Select
            value={filtroPapel}
            onValueChange={(val) => {
              setFiltroPapel(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9 bg-white">
              <SelectValue placeholder="Filtrar papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Papéis</SelectItem>
              <SelectItem value="suporte">Suporte</SelectItem>
              <SelectItem value="coordenador">Coordenador</SelectItem>
              <SelectItem value="auxiliar">Auxiliar</SelectItem>
              <SelectItem value="docente">Docente</SelectItem>
              <SelectItem value="capes">CAPES</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contêiner de Dados: Tabela rolável com rodapé de paginação fixo */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm relative">
        <div ref={tableContainerRef} className="overflow-x-auto table-scroll-container">
          <Table>
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Usuário</TableHead>
                <TableHead className="font-semibold text-slate-700">Papel</TableHead>
                <TableHead className="font-semibold text-slate-700">Criado em</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="h-16">
                    <TableCell>
                      <Skeleton className="h-5 w-48 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-28 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedUsuarios.length > 0 ? (
                paginatedUsuarios.map((u) => {
                  const roleCfg = ROLE_INFO[u.role] || {
                    label: u.role,
                    bg: 'bg-slate-100 text-slate-700 border-slate-200',
                  }
                  const isSelf = currentUser?.id === u.user_id

                  return (
                    <TableRow key={u.id} className="hover:bg-slate-50/50">
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {u.name || 'Sem nome'}
                            </span>
                            {isSelf && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-slate-100 text-slate-600 border-slate-300"
                              >
                                Você
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{u.email}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${roleCfg.bg} font-medium tracking-wide shadow-2xs`}
                        >
                          {roleCfg.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-slate-600">
                        {formatarData(u.created_at)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Trocar Papel */}
                          {podeGerenciarPapelDoUsuario(u) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAbrirTrocarPapel(u)}
                              className="h-8 px-2 text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                              title="Alterar papel de permissão"
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1" />
                              <span>Trocar Papel</span>
                            </Button>
                          )}

                          {/* Botão Excluir (apenas suporte, nunca a si mesmo) */}
                          {isSuporte && !isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setUsuarioParaExcluir(u)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Excluir usuário permanentemente"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-36 text-center text-slate-500">
                    <p className="font-medium text-slate-600">Nenhum usuário encontrado.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Ajuste os filtros de busca ou cadastre um novo usuário.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TablePaginationFooter
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          targetRef={tableContainerRef}
          totalItems={usuariosFiltrados.length}
        />
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: CRIAR NOVO USUÁRIO (Apenas Suporte)             */}
      {/* ========================================================= */}
      <Dialog open={modalCriarAberto} onOpenChange={setModalCriarAberto}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <UserPlus className="h-5 w-5 text-primary" />
              <span>Novo Usuário do Sistema</span>
            </DialogTitle>
            <DialogDescription>
              Crie uma conta de acesso e atribua o perfil correspondente de acordo com as regras do
              PPG-DCEM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarUsuario} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs font-semibold text-slate-700">
                Nome Completo <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="nome"
                  required
                  placeholder="Ex: Profa. Maria Santos"
                  value={novoUsuario.nome}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                E-mail Institucional <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="usuario@ufs.br"
                  value={novoUsuario.email}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-xs font-semibold text-slate-700">
                Senha Provisória <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="senha"
                  type="password"
                  required
                  placeholder="Mínimo de 6 caracteres"
                  value={novoUsuario.password}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, password: e.target.value })}
                  className="pl-9 h-9"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                O usuário poderá alterar sua senha após o primeiro acesso.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="papel" className="text-xs font-semibold text-slate-700">
                Papel de Acesso Inicial <span className="text-red-500">*</span>
              </Label>
              <Select
                value={novoUsuario.role}
                onValueChange={(val: Role) => setNovoUsuario({ ...novoUsuario, role: val })}
              >
                <SelectTrigger id="papel" className="h-9">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suporte">Suporte (Acesso Pleno)</SelectItem>
                  <SelectItem value="coordenador">Coordenador (Gestão PPG)</SelectItem>
                  <SelectItem value="auxiliar">Auxiliar (Operação/Editor)</SelectItem>
                  <SelectItem value="docente">Docente (Edição Própria)</SelectItem>
                  <SelectItem value="capes">CAPES (Somente Leitura)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">{ROLE_INFO[novoUsuario.role]?.desc}</p>
            </div>

            {/* Vínculo de Docente opcional (recomendado se papel for docente) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <Label htmlFor="docente_vinculo" className="text-xs font-semibold text-slate-700">
                Vincular Docente do Programa (Opcional)
              </Label>
              <Select
                value={novoUsuario.docente_id ? String(novoUsuario.docente_id) : 'nenhum'}
                onValueChange={(val) =>
                  setNovoUsuario({
                    ...novoUsuario,
                    docente_id: val === 'nenhum' ? null : Number(val),
                  })
                }
              >
                <SelectTrigger id="docente_vinculo" className="h-9">
                  <SelectValue placeholder="Nenhum docente vinculado" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="nenhum">Nenhum docente vinculado</SelectItem>
                  {docentes.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nome} {d.categoria ? `(${d.categoria})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                {novoUsuario.role === 'docente'
                  ? 'Recomendado selecionar o docente para liberar a edição por linha das suas publicações e orientações.'
                  : 'Docente associado a esta conta para identificação institucional.'}
              </p>
            </div>

            <DialogFooter className="pt-4 gap-2 flex-col-reverse sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalCriarAberto(false)}
                disabled={criando}
                className="h-9"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={criando} className="h-9 gap-1.5">
                {criando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Criando Usuário...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Criar Usuário</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 2: TROCAR PAPEL                                    */}
      {/* ========================================================= */}
      <Dialog
        open={usuarioParaTrocarPapel !== null}
        onOpenChange={(open) => !open && setUsuarioParaTrocarPapel(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <KeyRound className="h-5 w-5 text-purple-600" />
              <span>Trocar Papel de Permissão</span>
            </DialogTitle>
            <DialogDescription>
              Altere o papel de acesso de{' '}
              <strong>{usuarioParaTrocarPapel?.name || usuarioParaTrocarPapel?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Papel Atual:</span>
                <Badge
                  variant="outline"
                  className={ROLE_INFO[usuarioParaTrocarPapel?.role || 'capes']?.bg}
                >
                  {ROLE_INFO[usuarioParaTrocarPapel?.role || 'capes']?.label}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Seu papel logado:</span>
                <span className="font-semibold text-slate-700 uppercase">{currentRole}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Novo Papel</Label>
              <Select value={papelEscolhido} onValueChange={(val: Role) => setPapelEscolhido(val)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o novo papel" />
                </SelectTrigger>
                <SelectContent>
                  {(['suporte', 'coordenador', 'auxiliar', 'docente', 'capes'] as Role[]).map(
                    (p) => {
                      const permitido =
                        usuarioParaTrocarPapel && podeMudarPapelPara(usuarioParaTrocarPapel, p)
                      return (
                        <SelectItem
                          key={p}
                          value={p}
                          disabled={!permitido}
                          className={!permitido ? 'opacity-40' : ''}
                        >
                          <div className="flex items-center gap-2">
                            <span>{ROLE_INFO[p].label}</span>
                            {!permitido && (
                              <span className="text-[10px] text-slate-400 italic">
                                (não permitido)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      )
                    },
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">{ROLE_INFO[papelEscolhido]?.desc}</p>
            </div>

            {isCoordenador && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                Aviso: Como Coordenador, a cadeia de promoção do sistema permite apenas transformar
                usuários de <strong>Docente</strong> para <strong>Auxiliar</strong>.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUsuarioParaTrocarPapel(null)}
              disabled={salvandoPapel}
              className="h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarTrocaPapel}
              disabled={
                salvandoPapel ||
                !usuarioParaTrocarPapel ||
                papelEscolhido === usuarioParaTrocarPapel.role ||
                !podeMudarPapelPara(usuarioParaTrocarPapel, papelEscolhido)
              }
              className="h-9 gap-1.5 bg-purple-700 hover:bg-purple-800 text-white"
            >
              {salvandoPapel ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Confirmar Alteração</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO (Apenas Suporte)        */}
      {/* ========================================================= */}
      <AlertDialog
        open={usuarioParaExcluir !== null}
        onOpenChange={(open) => !open && setUsuarioParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              <span>Confirmar Exclusão de Usuário</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-slate-700">
              <p>
                Tem certeza de que deseja remover permanentemente o usuário{' '}
                <strong className="text-slate-900">
                  {usuarioParaExcluir?.name} ({usuarioParaExcluir?.email})
                </strong>
                ?
              </p>
              <p className="text-xs text-red-600">
                Esta ação revogará a conta no Supabase Auth e excluirá seu perfil de acesso. Os
                dados acadêmicos do programa (docentes, publicações, orientações) permanecerão
                intactos.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700 text-white h-9"
            >
              {excluindo ? 'Excluindo...' : 'Sim, excluir usuário'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
