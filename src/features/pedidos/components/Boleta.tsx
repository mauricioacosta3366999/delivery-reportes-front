import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CardSection } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { FormError } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/useToast'
import type { Usuario } from '@/features/usuarios/types'
import { getErrorMessage } from '@/lib/api/client'
import { formatFechaHora } from '@/lib/format'
import { BoletaError } from '../boleta'
import { codigoPedido } from '../numero'
import { accionesDisponibles } from '../permisos'
import type { Pedido } from '../types'
import { etapaLabels, useSubirBoleta, useUrlBoleta } from '../useBoleta'

/** Las fotos se convierten a JPEG antes de subir; image/* deja elegir cámara o galería en el celular. */
const ACCEPT = 'image/*,application/pdf'

function mensaje(error: unknown) {
  return error instanceof BoletaError ? error.message : getErrorMessage(error, 'No se pudo subir la boleta. Probá de nuevo.')
}

/** Botón "Subir / Reemplazar boleta" con el selector de archivo y el estado de la subida (CU-17). */
export function SubirBoletaButton({ pedido, block, size = 'md' }: { pedido: Pedido; block?: boolean; size?: 'md' | 'lg' }) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const subir = useSubirBoleta(pedido._id)
  const reemplazo = Boolean(pedido.boleta)

  return (
    <div className="space-y-2">
      {subir.isError && <FormError message={mensaje(subir.error)} />}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          subir.mutate(file, {
            onSuccess: (actualizado) => toast.success(`Boleta del pedido ${codigoPedido(actualizado)} ${reemplazo ? 'reemplazada' : 'subida'}.`),
          })
        }}
      />
      <Button block={block} size={size} variant={reemplazo ? 'secondary' : 'primary'} loading={subir.isPending} onClick={() => input.current?.click()}>
        {subir.etapa ? (
          etapaLabels[subir.etapa]
        ) : (
          <>
            <Icon name="file" className="size-4" /> {reemplazo ? 'Reemplazar boleta' : 'Subir boleta'}
          </>
        )}
      </Button>
    </div>
  )
}

/** "Ver boleta": pide una URL firmada al abrir y muestra la foto (o el link al PDF). */
export function VerBoletaButton({ pedido, variant = 'button' }: { pedido: Pedido; variant?: 'button' | 'link' }) {
  const [abierta, setAbierta] = useState(false)
  if (!pedido.boleta) return null
  return (
    <>
      {variant === 'link' ? (
        <button
          type="button"
          onClick={() => setAbierta(true)}
          className="relative z-10 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold whitespace-nowrap text-azul hover:bg-celeste-50"
        >
          <Icon name="file" className="size-4" /> Ver boleta
          <span className="sr-only"> del pedido {codigoPedido(pedido)}</span>
        </button>
      ) : (
        <Button variant="secondary" block onClick={() => setAbierta(true)}>
          <Icon name="file" className="size-4" /> Ver boleta
        </Button>
      )}
      {abierta && <VerBoletaDialog pedido={pedido} onClose={() => setAbierta(false)} />}
    </>
  )
}

function VerBoletaDialog({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) {
  const query = useUrlBoleta(pedido._id, true)
  const esPdf = (query.data?.contentType ?? pedido.boleta?.contentType) === 'application/pdf'

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Boleta de depósito · ${codigoPedido(pedido)}`}
      description={pedido.boleta ? `Subida el ${formatFechaHora(pedido.boleta.subidaAt)}.` : undefined}
      footer={
        <>
          {query.data && (
            <a
              href={query.data.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-azul ring-1 ring-celeste ring-inset hover:bg-celeste-50"
            >
              <Icon name="external" className="size-4" /> Abrir en otra pestaña
            </a>
          )}
          <Button onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      {query.isPending ? (
        <div className="grid min-h-48 place-items-center">
          <Spinner />
        </div>
      ) : query.isError ? (
        <FormError message={getErrorMessage(query.error, 'No se pudo abrir la boleta.')} />
      ) : esPdf ? (
        <p className="text-sm text-gris">La boleta es un PDF. Abrila en otra pestaña para verla.</p>
      ) : (
        // La URL firmada vence a los 5 minutos; si falla, se pide otra.
        <img
          src={query.data.url}
          alt={`Boleta de depósito del pedido ${codigoPedido(pedido)}`}
          className="mx-auto max-h-[60dvh] w-auto rounded-xl border border-linea object-contain"
          onError={() => void query.refetch()}
        />
      )}
    </Dialog>
  )
}

/** Sección del detalle: estado de la boleta, y subir/ver según el rol (CU-17). */
export function BoletaSection({ pedido, usuario }: { pedido: Pedido; usuario: Usuario }) {
  const puedeSubir = accionesDisponibles(pedido, usuario).subirBoleta
  if (!pedido.zonaRequiereTransportadora || (!pedido.boleta && !puedeSubir)) return null

  return (
    <CardSection title="Boleta de depósito">
      <div className="space-y-3">
        {pedido.boleta ? (
          <p className="flex items-center gap-2 text-sm text-exito">
            <Icon name="check" className="size-4" /> Subida el {formatFechaHora(pedido.boleta.subidaAt)}
          </p>
        ) : (
          <p className="text-sm text-gris">Cuando deposites el envío en la transportadora, subí la foto de la boleta: el vendedor la ve sin tener que pedirla.</p>
        )}
        <VerBoletaButton pedido={pedido} />
        {puedeSubir && <SubirBoletaButton pedido={pedido} block />}
      </div>
    </CardSection>
  )
}
