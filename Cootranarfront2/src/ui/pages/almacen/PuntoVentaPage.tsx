import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { almacenApi, type Id, type Producto } from '../../../infrastructure/services/almacenApi';
import {
  Alerta, BLUE, BodegaSelector, Btn, Card, Modal, ProductoPicker,
  imprimirRecibo, inputStyle, money, useAlmacen, useMensaje,
} from './almacenUi';
import { AperturaCajaPos, TurnoCajaChip } from './CajaTurnoPos';
import { useTurnoCajaPos } from './useTurnoCajaPos';

interface LineaPOS {
  producto: Producto;
  cantidad: number;
  precio: number | null; // Precio acordado unitario con IVA (si aplica)
  descuentoPorc: number; // % Descuento
}

interface Socio {
  idusuario: Id;
  nombre: string;
  apellido: string;
  documento: string;
  telefono?: string;
  correo?: string;
  cupocredito: string;
  saldo: string;
  creditoactivo: boolean;
  vehiculos: { idvehiculo: Id; placa: string; numeromovil?: string }[];
}

const precioLista = (p: Producto, esSocio: boolean) =>
  Number(esSocio && Number(p.preciosocio) > 0 ? p.preciosocio : p.precioventa);

// Estilos de cabecera POS estilo Milenium Financiero
const labelPosStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#475569',
  marginBottom: '3px',
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputPosStyle: React.CSSProperties = {
  ...inputStyle,
  fontSize: '12px',
  padding: '6px 8px',
  borderRadius: '4px',
  borderColor: '#cbd5e1',
  backgroundColor: '#ffffff',
  height: '32px',
};

const readonlyPosStyle: React.CSSProperties = {
  ...inputPosStyle,
  backgroundColor: '#f1f5f9',
  color: '#334155',
  cursor: 'default',
  fontWeight: 600,
};

