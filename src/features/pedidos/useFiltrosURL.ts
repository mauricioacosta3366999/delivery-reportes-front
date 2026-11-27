import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { ESTADOS, type Estado, type PedidoFiltros } from './types'

const OBJECT_ID = /^[a-f0-9]{24}$/i
const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Filtros de pedidos sincronizados con la URL (se pueden compartir y sobreviven al recargar). */
export function useFiltrosURL(limite = 20) {
  const [params, setParams] = useSearchParams()

  const filtros = useMemo<PedidoFiltros>(() => {
    const estado = params.get('estado')
    const desde = params.get('desde')
    const hasta = params.get('hasta')
    const vendedorId = params.get('vendedorId')
    const repartidorId = params.get('repartidorId')
    const zonaId = params.get('zonaId')
    const numero = Number(params.get('numero'))
    const pagina = Number(params.get('pagina'))
    return {
      estado: ESTADOS.includes(estado as Estado) ? (estado as Estado) : undefined,
      desde: desde && FECHA.test(desde) ? desde : undefined,
      hasta: hasta && FECHA.test(hasta) ? hasta : undefined,
      vendedorId: vendedorId && OBJECT_ID.test(vendedorId) ? vendedorId : undefined,
      repartidorId: repartidorId && OBJECT_ID.test(repartidorId) ? repartidorId : undefined,
      zonaId: zonaId && OBJECT_ID.test(zonaId) ? zonaId : undefined,
      activos: params.get('activos') === 'true' ? true : undefined,
      sinAsignar: params.get('sinAsignar') === 'true' && !repartidorId ? true : undefined,
      numero: Number.isSafeInteger(numero) && numero >= 1 ? numero : undefined,
      pagina: Number.isInteger(pagina) && pagina >= 1 && pagina <= 10_000 ? pagina : 1,
      limite,
    }
  }, [params, limite])

  const setFiltros = useCallback(
    (cambios: Partial<PedidoFiltros>) => {
      setParams(
        (previos) => {
          const next = new URLSearchParams(previos)
          for (const [key, value] of Object.entries(cambios)) {
            if (key === 'limite') continue
            if (value === undefined || value === '' || value === null) next.delete(key)
            else next.set(key, String(value))
          }
          // Cualquier cambio de filtro vuelve a la primera página.
          if (!('pagina' in cambios)) next.delete('pagina')
          if (next.get('pagina') === '1') next.delete('pagina')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const limpiar = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])
  const activos = Boolean(
    filtros.estado || filtros.desde || filtros.hasta || filtros.vendedorId || filtros.repartidorId || filtros.numero || filtros.zonaId || filtros.activos || filtros.sinAsignar,
  )

  return { filtros, setFiltros, limpiar, activos }
}
