import type { ReactNode } from 'react'
import { CardSection, DataList } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { formatFecha, formatFechaHora, formatGs } from '@/lib/format'
import { numeroWhatsApp } from '@/lib/telefono'
import type { Pedido, Ubicacion } from '../types'
import { estaAsignado } from '../types'
import { enlaceMapa, textoUbicacion } from '../ubicacion'
import { EstadoBadge } from './EstadoBadge'

/** Abre la ubicación: el link de Maps tal cual, o una búsqueda por coordenadas/dirección. */
export function UbicacionLink({ ubicacion }: { ubicacion: Ubicacion }) {
  return (
    <a href={enlaceMapa(ubicacion)} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 font-medium text-azul underline-offset-4 hover:underline">
      <Icon name="map" className="mt-0.5 size-4 shrink-0" />
      <span>
        {textoUbicacion(ubicacion)}
        <span className="sr-only"> (abre Google Maps)</span>
      </span>
    </a>
  )
}

/** Teléfono con acceso directo a llamar y a WhatsApp (el mensaje se escribe en la app de WhatsApp). */
export function TelLink({ contacto }: { contacto: string }) {
  const telefono = contacto.replace(/[^\d+]/g, '')
  if (telefono.length < 6) return <>{contacto}</>
  const whatsapp = numeroWhatsApp(contacto)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <a href={`tel:${telefono}`} className="inline-flex items-center gap-1.5 font-medium text-azul underline-offset-4 hover:underline">
        <Icon name="phone" className="size-4" /> {contacto}
      </a>
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-exito-50 px-2 text-xs font-semibold text-exito hover:bg-exito/15"
        >
          <Icon name="chat" className="size-4" /> WhatsApp<span className="sr-only"> a {contacto} (abre WhatsApp)</span>
        </a>
      )}
    </span>
  )
}

/** Cuerpo completo del pedido; `acciones` y `extra` los decide cada vista según el rol. */
export function PedidoDetalle({ pedido, acciones, extra }: { pedido: Pedido; acciones?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-5">
        <CardSection title="Cliente y entrega" action={<EstadoBadge estado={pedido.estado} asignado={estaAsignado(pedido)} />}>
          <DataList
            items={[
              { label: 'Cliente', value: pedido.nombreCliente },
              { label: 'Contacto', value: <TelLink contacto={pedido.contactoCliente} /> },
              { label: 'Retiro', value: <UbicacionLink ubicacion={pedido.ubicacionRetiro} /> },
              { label: 'Entrega', value: <UbicacionLink ubicacion={pedido.ubicacionEntrega} /> },
              {
                label: 'Zona',
                value: (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {pedido.zonaNombre}
                    {pedido.zonaRequiereTransportadora && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cafe-50 px-2 py-0.5 text-xs font-semibold text-cafe">
                        <Icon name="truck" className="size-3.5" /> Transportadora
                      </span>
                    )}
                  </span>
                ),
              },
              {
                label: 'Vendedor',
                value: pedido.vendedorContacto ? (
                  <span className="inline-flex flex-wrap items-center gap-x-2">
                    {pedido.vendedorNombre} <TelLink contacto={pedido.vendedorContacto} />
                  </span>
                ) : (
                  pedido.vendedorNombre
                ),
              },
              ...(pedido.pagoDirectoVendedor ? [{ label: 'Cobro', value: 'El cliente ya le pagó al vendedor' }] : []),
              ...(pedido.observaciones ? [{ label: 'Observaciones', value: <span className="whitespace-pre-line">{pedido.observaciones}</span>, full: true }] : []),
            ]}
          />
        </CardSection>

        <CardSection title={`Productos (${pedido.productos.length})`}>
          <ul className="divide-y divide-linea">
            {pedido.productos.map((producto, index) => (
              <li key={index} className="flex items-baseline justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="font-semibold">{producto.nombre}</span>
                  <span className="tabular text-gris">
                    {' '}
                    · {producto.cantidad} × {formatGs(producto.precioUnitario)}
                  </span>
                </span>
                <span className="tabular font-semibold whitespace-nowrap">{formatGs(producto.cantidad * producto.precioUnitario)}</span>
              </li>
            ))}
          </ul>
        </CardSection>

        {extra}
      </div>

      <div className="space-y-5 lg:sticky lg:top-24">
        <CardSection title="Importes">
          <dl className="tabular space-y-2.5 text-sm">
            <Fila label="Venta de productos" valor={formatGs(pedido.totalVenta)} />
            <Fila label="Delivery" valor={formatGs(pedido.costoDelivery)} />
            <div className="flex justify-between gap-3 border-t border-linea pt-2.5">
              <dt className="font-semibold">{pedido.pagoDirectoVendedor ? 'El delivery cobra' : 'Total a cobrar'}</dt>
              <dd className="font-extrabold text-azul-900">{formatGs(pedido.montoTotal)}</dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-cafe-50 px-3 py-2">
              <dt className="font-semibold text-cafe">A rendir</dt>
              <dd className="font-extrabold text-cafe">{formatGs(pedido.montoARendir)}</dd>
            </div>
            {typeof pedido.totalCosto === 'number' && (
              <div className="space-y-2.5 border-t border-linea pt-2.5">
                <Fila label="Costo de los productos" valor={formatGs(pedido.totalCosto)} />
                <Fila label="Ganancia (venta − costo)" valor={formatGs(pedido.totalVenta - pedido.totalCosto)} />
              </div>
            )}
          </dl>
        </CardSection>

        {acciones && <div className="space-y-2">{acciones}</div>}

        <CardSection title="Seguimiento">
          <ol className="space-y-3 text-sm">
            <Hito label="Fecha del pedido" valor={formatFecha(pedido.fechaPedido)} hecho />
            <Hito label="Creado" valor={formatFechaHora(pedido.createdAt)} hecho />
            {pedido.estado === 'CANCELADO' ? (
              <Hito label="Cancelado" valor={formatFechaHora(pedido.canceladoAt)} hecho cancelado />
            ) : (
              <>
                <Hito label="Tomado" valor={formatFechaHora(pedido.tomadoAt)} hecho={Boolean(pedido.tomadoAt)} />
                <Hito label="Entregado" valor={formatFechaHora(pedido.entregadoAt)} hecho={Boolean(pedido.entregadoAt)} />
              </>
            )}
          </ol>
        </CardSection>
      </div>
    </div>
  )
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gris">{label}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  )
}

function Hito({ label, valor, hecho, cancelado }: { label: string; valor: string; hecho: boolean; cancelado?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`grid size-6 shrink-0 place-items-center rounded-full ${cancelado ? 'bg-apagado-50 text-apagado' : hecho ? 'bg-azul text-white' : 'bg-crema text-gris ring-1 ring-linea'}`}
      >
        {hecho && <Icon name="check" className="size-3.5" />}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      <span className="tabular text-gris">{hecho ? valor : 'Pendiente'}</span>
    </li>
  )
}
