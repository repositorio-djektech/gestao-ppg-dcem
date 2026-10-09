import { cn } from '@/lib/utils'
import { Link, LinkProps } from 'react-router-dom'
import React, { useState, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Links {
  label: string
  href: string
  icon: React.JSX.Element | React.ReactNode
}

interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  const [openState, setOpenState] = useState(false)

  const open = openProp !== undefined ? openProp : openState
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>{children}</SidebarContext.Provider>
  )
}

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  )
}

export const SidebarTrigger = ({ className, ...props }: React.ComponentProps<typeof Button>) => {
  const { open, setOpen } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('md:hidden h-9 w-9 text-neutral-700 dark:text-neutral-200 shrink-0', className)}
      onClick={() => setOpen(!open)}
      aria-label="Alternar menu lateral"
      {...props}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as unknown as React.ComponentProps<'div'>)} />
    </>
  )
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, animate } = useSidebar()
  return (
    <motion.div
      className={cn(
        'h-full hidden md:flex md:flex-col bg-white dark:bg-neutral-900 w-[240px] flex-shrink-0',
        className,
      )}
      animate={{
        width: animate ? (open ? '240px' : '48px') : '240px',
      }}
      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const MobileSidebar = ({ className, children, ...props }: React.ComponentProps<'div'>) => {
  const { open, setOpen } = useSidebar()
  return (
    <div className="md:hidden" {...props}>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop escuro com fechar ao clicar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[99]"
              aria-hidden="true"
            />
            {/* Drawer lateral deslizante */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 35,
              }}
              className={cn(
                'fixed inset-y-0 left-0 max-w-[85vw] sm:max-w-[320px] w-full bg-white dark:bg-neutral-900 p-4 z-[100] flex flex-col justify-between shadow-2xl border-r border-neutral-200 dark:border-neutral-800 overflow-hidden',
                className,
              )}
            >
              <div
                className="absolute right-4 top-4 z-50 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white cursor-pointer p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                role="button"
              >
                <X className="h-5 w-5" />
              </div>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links
  className?: string
} & Omit<LinkProps, 'to'>) => {
  const { open, animate } = useSidebar()
  return (
    <Link
      to={link.href}
      className={cn(
        'flex items-center group/sidebar transition-colors',
        open ? 'justify-start gap-2.5 px-2.5 py-1.5' : 'justify-center p-2',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-center shrink-0">{link.icon}</div>
      <motion.span
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-0.5 transition duration-150 whitespace-pre inline-block !p-0 !m-0 overflow-hidden text-ellipsis"
      >
        {link.label}
      </motion.span>
    </Link>
  )
}
