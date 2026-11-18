import React, { useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { almacenApi, type Bodega } from '../../../infrastructure/services/almacenApi';
import { exportarExcel, money } from './almacenUi';
import logoCootranar from '../../../assets/LOGO-COOTRANAR.png';

interface ModalInformeNiifProps {
  idbodega: number | null;
  bodegaActual: Bodega | null;
  onClose: () => void;
}

export const ModalInformeNiif: React.FC<ModalInformeNiifProps> = ({ idbodega, bodegaActual, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ['almacen', 'reporte-niif', idbodega],
    queryFn: () => almacenApi.reporteInventario(idbodega),
  });

  const fechaActual = useMemo(() => {
    const d = new Date();
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const mesNombre = meses[d.getMonth()];
    const anio = d.getFullYear();
    const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const fecha = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${anio}`;
    return {
      periodo: `${mesNombre} DE ${anio}`,
      timestamp: `${hora}, ${fecha}`,
    };
  }, []);

  // Agrupar filas por Grupo / Categoría
  const grupos = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const f of filas) {
      const g = f.grupo || f.categoria || 'MERCANCIAS GENERALES';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(f);
    }
    return Array.from(map.entries()).map(([nombre, items]) => ({
      nombre,
      items,
      totalSaldoAnterior: items.reduce((acc, it) => acc + Number(it.saldoanterior ?? it.cantidad ?? 0), 0),
      totalEntradas: items.reduce((acc, it) => acc + Number(it.entradas ?? 0), 0),
      totalSalidas: items.reduce((acc, it) => acc + Number(it.salidas ?? 0), 0),
      totalNuevoSaldo: items.reduce((acc, it) => acc + Number(it.nuevosaldo ?? it.cantidad ?? 0), 0),
      totalValor: items.reduce((acc, it) => acc + (Number(it.nuevosaldo ?? it.cantidad ?? 0) * Number(it.costopromedio ?? 0)), 0),
    }));
  }, [filas]);

  const granTotal = useMemo(() => {
    return {
      saldoAnterior: grupos.reduce((acc, g) => acc + g.totalSaldoAnterior, 0),
      entradas: grupos.reduce((acc, g) => acc + g.totalEntradas, 0),
      salidas: grupos.reduce((acc, g) => acc + g.totalSalidas, 0),
      nuevoSaldo: grupos.reduce((acc, g) => acc + g.totalNuevoSaldo, 0),
      valor: grupos.reduce((acc, g) => acc + g.totalValor, 0),
    };
  }, [grupos]);

  const exportar = async () => {
    await exportarExcel(`informe-inventarios-niifs-${new Date().toISOString().slice(0, 10)}`, [
      {
        nombre: 'Inventarios NIIFS',
        filas: filas.map((r) => ({
          Grupo: r.grupo || r.categoria || '',
          Referencia: r.referencia || r.codigo || '',
          'Descripcion Producto': r.descripcion || r.nombre || '',
          'Precio Unitario': Number(r.preciounitario || (Number(r.precioventa) / (1 + (Number(r.porcentajeiva) || 19) / 100))),
          'Precio Iva Inc': Number(r.precioivainc || r.precioventa),
          'Saldo Anterior': Number(r.saldoanterior ?? r.cantidad),
          Entradas: Number(r.entradas ?? 0),
          Salidas: Number(r.salidas ?? 0),
          'Nuevo Saldo': Number(r.nuevosaldo ?? r.cantidad),
          LOCALIZACION: r.localizacion || r.ubicacion || '',
          Bodega: r.bodega || '',
        })),
      },
    ]);
  };

  const imprimir = () => {
    window.print();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 36, 84, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #reporte-niif-impresion, #reporte-niif-impresion * {
            visibility: visible;
          }
          #reporte-niif-impresion {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 12px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Barra de Controles superior con colores corporativos Cootranar (no-print) */}
      <div
        className="no-print"
        style={{
          width: '100%',
          maxWidth: '1150px',
          background: 'linear-gradient(135deg, #0D3B8E 0%, #0b2454 100%)',
          borderBottom: '3px solid #dc2626',
          color: 'white',
          padding: '14px 22px',
          borderRadius: '14px 14px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: '0 6px 24px rgba(13, 59, 142, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#ffffff', fontSize: 22 }}>
              inventory_2
            </span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.02em', color: '#ffffff' }}>
              INFORME GENERAL DE INVENTARIOS NIIFS
            </div>
            <div style={{ fontSize: 12, color: '#bfdbfe' }}>
              {bodegaActual ? `Bodega: ${bodegaActual.nombre}` : 'Consolidado General (Todas las Bodegas)'} · {fechaActual.periodo}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={imprimir}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              color: '#0D3B8E',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              transition: 'transform 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0D3B8E' }}>print</span>
            Imprimir / PDF
          </button>
          <button
            onClick={exportar}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#15803d',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            Excel NIIFS
          </button>
          <button
            onClick={onClose}
            aria-label="Cerrar reporte"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      {/* Hoja de Reporte Oficial con Identidad Corporativa Cootranar */}
      <div
        id="reporte-niif-impresion"
        ref={printRef}
        style={{
          width: '100%',
          maxWidth: '1150px',
          background: 'white',
          borderRadius: '0 0 14px 14px',
          padding: '36px 40px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: '12px',
          color: '#1e293b',
        }}
      >
        {/* Encabezado Corporativo Cootranar con Logo y Colores Oficiales */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2.5px solid #0D3B8E',
            paddingBottom: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src={logoCootranar}
              alt="Cootranar"
              style={{
                height: '52px',
                maxWidth: '160px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0D3B8E', letterSpacing: '0.04em' }}>
                COOTRANAR R.L.
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                NIT 891.200.370-1 · Vigilado SuperTransporte
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0b2454', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              INFORME GENERAL DE INVENTARIOS NIIFS
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#dc2626', marginTop: 2 }}>
              {fechaActual.periodo}
            </div>
          </div>
        </div>

        {/* Metadatos: Hora, Bodega y Paginación */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '8px 14px',
            marginBottom: 20,
            fontSize: '11.5px',
            color: '#475569',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#0D3B8E' }}>schedule</span>
            <span>Generado: <strong style={{ color: '#0f172a' }}>{fechaActual.timestamp}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#0D3B8E' }}>warehouse</span>
            <span>
              Bodega:{' '}
              <strong style={{ color: '#0D3B8E', background: '#e0e7ff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                {bodegaActual ? bodegaActual.nombre.toUpperCase() : 'CONSOLIDADO GENERAL'}
              </strong>
            </span>
          </div>
          <div>
            <span>Página: <strong style={{ color: '#0f172a' }}>1 / 1</strong></span>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#0D3B8E', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: 12, fontWeight: 600 }}>Cargando datos de inventario NIIFS…</div>
          </div>
        ) : filas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
            No hay existencias ni movimientos en este periodo.
          </div>
        ) : (
          <div>
            {grupos.map((grupo) => (
              <div key={grupo.nombre} style={{ marginBottom: 24 }}>
                {/* Título de Grupo Contable con Estilo Corporativo */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f0f5ff',
                    borderLeft: '4px solid #0D3B8E',
                    padding: '7px 12px',
                    borderRadius: '0 6px 6px 0',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '12px', color: '#0D3B8E', letterSpacing: '0.03em' }}>
                    {grupo.nombre.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    {grupo.items.length} {grupo.items.length === 1 ? 'producto' : 'productos'}
                  </span>
                </div>

                {/* Tabla de Columnas Oficiales */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ background: '#0D3B8E', color: '#ffffff' }}>
                      <th style={{ padding: '8px 6px', width: '90px', fontWeight: 700, borderRadius: '4px 0 0 0' }}>Referencia</th>
                      <th style={{ padding: '8px 6px', fontWeight: 700 }}>Descripción Producto</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', width: '110px', fontWeight: 700 }}>Precio Unitario</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', width: '110px', fontWeight: 700 }}>Precio IVA Inc</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', width: '75px', fontWeight: 700 }}>Saldo Ant.</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', width: '65px', fontWeight: 700 }}>Entradas</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', width: '65px', fontWeight: 700 }}>Salidas</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', width: '75px', fontWeight: 700 }}>Nuevo Saldo</th>
                      <th style={{ padding: '8px 6px', textAlign: 'left', width: '110px', paddingLeft: '12px', fontWeight: 700, borderRadius: '0 4px 0 0' }}>Localización</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.items.map((it: any, idx: number) => {
                      const pu = Number(it.preciounitario || (Number(it.precioventa) / (1 + (Number(it.porcentajeiva) || 19) / 100)));
                      const pIva = Number(it.precioivainc || it.precioventa);
                      const sAnt = Number(it.saldoanterior ?? it.cantidad ?? 0);
                      const ent = Number(it.entradas ?? 0);
                      const sal = Number(it.salidas ?? 0);
                      const nSal = Number(it.nuevosaldo ?? it.cantidad ?? 0);

                      return (
                        <tr
                          key={it.idproducto || it.codigo}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                          }}
                        >
                          <td style={{ padding: '6px 6px', fontWeight: 700, color: '#0D3B8E' }}>
                            {it.referencia || it.codigo}
                          </td>
                          <td style={{ padding: '6px 6px', color: '#334155', fontWeight: 500 }}>
                            {it.descripcion || it.nombre}
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            ${pu.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            ${pIva.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                            {sAnt.toFixed(2)}
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: ent > 0 ? '#15803d' : '#64748b', fontWeight: ent > 0 ? 700 : 400 }}>
                            {ent > 0 ? `+${ent.toFixed(2)}` : '0.00'}
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: sal > 0 ? '#dc2626' : '#64748b', fontWeight: sal > 0 ? 700 : 400 }}>
                            {sal > 0 ? `-${sal.toFixed(2)}` : '0.00'}
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#0f172a' }}>
                            {nSal.toFixed(2)}
                          </td>
                          <td style={{ padding: '6px 6px', paddingLeft: '12px', color: '#64748b' }}>
                            {it.localizacion || it.ubicacion || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        borderTop: '2px solid #0D3B8E',
                        borderBottom: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        fontWeight: 'bold',
                        fontSize: '11.5px',
                        color: '#0b2454',
                      }}
                    >
                      <td colSpan={4} style={{ padding: '7px 6px', textAlign: 'right' }}>
                        SUBTOTAL {grupo.nombre.toUpperCase()}:
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {grupo.totalSaldoAnterior.toFixed(2)}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#15803d' }}>
                        +{grupo.totalEntradas.toFixed(2)}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>
                        -{grupo.totalSalidas.toFixed(2)}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#0D3B8E', fontWeight: 800 }}>
                        {grupo.totalNuevoSaldo.toFixed(2)}
                      </td>
                      <td style={{ padding: '7px 6px', paddingLeft: '12px', color: '#0D3B8E', fontWeight: 800 }}>
                        {money(grupo.totalValor)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}

            {/* Gran Total con Tarjeta Destacada Corporativa Cootranar */}
            <div
              style={{
                marginTop: 24,
                background: 'linear-gradient(135deg, #f0f5ff 0%, #e0e7ff 100%)',
                border: '2px solid #0D3B8E',
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                boxShadow: '0 4px 12px rgba(13, 59, 142, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#0D3B8E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 20 }}>
                    receipt_long
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '13px', color: '#0D3B8E', letterSpacing: '0.02em' }}>
                    TOTAL GENERAL INVENTARIO NIIFS
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    Consolidado oficial de valoración y existencias
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', fontSize: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    Saldo Ant.
                  </span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>
                    {granTotal.saldoAnterior.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    Entradas
                  </span>
                  <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                    +{granTotal.entradas.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    Salidas
                  </span>
                  <strong style={{ color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                    -{granTotal.salidas.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    Nuevo Saldo
                  </span>
                  <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {granTotal.nuevoSaldo.toFixed(2)}
                  </strong>
                </div>
                <div
                  style={{
                    background: '#0D3B8E',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: 8,
                    boxShadow: '0 2px 6px rgba(13, 59, 142, 0.25)',
                  }}
                >
                  <span style={{ fontSize: '10px', opacity: 0.9, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Valoración Total
                  </span>
                  <strong style={{ fontSize: '15px', letterSpacing: '0.02em', display: 'block' }}>
                    {money(granTotal.valor)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