export const PuntoVentaPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { idbodegaOperacion, bodegaActual, cargando } = useAlmacen();
  const m = useMensaje();

  // ── Encabezado de Documento POS (Inicia vacío; se llena con F2 o manualmente) ────────
  const [tipDoc, setTipDoc] = useState<'FE' | 'POS' | ''>('');
  const [prefijo, setPrefijo] = useState('');
  const [numeroSist, setNumeroSist] = useState('');
  const [fechaDoc, setFechaDoc] = useState('');
  const [secuencia, setSecuencia] = useState('');
  const [estadoDoc, setEstadoDoc] = useState('');
  const [detalleGeneral, setDetalleGeneral] = useState('');
  const [moneda, setMoneda] = useState('');
  const [centroCostos, setCentroCostos] = useState('');
  const [refContable, setRefContable] = useState('');

  // Fecha actual formateada DD/MM/YYYY
  const fechaHoyStr = useMemo(() => {
    const d = new Date();
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }, []);

  // Cliente / Tercero
  const [tipoCliente, setTipoCliente] = useState<'PUBLICO' | 'SOCIO'>('PUBLICO');
  const [nitTercero, setNitTercero] = useState('');
  const [beneficiario, setBeneficiario] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [plazo, setPlazo] = useState('');
  const [origen, setOrigen] = useState('');
  const [separaIva, setSeparaIva] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  // Socios y vehículo
  const [busquedaSocio, setBusquedaSocio] = useState('');
  const [socio, setSocio] = useState<Socio | null>(null);
  const [idvehiculo, setIdvehiculo] = useState<string>('');

  // ── Carrito de productos POS ──────────────────────────────────────────────
  const [lineas, setLineas] = useState<LineaPOS[]>([]);

  // ── Forma de pago POS ────────────────────────────────────────────────────
  const [formapago, setFormapago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [tipoMetodoPago, setTipoMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO_SOCIO'>('EFECTIVO');
  const [codigoCajaBco, setCodigoCajaBco] = useState('110505'); // 110505 Caja General
  const [numeroDocumentoPago, setNumeroDocumentoPago] = useState('');
  const [valorEntregado, setValorEntregado] = useState<string>('');

  // Modal de errores y recibo
  const [mostrarModalErrores, setMostrarModalErrores] = useState(false);
  const [recibo, setRecibo] = useState<any | null>(null);

  const inputValorEntregadoRef = useRef<HTMLInputElement>(null);

  // Carga de métodos de pago desde API
  const metodos = useQuery({
    queryKey: ['almacen', 'metodos'],
    queryFn: almacenApi.metodosPago,
    staleTime: 300_000,
  });

  const socios = useQuery({
    queryKey: ['almacen', 'socios', busquedaSocio],
    queryFn: () => almacenApi.socios(busquedaSocio),
    enabled: tipoCliente === 'SOCIO' && !socio && busquedaSocio.trim().length >= 2,
  });

  const esSocio = tipoCliente === 'SOCIO';

  // Actualizar beneficiario y NIT según tipo de cliente
  const handleCambiarTipoCliente = (nuevoTipo: 'PUBLICO' | 'SOCIO') => {
    setTipoCliente(nuevoTipo);
    if (nuevoTipo === 'PUBLICO') {
      setSocio(null);
      setIdvehiculo('');
      setNitTercero('222222222222');
      setBeneficiario('VENTAS');
      setPlazo('0');
      setFormapago('CONTADO');
      setTipoMetodoPago('EFECTIVO');
      setCodigoCajaBco('110505');
    } else {
      setNitTercero('');
      setBeneficiario('');
      setPlazo('30');
    }
  };

  const handleSeleccionarSocio = (s: Socio) => {
    setSocio(s);
    setNitTercero(s.documento);
    setBeneficiario(`${s.nombre} ${s.apellido}`.trim());
    setIdvehiculo(s.vehiculos.length === 1 ? String(s.vehiculos[0].idvehiculo) : '');
  };

  // Cálculo de totales detallados por línea y totales generales
  const { lineasCalculadas, totalBruto, totalIva, totalDescuento, totalNeto, totalItems } = useMemo(() => {
    let sumBruto = 0;
    let sumIva = 0;
    let sumDcto = 0;
    let sumNeto = 0;
    let sumItems = 0;

    const calculadas = lineas.map((l, index) => {
      const pLista = precioLista(l.producto, esSocio);
      const precioBaseSinDcto = l.precio ?? pLista;
      const pctDcto = Math.min(100, Math.max(0, l.descuentoPorc || 0));
      const factorDcto = 1 - pctDcto / 100;
      const precioEfectivo = precioBaseSinDcto * factorDcto;

      const tasaIva = Number(l.producto.porcentajeiva || 19) / 100;
      // En Colombia el precio venta es IVA incluido:
      // precioSinIva = precioEfectivo / (1 + tasaIva)
      const precioSinIvaUnitario = precioEfectivo / (1 + tasaIva);
      const brutoLinea = precioSinIvaUnitario * l.cantidad;
      const ivaLinea = brutoLinea * tasaIva;
      const netoLinea = brutoLinea + ivaLinea; // = precioEfectivo * cantidad
      const ahorroDcto = (precioBaseSinDcto * (pctDcto / 100)) * l.cantidad;

      sumBruto += brutoLinea;
      sumIva += ivaLinea;
      sumDcto += ahorroDcto;
      sumNeto += netoLinea;
      sumItems += l.cantidad;

      return {
        ...l,
        index: index + 1,
        precioLista: pLista,
        precioEfectivo,
        tasaIvaPorc: Number(l.producto.porcentajeiva || 19),
        bruto: brutoLinea,
        iva: ivaLinea,
        neto: netoLinea,
        ahorroDcto,
      };
    });

    return {
      lineasCalculadas: calculadas,
      totalBruto: Math.round(sumBruto * 100) / 100,
      totalIva: Math.round(sumIva * 100) / 100,
      totalDescuento: Math.round(sumDcto * 100) / 100,
      totalNeto: Math.round(sumNeto),
      totalItems: sumItems,
    };
  }, [lineas, esSocio]);

  // Vueltos / Cambio
  const numEntregado = Number(valorEntregado.replace(/\D/g, '')) || 0;
  const cambio = numEntregado >= totalNeto ? numEntregado - totalNeto : 0;
  const disponibleCredito = socio ? Number(socio.cupocredito) - Number(socio.saldo) : 0;

  // Acciones en la grilla de productos
  const agregarProducto = (p: Producto) => {
    setLineas((prev) => {
      const idx = prev.findIndex((l) => l.producto.idproducto === p.idproducto);
      if (idx >= 0) {
        return prev.map((l, j) => (j === idx ? { ...l, cantidad: l.cantidad + 1 } : l));
      }
      return [...prev, { producto: p, cantidad: 1, precio: null, descuentoPorc: 0 }];
    });
  };

  const cambiarLinea = (id: Id, cambios: Partial<LineaPOS>) => {
    setLineas((prev) =>
      prev.map((l) => (l.producto.idproducto === id ? { ...l, ...cambios } : l))
    );
  };

  const quitarLinea = (id: Id) => {
    setLineas((prev) => prev.filter((l) => l.producto.idproducto !== id));
  };

  // Cargar datos por defecto con la tecla F2 (o botón en pantalla)
  const cargarDatosF2 = useCallback(() => {
    setTipDoc('FE');
    setPrefijo('ESCO');
    setNumeroSist('AUTO');
    setFechaDoc(fechaHoyStr);
    setSecuencia('01');
    setEstadoDoc('N');
    setDetalleGeneral('VENTAS');
    setMoneda('PESO');
    setCentroCostos('1105');
    setRefContable('0');

    setTipoCliente('PUBLICO');
    setNitTercero('222222222222');
    setBeneficiario('VENTAS');
    setVendedor(user?.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : 'Juanito Perez');
    setPlazo('0');
    setOrigen('CAJA');
    setSeparaIva(true);
    setCodigoCajaBco('110505');
    m.ok('Datos de venta cargados con éxito (F2)');
  }, [fechaHoyStr, user, m]);

  const limpiar = useCallback(() => {
    setLineas([]);
    setSocio(null);
    setIdvehiculo('');
    setBusquedaSocio('');
    setTipDoc('');
    setPrefijo('');
    setNumeroSist('');
    setFechaDoc('');
    setSecuencia('');
    setEstadoDoc('');
    setDetalleGeneral('');
    setMoneda('');
    setCentroCostos('');
    setRefContable('');
    setTipoCliente('PUBLICO');
    setNitTercero('');
    setBeneficiario('');
    setVendedor('');
    setPlazo('');
    setOrigen('');
    setSeparaIva(false);
    setObservaciones('');
    setFormapago('CONTADO');
    setTipoMetodoPago('EFECTIVO');
    setCodigoCajaBco('110505');
    setNumeroDocumentoPago('');
    setValorEntregado('');
  }, []);

  // Validación de errores
  const sinStock = lineas.filter((l) => l.cantidad > Number(l.producto.stock ?? 0));
  const cajaPos = useTurnoCajaPos();
  const errores: string[] = [];
  if (cajaPos.estado !== 'abierto') errores.push('Debe abrir la caja del día antes de vender');
  if (!lineas.length) errores.push('No hay productos en la venta');
  if (esSocio && !socio) errores.push('Debe seleccionar el socio para la venta');
  if (formapago === 'CREDITO' && !esSocio) errores.push('Las ventas a crédito solo aplican para socios');
  if (formapago === 'CREDITO' && socio && !socio.creditoactivo) errores.push('El socio no tiene crédito activo habilitado');
  if (formapago === 'CREDITO' && socio?.creditoactivo && totalNeto > disponibleCredito) {
    errores.push(`El total (${money(totalNeto)}) excede el cupo disponible (${money(disponibleCredito)})`);
  }
  if (sinStock.length) {
    errores.push(`Stock insuficiente en: ${sinStock.map((l) => l.producto.nombre).join(', ')}`);
  }
  if (lineas.some((l) => l.cantidad <= 0)) errores.push('Hay productos con cantidad menor o igual a cero');

  // Mutación para registrar la venta
  const vender = useMutation({
    mutationFn: () => {
      // Método de pago id compatible con backend
      let idmetodo: number | undefined;
      if (formapago === 'CONTADO') {
        const metodoCoincidente = (metodos.data ?? []).find((m) => {
          if (tipoMetodoPago === 'EFECTIVO') return m.nombre.toLowerCase().includes('efectivo');
          if (tipoMetodoPago === 'TARJETA') return m.nombre.toLowerCase().includes('tarjeta');
          if (tipoMetodoPago === 'TRANSFERENCIA') return m.nombre.toLowerCase().includes('transf') || m.nombre.toLowerCase().includes('banc');
          return true;
        });
        idmetodo = metodoCoincidente ? Number(metodoCoincidente.idmetodopago) : Number(metodos.data?.[0]?.idmetodopago ?? 1);
      }

      return almacenApi.registrarVenta({
        idbodega: idbodegaOperacion,
        tipocliente: tipoCliente,
        formapago,
        idmetodopago: idmetodo,
        idusuariocliente: socio?.idusuario,
        idvehiculo: idvehiculo ? Number(idvehiculo) : undefined,
        nombrecliente: esSocio ? undefined : (beneficiario || 'VENTAS'),
        documentocliente: esSocio ? undefined : (nitTercero || '222222222222'),
        tipodocumentocliente: 'CC',
        items: lineasCalculadas.map((l) => ({
          idproducto: l.producto.idproducto,
          cantidad: l.cantidad,
          preciounitario: l.precioEfectivo, // Precio acordado con descuento aplicado
        })),
        // Encabezado POS: se guarda en columnas propias de la venta.
        observacion: [
          numeroDocumentoPago ? `Doc. pago: ${numeroDocumentoPago}` : '',
          observaciones,
        ].filter(Boolean).join(' | ') || undefined,
        centrocosto: centroCostos || undefined,
        referenciacontable: refContable || undefined,
        origen: origen || 'CAJA',
        plazodias: plazo !== '' ? Number(plazo) : undefined,
      });
    },
    onSuccess: (venta) => {
      setRecibo({
        ...venta,
        tipodoc: tipDoc || 'FE',
        prefijo: prefijo || 'ESCO',
        vendedor: vendedor || 'Cajero',
        cambio,
        valorentregado: numEntregado || totalNeto,
        formapagonombre: formapago === 'CREDITO' ? 'Crédito Socio' : tipoMetodoPago,
      });
      m.ok(`Venta ${venta.consecutivo} registrada exitosamente por ${money(venta.total)}`);
      limpiar();
      qc.invalidateQueries({ queryKey: ['almacen'] });
    },
    onError: (e) => m.err(e, 'No se pudo registrar la venta'),
  });

  // Atajos de teclado ERP: F2 (Cargar Datos), F6 (Nuevo), F7 (Pagar), F8 (Grabar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        cargarDatosF2();
      } else if (e.key === 'F6') {
        e.preventDefault();
        limpiar();
      } else if (e.key === 'F7') {
        e.preventDefault();
        inputValorEntregadoRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (errores.length === 0 && lineas.length > 0 && !vender.isPending) {
          vender.mutate();
        } else {
          setMostrarModalErrores(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cargarDatosF2, limpiar, errores, lineas, vender]);

  // Apertura diaria de caja: sin turno abierto hoy, el POS muestra la apertura en lugar de la venta.
  if (cajaPos.estado !== 'abierto' || !cajaPos.resumen) {
    return (
      <Layout>
        <AperturaCajaPos estado={cajaPos.estado} resumen={cajaPos.resumen} error={cajaPos.error} />
      </Layout>
    );
  }
  const turnoCaja = cajaPos.resumen.turno;

  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ── BARRA SUPERIOR DE ACCIONES Y ATAJOS ERP (COLORES INSTITUCIONALES COOTRANAR) ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0D3B8E 0%, #082559 100%)',
            borderRadius: '8px',
            border: '1px solid #092c6b',
            borderTop: '3px solid #dc2626',
            padding: '10px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: '0 4px 14px rgba(13, 59, 142, 0.25)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Logo Cootranar Badge */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 18,
                color: '#fff',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
              }}
            >
              C
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff' }}>
                <span>Ventas POS</span>
                <span style={{ fontSize: '11px', background: '#dc2626', padding: '2px 8px', borderRadius: 4, fontWeight: 700, color: '#ffffff' }}>
                  Cootranar
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#bfdbfe' }}>
                {turnoCaja.codigocaja} · {bodegaActual?.nombre || 'Bodega Principal'}
              </div>
            </div>
          </div>

          <TurnoCajaChip resumen={cajaPos.resumen} />

          {/* Botones de función ERP Cootranar (F2, F5 - F8) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={cargarDatosF2}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid #facc15',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(250, 204, 21, 0.3)',
                transition: 'background 0.15s',
              }}
              title="Atajo: Presione F2 para llenar los datos por defecto"
            >
              <span style={{ background: '#facc15', color: '#713f12', padding: '1px 6px', borderRadius: 3, fontSize: '10px', fontWeight: 900 }}>F2</span>
              <span>Cargar Datos</span>
            </button>

            <button
              type="button"
              onClick={() => {}}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              title="Atajo: F5 para ver detalle"
            >
              <span style={{ background: '#ffffff', color: BLUE, padding: '1px 5px', borderRadius: 3, fontSize: '10px', fontWeight: 900 }}>F5</span>
              <span>Detalle</span>
            </button>

            <button
              type="button"
              onClick={limpiar}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              title="Atajo: F6 para limpiar y preparar nueva venta"
            >
              <span style={{ background: '#ffffff', color: BLUE, padding: '1px 5px', borderRadius: 3, fontSize: '10px', fontWeight: 900 }}>F6</span>
              <span>Nuevo</span>
            </button>

            <button
              type="button"
              onClick={() => inputValorEntregadoRef.current?.focus()}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              title="Atajo: F7 para ingresar pago"
            >
              <span style={{ background: '#f59e0b', color: '#451a03', padding: '1px 5px', borderRadius: 3, fontSize: '10px', fontWeight: 900 }}>F7</span>
              <span>Pagar</span>
            </button>

            <button
              type="button"
              disabled={errores.length > 0 || !lineas.length || vender.isPending}
              onClick={() => vender.mutate()}
              style={{
                background: errores.length === 0 && lineas.length > 0 ? '#16a34a' : 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: errores.length === 0 && lineas.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: errores.length === 0 && lineas.length > 0 ? '0 2px 8px rgba(22, 163, 74, 0.4)' : 'none',
              }}
              title="Atajo: F8 para grabar y emitir factura"
            >
              <span style={{ background: '#ffffff', color: '#16a34a', padding: '1px 5px', borderRadius: 3, fontSize: '10px', fontWeight: 900 }}>F8</span>
              <span>{vender.isPending ? 'Grabando…' : 'Grabar'}</span>
            </button>

            {/* Chip de Errores / Estado */}
            <button
              type="button"
              onClick={() => setMostrarModalErrores(true)}
              style={{
                background: errores.length > 0 ? '#dc2626' : '#16a34a',
                border: 'none',
                color: '#fff',
                padding: '5px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                {errores.length > 0 ? 'error' : 'check_circle'}
              </span>
              <span>{errores.length > 0 ? `${errores.length} Errores` : 'Venta Válida'}</span>
            </button>
          </div>
        </div>

        {/* ── ENCABEZADO OFICIAL POS (EXACTO COMO EN EL MILENIUM FINANCIERO) ── */}
        <Card style={{ margin: 0 }}>
          <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px 12px', alignItems: 'flex-end' }}>
              <div>
                <label style={labelPosStyle}>Tip. Doc</label>
                <select
                  value={tipDoc}
                  onChange={(e) => setTipDoc(e.target.value as 'FE' | 'POS')}
                  style={{ ...inputPosStyle, fontWeight: 700, color: BLUE }}
                >
                  <option value="">—</option>
                  <option value="FE">FE (Factura Elec.)</option>
                  <option value="POS">POS (Ticket)</option>
                </select>
              </div>

              <div>
                <label style={labelPosStyle}>Prefijo</label>
                <input
                  value={prefijo}
                  placeholder="—"
                  onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
                  style={{ ...inputPosStyle, width: '100%', fontWeight: 700 }}
                  maxLength={6}
                />
              </div>

              <div>
                <label style={labelPosStyle}>Número Sist.</label>
                <input value={numeroSist} placeholder="—" readOnly style={{ ...readonlyPosStyle, textAlign: 'center', color: '#0369a1' }} />
              </div>

              <div>
                <label style={labelPosStyle}>Fecha</label>
                <input value={fechaDoc} placeholder="DD/MM/AAAA" readOnly style={{ ...readonlyPosStyle, textAlign: 'center' }} />
              </div>

              <div>
                <label style={labelPosStyle}>Sec.</label>
                <input
                  value={secuencia}
                  placeholder="—"
                  onChange={(e) => setSecuencia(e.target.value)}
                  style={{ ...inputPosStyle, textAlign: 'center', width: '100%' }}
                  maxLength={4}
                />
              </div>

              <div>
                <label style={labelPosStyle}>Estado</label>
                <input value={estadoDoc} placeholder="—" readOnly style={{ ...readonlyPosStyle, textAlign: 'center' }} />
              </div>

              <div style={{ minWidth: '120px' }}>
                <label style={labelPosStyle}>Detalle General</label>
                <input
                  value={detalleGeneral}
                  placeholder="—"
                  onChange={(e) => setDetalleGeneral(e.target.value)}
                  style={{ ...inputPosStyle, width: '100%' }}
                />
              </div>

              <div>
                <label style={labelPosStyle}>Moneda</label>
                <input value={moneda} placeholder="—" readOnly style={{ ...readonlyPosStyle, textAlign: 'center' }} />
              </div>

              <div>
                <label style={labelPosStyle}>Centro</label>
                <input
                  value={centroCostos}
                  placeholder="—"
                  onChange={(e) => setCentroCostos(e.target.value)}
                  style={{ ...inputPosStyle, textAlign: 'center', width: '100%' }}
                />
              </div>

              <div>
                <label style={labelPosStyle}>Ref. Cont.</label>
                <input
                  value={refContable}
                  placeholder="—"
                  onChange={(e) => setRefContable(e.target.value)}
                  style={{ ...inputPosStyle, textAlign: 'center', width: '100%' }}
                />
              </div>
            </div>

            {/* Segunda fila: Tercero, Beneficiario, Vendedor, Plazo, Origen, Separa IVA */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px 12px',
                alignItems: 'flex-end',
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px dashed #e2e8f0',
              }}
            >
              <div>
                <label style={labelPosStyle}>Cliente Crédito</label>
                <select
                  value={tipoCliente}
                  onChange={(e) => handleCambiarTipoCliente(e.target.value as 'PUBLICO' | 'SOCIO')}
                  style={{ ...inputPosStyle, fontWeight: 700 }}
                >
                  <option value="PUBLICO">No (Público General)</option>
                  <option value="SOCIO">Sí (Socio Cootranar)</option>
                </select>
              </div>

              <div>
                <label style={labelPosStyle}>Sede / Bodega</label>
                <BodegaSelector permitirTodas={false} />
              </div>

              <div>
                <label style={labelPosStyle}>Nit Tercero</label>
                <input
                  value={nitTercero}
                  onChange={(e) => setNitTercero(e.target.value)}
                  placeholder="Presione F2"
                  style={{ ...inputPosStyle, width: '100%', fontWeight: 700 }}
                />
              </div>

              <div style={{ minWidth: '180px' }}>
                <label style={labelPosStyle}>Beneficiario</label>
                <input
                  value={beneficiario}
                  onChange={(e) => setBeneficiario(e.target.value)}
                  placeholder="Presione F2"
                  style={{ ...inputPosStyle, width: '100%', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={labelPosStyle}>Vendedor</label>
                <input
                  value={vendedor}
                  placeholder="—"
                  onChange={(e) => setVendedor(e.target.value)}
                  style={{ ...inputPosStyle, width: '100%' }}
                />
              </div>

              <div style={{ maxWidth: '80px' }}>
                <label style={labelPosStyle}>Plazo (Días)</label>
                <input
                  type="number"
                  min={0}
                  value={plazo}
                  placeholder="0"
                  onChange={(e) => setPlazo(e.target.value)}
                  style={{ ...inputPosStyle, textAlign: 'center', width: '100%' }}
                />
              </div>

              <div style={{ maxWidth: '90px' }}>
                <label style={labelPosStyle}>Origen</label>
                <select value={origen} onChange={(e) => setOrigen(e.target.value)} style={inputPosStyle}>
                  <option value="">—</option>
                  <option value="CAJA">CAJA</option>
                  <option value="ALMACEN">ALMACÉN</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6 }}>
                <input
                  type="checkbox"
                  id="chkSeparaIva"
                  checked={separaIva}
                  onChange={(e) => setSeparaIva(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="chkSeparaIva" style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                  ¿Separa IVA?
                </label>
              </div>
            </div>

            {/* Tercera fila: Observaciones y Búsqueda de Socio si aplica */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, alignItems: 'center' }}>
              <div style={{ flex: '2 1 300px' }}>
                <label style={labelPosStyle}>Observaciones</label>
                <input
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas internas de la factura, orden de trabajo o remisión..."
                  style={{ ...inputPosStyle, width: '100%' }}
                />
              </div>

              {esSocio && (
                <div style={{ flex: '1 1 260px' }}>
                  <label style={labelPosStyle}>Asociar Socio y Placa</label>
                  {socio ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', padding: '4px 8px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a' }}>
                        {socio.nombre} {socio.apellido} (CC {socio.documento})
                      </span>
                      {socio.vehiculos.length > 0 && (
                        <select
                          value={idvehiculo}
                          onChange={(e) => setIdvehiculo(e.target.value)}
                          style={{ ...inputPosStyle, height: '26px', fontSize: '11px', padding: '2px 4px' }}
                        >
                          <option value="">— Placa —</option>
                          {socio.vehiculos.map((v) => (
                            <option key={v.idvehiculo} value={v.idvehiculo}>
                              {v.placa}{v.numeromovil ? ` (Móvil ${v.numeromovil})` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => { setSocio(null); setIdvehiculo(''); }}
                        style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px', fontWeight: 900 }}
                        title="Cambiar socio"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        value={busquedaSocio}
                        onChange={(e) => setBusquedaSocio(e.target.value)}
                        placeholder="Buscar por cédula, nombre o placa..."
                        style={{ ...inputPosStyle, width: '100%' }}
                      />
                      {socios.isFetching && <span style={{ fontSize: '10px', color: '#64748b' }}>Buscando socios…</span>}
                      {(socios.data ?? []).length > 0 && !socio && (
                        <div
                          style={{
                            position: 'absolute',
                            zIndex: 40,
                            background: '#fff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            maxHeight: 180,
                            overflowY: 'auto',
                            marginTop: 2,
                            width: 280,
                          }}
                        >
                          {(socios.data ?? []).map((s: Socio) => (
                            <div
                              key={s.idusuario}
                              onClick={() => handleSeleccionarSocio(s)}
                              style={{
                                padding: '6px 10px',
                                fontSize: '11.5px',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                            >
                              <div style={{ fontWeight: 700 }}>{s.nombre} {s.apellido}</div>
                              <div style={{ color: '#64748b', fontSize: '10.5px' }}>
                                CC {s.documento} · {s.vehiculos.map((v) => v.placa).join(', ') || 'Sin bus'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── BARRA DE BÚSQUEDA Y LECTURA DE PRODUCTOS ── */}
          <div style={{ padding: '12px 18px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
            {!cargando && !idbodegaOperacion ? (
              <p style={{ color: '#b91c1c', fontSize: 13, margin: 0 }}>
                No hay una bodega activa seleccionada para vender.
              </p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <ProductoPicker idbodega={idbodegaOperacion} onSelect={agregarProducto} autoFocus />
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                  Escanee código de barras o busque por referencia / nombre
                </div>
              </div>
            )}
          </div>

          {/* ── DETALLE / TABLA DE PRODUCTOS (GRID POS COMO EN LA FOTO) ── */}
          <div style={{ overflowX: 'auto', maxHeight: '380px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '940px', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '38px', fontWeight: 800 }}>No</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '45px', fontWeight: 800 }}>Bdg</th>
                  <th style={{ padding: '7px 8px', textAlign: 'left', width: '130px', fontWeight: 800 }}>PLU / Cód. Barras</th>
                  <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 800 }}>Referencia del Producto</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '75px', fontWeight: 800 }}>Cant</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '55px', fontWeight: 800 }}>Um</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', width: '110px', fontWeight: 800 }}>Precio Venta</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '70px', fontWeight: 800 }}>% Dcto</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '60px', fontWeight: 800 }}>% Iva</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', width: '105px', fontWeight: 800 }}>Bruto</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', width: '115px', fontWeight: 800 }}>Valor Neto</th>
                  <th style={{ padding: '7px 6px', textAlign: 'center', width: '38px' }}></th>
                </tr>
              </thead>
              <tbody>
                {!lineasCalculadas.length ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', margin: '0 auto 8px', color: '#cbd5e1' }}>
                        barcode_scanner
                      </span>
                      No hay artículos en la venta. Ingrese un código o use el buscador de repuestos.
                    </td>
                  </tr>
                ) : (
                  lineasCalculadas.map((l) => {
                    const stock = Number(l.producto.stock ?? 0);
                    const sinExistencia = l.cantidad > stock;

                    return (
                      <tr
                        key={l.producto.idproducto}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: sinExistencia ? '#fff1f2' : '#ffffff',
                        }}
                      >
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                          {l.index}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                          {String(idbodegaOperacion || '01').padStart(2, '0')}
                        </td>
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#0f172a' }}>
                          {l.producto.codigobarras || l.producto.codigo || '—'}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            <span style={{ color: BLUE, fontFamily: 'monospace', marginRight: 6 }}>{l.producto.codigo}</span>
                            {l.producto.nombre}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            Stock Disp: <b style={{ color: sinExistencia ? '#dc2626' : '#15803d' }}>{stock}</b> · {l.producto.ubicacion ? `Ubicación: ${l.producto.ubicacion}` : 'Sin estante'}
                          </div>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min={0.01}
                            step="any"
                            value={l.cantidad}
                            onChange={(e) => cambiarLinea(l.producto.idproducto, { cantidad: Number(e.target.value) })}
                            style={{
                              ...inputPosStyle,
                              width: '65px',
                              textAlign: 'center',
                              fontWeight: 700,
                              borderColor: sinExistencia ? '#ef4444' : '#cbd5e1',
                            }}
                            aria-label={`Cantidad ${l.producto.nombre}`}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                          {l.producto.unidadmedida || 'UND'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <input
                            type="number"
                            min={0}
                            max={l.precioLista}
                            value={l.precio ?? l.precioLista}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              cambiarLinea(l.producto.idproducto, { precio: val === l.precioLista ? null : Math.min(val, l.precioLista) });
                            }}
                            style={{ ...inputPosStyle, width: '100px', textAlign: 'right', fontWeight: 700 }}
                            title={`Precio Lista: ${money(l.precioLista)}`}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={l.descuentoPorc || 0}
                            onChange={(e) => cambiarLinea(l.producto.idproducto, { descuentoPorc: Number(e.target.value) })}
                            style={{ ...inputPosStyle, width: '55px', textAlign: 'center' }}
                            placeholder="0"
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                          {l.tasaIvaPorc}%
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                          {money(l.bruto)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#0f172a' }}>
                          {money(l.neto)}
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => quitarLinea(l.producto.idproducto)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title="Quitar de la lista"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── PANEL INFERIOR: FORMAS DE PAGO (IZQ) Y TOTALES POS (DER) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
          {/* Formas de Pago POS (Izquierda - Estilo Milenium) */}
          <Card style={{ margin: 0 }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 800, fontSize: '13px', color: '#1e293b' }}>
              Formas de Pago
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '30px' }}>No</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Forma Pago</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '100px' }}>Código Caja/Bco</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '120px' }}>Número Documento</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', width: '110px' }}>Valor Entregado</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', width: '110px' }}>Valor Cancelado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>1</td>
                      <td style={{ padding: '8px' }}>
                        <select
                          value={tipoMetodoPago}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setTipoMetodoPago(val);
                            if (val === 'EFECTIVO') setCodigoCajaBco('110505');
                            else if (val === 'TARJETA') setCodigoCajaBco('111005');
                            else if (val === 'TRANSFERENCIA') setCodigoCajaBco('112005');
                            else if (val === 'CREDITO_SOCIO') {
                              setCodigoCajaBco('130505');
                              setFormapago('CREDITO');
                            }
                            if (val !== 'CREDITO_SOCIO') setFormapago('CONTADO');
                          }}
                          style={{ ...inputPosStyle, width: '100%' }}
                        >
                          <option value="EFECTIVO">01 - Efectivo</option>
                          <option value="TARJETA">02 - Tarjeta Débito/Crédito</option>
                          <option value="TRANSFERENCIA">03 - Transferencia / Bancolombia</option>
                          {esSocio && <option value="CREDITO_SOCIO">04 - Crédito Socio</option>}
                        </select>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          value={codigoCajaBco}
                          onChange={(e) => setCodigoCajaBco(e.target.value)}
                          style={{ ...inputPosStyle, width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          value={numeroDocumentoPago}
                          onChange={(e) => setNumeroDocumentoPago(e.target.value)}
                          placeholder="Voucher / Transf"
                          style={{ ...inputPosStyle, width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <input
                          ref={inputValorEntregadoRef}
                          type="text"
                          value={valorEntregado}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setValorEntregado(raw ? money(raw) : '');
                          }}
                          placeholder={money(totalNeto)}
                          style={{ ...inputPosStyle, width: '100%', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800 }}>
                        {money(totalNeto)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Botones de montos rápidos para efectivo */}
              {tipoMetodoPago === 'EFECTIVO' && totalNeto > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Pago exacto / sugerido:</span>
                  {[totalNeto, 10000, 20000, 50000, 100000].map((v) => {
                    if (v < totalNeto && v !== totalNeto) return null;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValorEntregado(money(v))}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        {money(v)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Estado de crédito socio si aplica */}
              {esSocio && socio && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#eff6ff', borderRadius: 6, border: '1px solid #dbeafe', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cupo Total Crédito: <b>{money(socio.cupocredito)}</b></span>
                    <span>Deuda Actual: <b style={{ color: '#dc2626' }}>{money(socio.saldo)}</b></span>
                    <span>Disponible: <b style={{ color: disponibleCredito >= totalNeto ? '#16a34a' : '#dc2626' }}>{money(disponibleCredito)}</b></span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Consola de Totales POS (Derecha - Colores Institucionales Cootranar) */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0D3B8E 0%, #061c47 100%)',
              borderRadius: '8px',
              border: '1px solid #092c6b',
              borderTop: '3px solid #dc2626',
              padding: '16px 20px',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(13, 59, 142, 0.25)',
            }}
          >
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: 6 }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bruto:</span>
                <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'monospace', color: '#ffffff' }}>
                  {money(totalBruto)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: 6 }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Iva:</span>
                <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'monospace', color: '#ffffff' }}>
                  {money(totalIva)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: 6 }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fef08a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Descuento:</span>
                <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'monospace', color: '#facc15' }}>
                  {money(totalDescuento)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, paddingBottom: 4 }}>
                <span style={{ fontSize: '19px', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total:</span>
                <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'monospace', color: '#4ade80' }}>
                  {money(totalNeto)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed rgba(255, 255, 255, 0.3)', paddingTop: 8 }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#fde047', textTransform: 'uppercase' }}>Cambio (Vueltos):</span>
                <span style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: cambio > 0 ? '#facc15' : '#93c5fd' }}>
                  {money(cambio)}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button
                type="button"
                disabled={errores.length > 0 || !lineas.length || vender.isPending}
                onClick={() => vender.mutate()}
                style={{
                  flex: 1,
                  background: errores.length === 0 && lineas.length > 0 ? '#16a34a' : 'rgba(255, 255, 255, 0.15)',
                  border: errores.length === 0 && lineas.length > 0 ? '1px solid #15803d' : '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: 6,
                  padding: '12px 16px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: errores.length === 0 && lineas.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: errores.length === 0 && lineas.length > 0 ? '0 4px 12px rgba(22, 163, 74, 0.4)' : 'none',
                }}
              >
                <span className="material-symbols-outlined">receipt_long</span>
                <span>{vender.isPending ? 'Emitiendo Factura...' : formapago === 'CREDITO' ? 'Grabar Venta a Crédito' : 'Cobrar y Facturar (F8)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── BARRA INFERIOR DE ESTADO (TM / COOTRANAR LTDA / MES Y AÑO) ── */}
        <div
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            padding: '6px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: '#475569',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          <div>{turnoCaja.caja} · TURNO #{turnoCaja.idturno} · {totalItems} {totalItems === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'}</div>
          <div style={{ letterSpacing: '0.06em', color: BLUE }}>COOTRANAR LTDA. — SISTEMA POS DE ALMACÉN</div>
          <div>{new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
        </div>
      </div>

      {/* ── MODAL DE ERRORES / ADVERTENCIAS ── */}
      {mostrarModalErrores && (
        <Modal titulo="Estado de Validación de Venta POS" onClose={() => setMostrarModalErrores(false)} ancho={450}>
          <div>
            {errores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#16a34a' }}>check_circle</span>
                <p style={{ fontWeight: 800, fontSize: 16, margin: '8px 0 4px', color: '#0f172a' }}>Todos los datos son correctos</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Puede presionar F8 o el botón «Grabar» para registrar la venta.</p>
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 700, margin: '0 0 10px' }}>
                  Por favor complete los siguientes requisitos antes de grabar la venta:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '12.5px', color: '#991b1b', display: 'grid', gap: 6 }}>
                  {errores.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Btn onClick={() => setMostrarModalErrores(false)}>Cerrar</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL DE RECIBO / FACTURA EMITIDA EXITOSAMENTE ── */}
      {recibo && (
        <Modal titulo={`Venta ${recibo.consecutivo} Registrada`} onClose={() => setRecibo(null)} ancho={460}>
          <div style={{ textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#16a34a' }}>task_alt</span>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>{money(recibo.total)}</div>
            <div style={{ fontSize: 13, color: '#64748b', margin: '4px 0 12px' }}>
              {recibo.nombrecliente || 'Consumidor final'} · {recibo.formapagonombre || recibo.formapago}
            </div>

            {recibo.cambio > 0 && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '8px', margin: '8px 0', fontSize: '13px', fontWeight: 700, color: '#854d0e' }}>
                Cambio a entregar al cliente: {money(recibo.cambio)}
              </div>
            )}

            <div
              style={{
                fontSize: 12.5,
                marginBottom: 16,
                padding: '10px 12px',
                borderRadius: 8,
                textAlign: 'left',
                background: recibo.estadofactura === 'APROBADA' ? '#f0fdf4' : '#fff7ed',
                color: recibo.estadofactura === 'APROBADA' ? '#15803d' : '#b45309',
              }}
            >
              {recibo.estadofactura === 'APROBADA' ? (
                <>Factura electrónica <b>{recibo.numerofactura}</b> validada exitosamente por la DIAN.</>
              ) : (
                <>
                  La venta quedó grabada en el sistema. Emisión DIAN pendiente:
                  {recibo.errorfactura && <div style={{ fontSize: 11.5, marginTop: 4 }}>{recibo.errorfactura}</div>}
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Btn icon="print" onClick={() => imprimirRecibo(recibo)}>Imprimir Tirilla POS</Btn>
              <Btn variant="secondary" onClick={() => setRecibo(null)}>Nueva Venta (F6)</Btn>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
};
