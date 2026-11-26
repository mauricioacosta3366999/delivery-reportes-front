import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { pedidoKeys } from './api'
import { boletaApi, BoletaError, prepararBoleta, subirAR2 } from './boleta'
import type { Pedido } from './types'

export type EtapaSubida = 'preparando' | 'subiendo' | 'guardando'

export const etapaLabels: Record<EtapaSubida, string> = {
  preparando: 'Preparando la foto…',
  subiendo: 'Subiendo…',
  guardando: 'Guardando…',
}

/**
 * CU-17: comprimir → pedir URL firmada → PUT directo a R2 → confirmar con la key.
 * Si R2 responde 403 (la URL venció), se pide una nueva una sola vez.
 */
export function useSubirBoleta(pedidoId: string) {
  const queryClient = useQueryClient()
  const [etapa, setEtapa] = useState<EtapaSubida | null>(null)

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setEtapa('preparando')
      const { archivo, contentType } = await prepararBoleta(file)
      for (let intento = 0; intento < 2; intento++) {
        const subida = await boletaApi.pedirUrl(pedidoId, { contentType, tamano: archivo.size })
        setEtapa('subiendo')
        let status: number
        try {
          status = await subirAR2(subida, archivo)
        } catch {
          throw new BoletaError('No se pudo subir el archivo. Revisá la conexión y probá de nuevo.')
        }
        if (status === 403 && intento === 0) continue
        if (status < 200 || status >= 300) throw new BoletaError('El almacenamiento rechazó el archivo. Probá de nuevo.')
        setEtapa('guardando')
        return boletaApi.confirmar(pedidoId, subida.key)
      }
      throw new BoletaError('La subida venció. Probá de nuevo.')
    },
    onSuccess: (pedido: Pedido) => {
      queryClient.setQueryData(pedidoKeys.detail(pedido._id), pedido)
      void queryClient.invalidateQueries({ queryKey: pedidoKeys.lists })
      void queryClient.removeQueries({ queryKey: boletaKeys.url(pedido._id) })
    },
    onSettled: () => setEtapa(null),
  })

  return { ...mutation, etapa }
}

export const boletaKeys = {
  url: (pedidoId: string) => ['boleta', pedidoId] as const,
}

/** URL firmada para ver la boleta; vence a los 5 minutos, así que se pide al abrirla. */
export function useUrlBoleta(pedidoId: string, enabled: boolean) {
  return useQuery({
    queryKey: boletaKeys.url(pedidoId),
    queryFn: () => boletaApi.ver(pedidoId),
    enabled,
    staleTime: 4 * 60_000,
    gcTime: 4 * 60_000,
    retry: false,
  })
}
