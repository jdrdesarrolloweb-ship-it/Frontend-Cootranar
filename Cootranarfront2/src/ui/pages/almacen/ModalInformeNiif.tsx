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
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
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
            padding: 8px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Contenedor Modal Unificado Blanco y Moderno */}
      <div
        style={{
          width: '100%',
          maxWidth: '1150px',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
        }}
      >
        {/* Barra de Controles superior en Blanco Minimalista (no-print) */}
        <div
          className="no-print"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0D3B8E',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                inventory_2
              </span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Informe General de Inventarios NIIFS
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
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
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
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
                background: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#dcfce7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#f0fdf4')}
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
                background: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                width: 36,
                height: 36,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* Hoja de Reporte Oficial en Blanco y Limpio */}
        <div
          id="reporte-niif-impresion"
          ref={printRef}
          style={{
            background: '#ffffff',
            padding: '32px 36px',
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            fontSize: '12px',
            color: '#1e293b',
          }}
        >
          {/* Encabezado Corporativo Cootranar: Fondo Blanco con Logo */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 16,
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img
                src={logoCootranar}
                alt="Cootranar"
                style={{
                  height: '50px',
                  maxWidth: '155px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.02em' }}>
                  COOTRANAR R.L.
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  NIT 891.200.370-1 · Vigilado SuperTransporte
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                INFORME GENERAL DE INVENTARIOS NIIFS
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginTop: 2 }}>
                {fechaActual.periodo}
              </div>
            </div>
          </div>

          {/* Metadatos: Hora, Bodega y Paginación (Tarjeta Blanca / Gris neutro) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '9px 16px',
              marginBottom: 20,
              fontSize: '11.5px',
              color: '#64748b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#64748b' }}>schedule</span>
              <span>Generado: <strong style={{ color: '#0f172a' }}>{fechaActual.timestamp}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#64748b' }}>warehouse</span>
              <span>
                Bodega:{' '}
                <strong style={{ color: '#0f172a', background: '#e2e8f0', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
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
                  {/* Título de Grupo Contable Limpio */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderLeft: '4px solid #0D3B8E',
                      padding: '7px 12px',
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '12px', color: '#0f172a', letterSpacing: '0.02em' }}>
                      {grupo.nombre.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      {grupo.items.length} {grupo.items.length === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>

                  {/* Tabla de Columnas en Fondo Blanco con Cabecera Gris Neutro */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '8px 6px', width: '90px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '10.5px' }}>Referencia</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '10.5px' }}>Descripción Producto</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '110px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '10.5px' }}>Precio Unitario</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '110px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '10.5px' }}>Precio IVA Inc</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '75px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '10.5px' }}>Saldo Ant.</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '65px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '10.5px' }}>Entradas</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '65px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '10.5px' }}>Salidas</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '75px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '10.5px' }}>Nuevo Saldo</th>
                        <th style={{ padding: '8px 6px', textAlign: 'left', width: '110px', paddingLeft: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '10.5px' }}>Localización</th>
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
                              background: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                            }}
                          >
                            <td style={{ padding: '7px 6px', fontWeight: 700, color: '#0f172a' }}>
                              {it.referencia || it.codigo}
                            </td>
                            <td style={{ padding: '7px 6px', color: '#334155', fontWeight: 500 }}>
                              {it.descripcion || it.nombre}
                            </td>
                            <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#334155' }}>
                              ${pu.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#334155' }}>
                              ${pIva.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                              {sAnt.toFixed(2)}
                            </td>
                            <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: ent > 0 ? '#15803d' : '#64748b', fontWeight: ent > 0 ? 700 : 400 }}>
                              {ent > 0 ? `+${ent.toFixed(2)}` : '0.00'}
                            </td>
                            <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: sal > 0 ? '#dc2626' : '#64748b', fontWeight: sal > 0 ? 700 : 400 }}>
                              {sal > 0 ? `-${sal.toFixed(2)}` : '0.00'}
                            </td>
                            <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#0f172a' }}>
                              {nSal.toFixed(2)}
                            </td>
                            <td style={{ padding: '7px 6px', paddingLeft: '12px', color: '#64748b' }}>
                              {it.localizacion || it.ubicacion || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr
                        style={{
                          borderTop: '1px solid #cbd5e1',
                          borderBottom: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          fontWeight: 'bold',
                          fontSize: '11.5px',
                          color: '#0f172a',
                        }}
                      >
                        <td colSpan={4} style={{ padding: '8px 6px', textAlign: 'right' }}>
                          SUBTOTAL {grupo.nombre.toUpperCase()}:
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {grupo.totalSaldoAnterior.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#15803d' }}>
                          +{grupo.totalEntradas.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>
                          -{grupo.totalSalidas.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#0f172a', fontWeight: 800 }}>
                          {grupo.totalNuevoSaldo.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 6px', paddingLeft: '12px', color: '#0f172a', fontWeight: 800 }}>
                          {money(grupo.totalValor)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}

              {/* Gran Total en Tarjeta Blanca con Borde Limpio */}
              <div
                style={{
                  marginTop: 24,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '14px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: '#0D3B8E', fontSize: 20 }}>
                      receipt_long
                    </span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', letterSpacing: '0.01em' }}>
                      TOTAL GENERAL INVENTARIO NIIFS
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Consolidado oficial de existencias y valoración
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', fontSize: '12px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                      Saldo Ant.
                    </span>
                    <strong style={{ fontVariantNumeric: 'tabular-nums', color: '#0f172a', fontSize: '13px' }}>
                      {granTotal.saldoAnterior.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                      Entradas
                    </span>
                    <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>
                      +{granTotal.entradas.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                      Salidas
                    </span>
                    <strong style={{ color: '#dc2626', fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>
                      -{granTotal.salidas.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                      Nuevo Saldo
                    </span>
                    <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>
                      {granTotal.nuevoSaldo.toFixed(2)}
                    </strong>
                  </div>
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      padding: '8px 18px',
                      borderRadius: 8,
                      textAlign: 'right',
                    }}
                  >
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                      Valoración Total
                    </span>
                    <strong style={{ fontSize: '16px', color: '#0D3B8E', fontWeight: 900, display: 'block' }}>
                      {money(granTotal.valor)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
