import { Link, useInRouterContext } from 'react-router-dom'

/** Link entre telas do sistema; fora de um Router (ex.: testes de renderização) vira âncora comum. */
export function LinkInterno({
  para,
  className,
  children,
}: {
  para: string
  className?: string
  children: React.ReactNode
}) {
  const dentroDoRouter = useInRouterContext()
  return dentroDoRouter ? (
    <Link to={para} className={className}>
      {children}
    </Link>
  ) : (
    <a href={para} className={className}>
      {children}
    </a>
  )
}
