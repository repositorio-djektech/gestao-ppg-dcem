/* Dialog Component primitives - A component that displays a dialog (a modal that appears in the center of the screen) - from shadcn/ui (exposes Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, DialogOverlay, DialogPortal) */
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  /** Se false, força renderização centralizada mesmo em mobile (útil para confirmações curtas/alertas) */
  bottomSheetOnMobile?: boolean
  /** Oculta o handle visual superior em bottom-sheet mobile (padrão: falso, ou seja, exibe handle) */
  hideHandle?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      onOpenAutoFocus,
      bottomSheetOnMobile = true,
      hideHandle = false,
      ...props
    },
    ref,
  ) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          onOpenAutoFocus?.(e)
        }}
        className={cn(
          // Animação e posição Desktop: centralizado com escala suave
          'fixed z-50 grid w-full gap-4 border bg-background shadow-lg duration-200',
          'md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-lg md:rounded-lg md:p-6 md:max-h-[90vh] md:overflow-y-auto',
          'md:data-[state=open]:animate-in md:data-[state=closed]:animate-out md:data-[state=closed]:fade-out-0 md:data-[state=open]:fade-in-0 md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95 md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%] md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]',
          // Comportamento Mobile:
          // Quando bottomSheetOnMobile = true (padrão): Bottom Sheet deslizando do fundo
          bottomSheetOnMobile
            ? [
                'max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:top-auto max-md:translate-x-0 max-md:translate-y-0',
                'max-md:w-full max-md:max-w-full max-md:rounded-t-[20px] max-md:rounded-b-none',
                'max-md:border-b-0 max-md:border-x-0 max-md:border-t max-md:border-slate-200 dark:max-md:border-neutral-800',
                'max-md:max-h-[92dvh] max-md:h-auto max-md:flex max-md:flex-col',
                'max-md:pt-3 max-md:px-4 max-md:pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]',
                'max-md:data-[state=open]:animate-in max-md:data-[state=closed]:animate-out',
                'max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom',
                'max-md:data-[state=closed]:fade-out-0 max-md:data-[state=open]:fade-in-0',
                'max-md:shadow-2xl',
              ]
            : [
                'max-md:left-[50%] max-md:top-[50%] max-md:translate-x-[-50%] max-md:translate-y-[-50%]',
                'max-md:w-[92vw] max-md:max-w-md max-md:rounded-lg max-md:p-5 max-md:max-h-[85vh] max-md:overflow-y-auto',
                'max-md:data-[state=open]:animate-in max-md:data-[state=closed]:animate-out max-md:data-[state=closed]:zoom-out-95 max-md:data-[state=open]:zoom-in-95',
              ],
          className,
        )}
        {...props}
      >
        {/* Handle superior opcional exclusivo de mobile para sensação de app nativo */}
        {bottomSheetOnMobile && !hideHandle && (
          <div
            aria-hidden="true"
            className="md:hidden mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-neutral-700 shrink-0"
          />
        )}
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
