import React, { useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { almacenApi, type Bodega } from '../../../infrastructure/services/almacenApi';
import { exportarExcel, money } from './almacenUi';

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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
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
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Barra de Controles superior (no-print) */}
      <div
        className="no-print"
        style={{
          width: '100%',
          maxWidth: '1150px',
          background: '#0f172a',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: 24 }}>
            description
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.02em' }}>
              INFORME GENERAL DE INVENTARIOS NIIFS
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {bodegaActual ? `Bodega: ${bodegaActual.nombre}` : 'Consolidado General (Todas las Bodegas)'} · {fechaActual.periodo}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={imprimir}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#0284c7',
              color: 'white',
              border: 'none',
              borderRadius: 7,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span>
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
              borderRadius: 7,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
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
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              borderRadius: 7,
              width: 34,
              height: 34,
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      {/* Hoja de Reporte Oficial (imprimible y con el estilo idéntico de la foto) */}
      <div
        id="reporte-niif-impresion"
        ref={printRef}
        style={{
          width: '100%',
          maxWidth: '1150px',
          background: 'white',
          borderRadius: '0 0 12px 12px',
          padding: '36px 40px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          fontFamily: "'Courier New', Courier, monospace, sans-serif",
          fontSize: '12px',
          color: '#000',
        }}
      >
        {/* Encabezado Corporativo Cootranar */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.08em' }}>
            COOTRANAR LTDA.
          </div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '3px 0' }}>
            INFORME GENERAL DE INVENTARIOS NIIFS
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
            {fechaActual.periodo}
          </div>
        </div>

        {/* Metadatos: Hora, Fecha y Paginación */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: '11px', borderBottom: '1px solid #ddd', paddingBottom: 6 }}>
          <span>{fechaActual.timestamp}</span>
          <span>{bodegaActual ? `BODEGA: ${bodegaActual.nombre.toUpperCase()}` : 'CONSOLIDADO GENERAL'}</span>
          <span>Pg 1</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Cargando datos de inventario NIIFS…
          </div>
        ) : filas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            No hay existencias ni movimientos en este periodo.
          </div>
        ) : (
          <div>
            {grupos.map((grupo) => (
              <div key={grupo.nombre} style={{ marginBottom: 24 }}>
                {/* Título de Grupo Contable */}
                <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: 6, textTransform: 'uppercase' }}>
                  {grupo.nombre.toUpperCase()}
                </div>

                {/* Tabla de Columnas Oficiales */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                      <th style={{ padding: '6px 4px', width: '90px' }}>Referencia</th>
                      <th style={{ padding: '6px 6px' }}>Descripcion Producto</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right', width: '110px' }}>Precio Unitario</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right', width: '110px' }}>Precio Iva Inc</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right', width: '75px' }}>Saldo Anterior</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right', width: '65px' }}>Entradas</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right', width: '65px' }}>Salidas</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right', width: '75px' }}>Nuevo Saldo</th>
                      <th style={{ padding: '6px 4px', textAlign: 'left', width: '110px', paddingLeft: '12px' }}>LOCALIZACION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.items.map((it: any) => {
                      const pu = Number(it.preciounitario || (Number(it.precioventa) / (1 + (Number(it.porcentajeiva) || 19) / 100)));
                      const pIva = Number(it.precioivainc || it.precioventa);
                      const sAnt = Number(it.saldoanterior ?? it.cantidad ?? 0);
                      const ent = Number(it.entradas ?? 0);
                      const sal = Number(it.salidas ?? 0);
                      const nSal = Number(it.nuevosaldo ?? it.cantidad ?? 0);

                      return (
                        <tr key={it.idproducto || it.codigo} style={{ borderBottom: '1px dotted #e2e8f0' }}>
                          <td style={{ padding: '5px 4px', fontWeight: 600 }}>{it.referencia || it.codigo}</td>
                          <td style={{ padding: '5px 6px' }}>{it.descripcion || it.nombre}</td>
                          <td style={{ padding: '5px 4px', textAlign: 'right' }}>
                            {pu.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '5px 4px', textAlign: 'right' }}>
                            {pIva.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '5px 4px', textAlign: 'right' }}>{sAnt.toFixed(2)}</td>
                          <td style={{ padding: '5px 4px', textAlign: 'right' }}>{ent.toFixed(2)}</td>
                          <td style={{ padding: '5px 4px', textAlign: 'right' }}>{sal.toFixed(2)}</td>
                          <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: 'bold' }}>{nSal.toFixed(2)}</td>
                          <td style={{ padding: '5px 4px', paddingLeft: '12px' }}>{it.localizacion || it.ubicacion || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold', fontSize: '11px' }}>
                      <td colSpan={4} style={{ padding: '6px 4px', textAlign: 'right' }}>
                        SUBTOTAL {grupo.nombre.toUpperCase()}:
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{grupo.totalSaldoAnterior.toFixed(2)}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{grupo.totalEntradas.toFixed(2)}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{grupo.totalSalidas.toFixed(2)}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{grupo.totalNuevoSaldo.toFixed(2)}</td>
                      <td style={{ padding: '6px 4px', paddingLeft: '12px' }}>{money(grupo.totalValor)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}

            {/* Gran Total */}
            <div
              style={{
                marginTop: 20,
                borderTop: '2px solid #000',
                borderBottom: '2px solid #000',
                padding: '8px 4px',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: '12px',
              }}
            >
              <span>TOTAL GENERAL INVENTARIO NIIFS:</span>
              <div style={{ display: 'flex', gap: 24 }}>
                <span>Saldo Ant: {granTotal.saldoAnterior.toFixed(2)}</span>
                <span>Entradas: +{granTotal.entradas.toFixed(2)}</span>
                <span>Salidas: -{granTotal.salidas.toFixed(2)}</span>
                <span>Nuevo Saldo: {granTotal.nuevoSaldo.toFixed(2)}</span>
                <span>Valoración Total: {money(granTotal.valor)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
