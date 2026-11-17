import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import contenidoWebApi, {
  type ContenidoWebCompleto,
  type SlideHeroWeb,
  type ItemIconoTextoWeb,
  type FlotaItemWeb,
  type OficinaEncomiendaWeb,
} from '../../../infrastructure/services/contenidoWebApi';
import { Campo, Interruptor } from '../../components/millas/ModalesConfiguracionMillas';
import {
  C,
  FONT,
  inputStyle,
  labelStyle,
  botonPrimario,
  botonSecundario,
  botonPeligro,
  botonIcono,
} from '../../components/millas/estilosMillas';

type Pestania =
  | 'home'
  | 'mision-vision'
  | 'sistema-calidad'
  | 'transporte-pasajeros'
  | 'transporte-encomiendas'
  | 'paginas-footer';

const PESTANIAS: Array<{ id: Pestania; label: string; icono: string; descripcion: string }> = [
  {
    id: 'home',
    label: 'Portada y Carrusel',
    icono: 'view_carousel',
    descripcion: 'Galería principal del Home, titulares en 3 colores y animación inicial (Splash)',
  },
  {
    id: 'mision-vision',
    label: 'Misión y Visión',
    icono: 'flag',
    descripcion: 'Encabezado de Quiénes Somos, Misión, Visión y los compromisos de mejora continua',
  },
  {
    id: 'sistema-calidad',
    label: 'Sistema de Calidad',
    icono: 'verified',
    descripcion: 'Política de calidad institucional y objetivos del Sistema de Gestión',
  },
  {
    id: 'transporte-pasajeros',
    label: 'Transporte de Pasajeros',
    icono: 'directions_bus',
    descripcion: 'Descripción del parque automotor y tarjetas de categorías de flota',
  },
  {
    id: 'transporte-encomiendas',
    label: 'Transporte de Encomiendas',
    icono: 'local_shipping',
    descripcion: 'Presentación de carga, directorio de oficinas y listado de rutas autorizadas',
  },
  {
    id: 'paginas-footer',
    label: 'Páginas y Redes',
    icono: 'public',
    descripcion: 'Encabezados de Viajes y Encomiendas, marquesina y enlaces de redes del Footer',
  },
];

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: '78px',
  resize: 'vertical',
  lineHeight: 1.45,
};

const Tarjeta = ({
  titulo,
  descripcion,
  accion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div
    style={{
      background: '#fff',
      borderRadius: '14px',
      border: `1px solid ${C.outlineVariant}`,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,53,95,0.06)',
    }}
  >
    <div
      style={{
        padding: '15px 18px',
        borderBottom: `1px solid ${C.outlineVariant}`,
        background: C.surfaceContainerLow,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: C.onSurface, fontFamily: FONT }}>
          {titulo}
        </h3>
        {descripcion && (
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.onSurfaceVariant, fontFamily: FONT }}>
            {descripcion}
          </p>
        )}
      </div>
      {accion}
    </div>
    <div style={{ padding: '18px' }}>{children}</div>
  </div>
);

const mensajeError = (err: unknown, porDefecto: string) => {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message || porDefecto;
};

export const GestionContenidoWebPage = () => {
  const [pestania, setPestania] = useState<Pestania>('home');
  const [datos, setDatos] = useState<ContenidoWebCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoSlideIdx, setSubiendoSlideIdx] = useState<number | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const avisar = (tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const res = await contenidoWebApi.obtener();
      setDatos(res.data.data);
    } catch (err) {
      setErrorCarga(mensajeError(err, 'No se pudo cargar el contenido de la plataforma web.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 5500);
    return () => clearTimeout(t);
  }, [mensaje]);

  const guardarCambios = async () => {
    if (!datos) return;
    setGuardando(true);
    try {
      const res = await contenidoWebApi.guardar(datos);
      setDatos(res.data.data);
      avisar(
        'ok',
        'Contenido web guardado correctamente. Los cambios ya están publicados en la plataforma pública.'
      );
    } catch (err) {
      avisar('error', mensajeError(err, 'No se pudieron guardar los cambios.'));
    } finally {
      setGuardando(false);
    }
  };

  const restaurarPredeterminado = async () => {
    if (
      !window.confirm(
        '¿Restaurar todos los textos e imágenes del sitio público a los valores originales de Cootranar?'
      )
    ) {
      return;
    }
    setGuardando(true);
    try {
      const res = await contenidoWebApi.restaurar();
      setDatos(res.data.data);
      avisar('ok', 'Se restauraron los contenidos originales de la plataforma pública.');
    } catch (err) {
      avisar('error', mensajeError(err, 'No se pudo restaurar el contenido predeterminado.'));
    } finally {
      setGuardando(false);
    }
  };

  // ── Helpers de edición para Home / Carrusel ────────────────────────────────
  const actualizarSlide = (idx: number, cambios: Partial<SlideHeroWeb>) => {
    if (!datos) return;
    const nuevos = datos.home.slides.map((s, i) => (i === idx ? { ...s, ...cambios } : s));
    setDatos({ ...datos, home: { ...datos.home, slides: nuevos } });
  };

  const agregarSlide = () => {
    if (!datos) return;
    const nuevo: SlideHeroWeb = {
      id: `slide-${Date.now()}`,
      claveImagen: 'bus',
      urlImagen: null,
      linea1Es: 'Nuevo titular',
      linea1En: 'New headline',
      linea2Es: 'línea destacada',
      linea2En: 'highlighted line',
      pastillaEs: 'en Cootranar.',
      pastillaEn: 'at Cootranar.',
      descripcionEs: 'Descripción de la diapositiva para los usuarios de la plataforma.',
      descripcionEn: 'Slide description for platform users.',
      activo: true,
    };
    setDatos({ ...datos, home: { ...datos.home, slides: [...datos.home.slides, nuevo] } });
  };

  const eliminarSlide = (idx: number) => {
    if (!datos) return;
    if (datos.home.slides.length <= 1) {
      avisar('error', 'El carrusel debe tener al menos una diapositiva.');
      return;
    }
    const nuevos = datos.home.slides.filter((_, i) => i !== idx);
    setDatos({ ...datos, home: { ...datos.home, slides: nuevos } });
  };

  const moverSlide = (idx: number, dir: -1 | 1) => {
    if (!datos) return;
    const destino = idx + dir;
    if (destino < 0 || destino >= datos.home.slides.length) return;
    const copia = [...datos.home.slides];
    const [item] = copia.splice(idx, 1);
    copia.splice(destino, 0, item);
    setDatos({ ...datos, home: { ...datos.home, slides: copia } });
  };

  const subirImagenSlide = async (idx: number, file?: File | null) => {
    if (!file || !datos) return;
    setSubiendoSlideIdx(idx);
    try {
      const res = await contenidoWebApi.subirImagen(file);
      actualizarSlide(idx, { claveImagen: 'custom', urlImagen: res.data.data.url });
      avisar('ok', 'Imagen subida correctamente. Recuerda pulsar "Guardar cambios" para publicarla.');
    } catch (err) {
      avisar('error', mensajeError(err, 'No se pudo subir la imagen.'));
    } finally {
      setSubiendoSlideIdx(null);
    }
  };

  // ── Helpers para listas de Quiénes Somos ───────────────────────────────────
  const actualizarCompromiso = (idx: number, cambios: Partial<ItemIconoTextoWeb>) => {
    if (!datos) return;
    const lista = datos.quienesSomos.misionVision.compromisos.map((c, i) =>
      i === idx ? { ...c, ...cambios } : c
    );
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        misionVision: { ...datos.quienesSomos.misionVision, compromisos: lista },
      },
    });
  };

  const agregarCompromiso = () => {
    if (!datos) return;
    const lista = [
      ...datos.quienesSomos.misionVision.compromisos,
      { icon: 'verified', textoEs: 'Nuevo compromiso institucional.', textoEn: 'New institutional commitment.' },
    ];
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        misionVision: { ...datos.quienesSomos.misionVision, compromisos: lista },
      },
    });
  };

  const eliminarCompromiso = (idx: number) => {
    if (!datos) return;
    const lista = datos.quienesSomos.misionVision.compromisos.filter((_, i) => i !== idx);
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        misionVision: { ...datos.quienesSomos.misionVision, compromisos: lista },
      },
    });
  };

  const actualizarObjetivo = (idx: number, cambios: Partial<ItemIconoTextoWeb>) => {
    if (!datos) return;
    const lista = datos.quienesSomos.sistemaCalidad.objetivos.map((o, i) =>
      i === idx ? { ...o, ...cambios } : o
    );
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        sistemaCalidad: { ...datos.quienesSomos.sistemaCalidad, objetivos: lista },
      },
    });
  };

  const agregarObjetivo = () => {
    if (!datos) return;
    const lista = [
      ...datos.quienesSomos.sistemaCalidad.objetivos,
      { icon: 'task_alt', textoEs: 'Nuevo objetivo de calidad.', textoEn: 'New quality objective.' },
    ];
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        sistemaCalidad: { ...datos.quienesSomos.sistemaCalidad, objetivos: lista },
      },
    });
  };

  const eliminarObjetivo = (idx: number) => {
    if (!datos) return;
    const lista = datos.quienesSomos.sistemaCalidad.objetivos.filter((_, i) => i !== idx);
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        sistemaCalidad: { ...datos.quienesSomos.sistemaCalidad, objetivos: lista },
      },
    });
  };

  const actualizarFlota = (idx: number, cambios: Partial<FlotaItemWeb>) => {
    if (!datos) return;
    const lista = datos.quienesSomos.transportePasajeros.flota.map((f, i) =>
      i === idx ? { ...f, ...cambios } : f
    );
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        transportePasajeros: { ...datos.quienesSomos.transportePasajeros, flota: lista },
      },
    });
  };

  const agregarCategoriaFlota = () => {
    if (!datos) return;
    const nueva: FlotaItemWeb = {
      nombre: 'Nueva Línea de Vehículos',
      subtituloEs: 'Servicio Especial',
      subtituloEn: 'Special Service',
      icon: 'directions_bus',
      destacado: false,
      caracteristicasEs: [
        { icon: 'airline_seat_recline_extra', texto: 'Sillas reclinables' },
        { icon: 'wifi', texto: 'GPS, WIFI' },
      ],
      caracteristicasEn: [
        { icon: 'airline_seat_recline_extra', texto: 'Reclining seats' },
        { icon: 'wifi', texto: 'GPS, WIFI' },
      ],
    };
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        transportePasajeros: {
          ...datos.quienesSomos.transportePasajeros,
          flota: [...datos.quienesSomos.transportePasajeros.flota, nueva],
        },
      },
    });
  };

  const eliminarCategoriaFlota = (idx: number) => {
    if (!datos) return;
    const lista = datos.quienesSomos.transportePasajeros.flota.filter((_, i) => i !== idx);
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        transportePasajeros: { ...datos.quienesSomos.transportePasajeros, flota: lista },
      },
    });
  };

  const actualizarOficinaEncomienda = (idx: number, cambios: Partial<OficinaEncomiendaWeb>) => {
    if (!datos) return;
    const lista = datos.quienesSomos.transporteEncomiendas.oficinas.map((o, i) =>
      i === idx ? { ...o, ...cambios } : o
    );
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        transporteEncomiendas: { ...datos.quienesSomos.transporteEncomiendas, oficinas: lista },
      },
    });
  };

  const agregarOficinaEncomienda = () => {
    if (!datos) return;
    const nueva: OficinaEncomiendaWeb = {
      ciudad: 'Pasto',
      sedeEs: 'Nueva Sede',
      sedeEn: 'New Office',
      direccion: 'Dirección de la oficina',
      celular: '314 000 0000',
    };
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        transporteEncomiendas: {
          ...datos.quienesSomos.transporteEncomiendas,
          oficinas: [...datos.quienesSomos.transporteEncomiendas.oficinas, nueva],
        },
      },
    });
  };

  const eliminarOficinaEncomienda = (idx: number) => {
    if (!datos) return;
    const lista = datos.quienesSomos.transporteEncomiendas.oficinas.filter((_, i) => i !== idx);
    setDatos({
      ...datos,
      quienesSomos: {
        ...datos.quienesSomos,
        transporteEncomiendas: { ...datos.quienesSomos.transporteEncomiendas, oficinas: lista },
      },
    });
  };

  const pestaniaActual = PESTANIAS.find((p) => p.id === pestania)!;

  return (
    <Layout>
      {/* Barra superior descriptiva + acciones globales */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          marginBottom: '12px',
          fontFamily: FONT,
        }}
      >
        <p style={{ fontSize: '13.5px', color: C.onSurfaceVariant, margin: 0, fontWeight: 500, maxWidth: '680px' }}>
          Administra los textos, imágenes del carrusel, secciones de <strong>Quiénes Somos</strong>, directorios y enlaces
          que se muestran en las páginas públicas de <strong>FrontendPlataformaEcommerce</strong>.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={restaurarPredeterminado}
            disabled={guardando || cargando}
            style={botonSecundario}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              restart_alt
            </span>
            Restaurar predeterminados
          </button>

          <button
            type="button"
            onClick={guardarCambios}
            disabled={guardando || cargando || !datos}
            style={botonPrimario(guardando || cargando || !datos)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              save
            </span>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {mensaje && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: mensaje.tipo === 'ok' ? C.successBg : C.errorBg,
            border: `1px solid ${mensaje.tipo === 'ok' ? '#86efac' : '#fca5a5'}`,
            color: mensaje.tipo === 'ok' ? C.success : C.error,
            fontWeight: 700,
            fontSize: '14px',
            fontFamily: FONT,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {mensaje.tipo === 'ok' ? 'check_circle' : 'error'}
          </span>
          {mensaje.texto}
        </div>
      )}

      {/* Pestañas de navegación por sección */}
      <div
        role="tablist"
        aria-label="Secciones del contenido web"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
          gap: '10px',
          marginBottom: '18px',
        }}
      >
        {PESTANIAS.map((t) => {
          const activa = pestania === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => setPestania(t.id)}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                border: activa ? `2px solid ${C.primary}` : `1px solid ${C.outlineVariant}`,
                background: activa ? C.secondaryFixed : '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                fontFamily: FONT,
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  flexShrink: 0,
                  background: activa ? C.primary : C.surfaceContainerLow,
                  color: activa ? '#fff' : C.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {t.icono}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: C.onSurface }}>{t.label}</div>
                <div
                  style={{
                    fontSize: '11px',
                    color: C.onSurfaceVariant,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t.descripcion}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {cargando && (
        <div
          style={{
            padding: '64px 24px',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '14px',
            border: `1px solid ${C.outlineVariant}`,
            color: C.onSurfaceVariant,
            fontFamily: FONT,
          }}
        >
          Cargando contenido de las páginas públicas...
        </div>
      )}

      {!cargando && errorCarga && (
        <div
          style={{
            padding: '32px 24px',
            background: C.errorBg,
            border: '1px solid #fca5a5',
            borderRadius: '14px',
            color: C.error,
            fontFamily: FONT,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong>Error al cargar:</strong> {errorCarga}
          </div>
          <button type="button" onClick={cargar} style={botonSecundario}>
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !errorCarga && datos && (
        <div role="tabpanel" aria-label={pestaniaActual.label} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* ═══════════════════════════════════════════════════════════════════════
              1. PORTADA Y CARRUSEL (HOME)
             ═══════════════════════════════════════════════════════════════════════ */}
          {pestania === 'home' && (
            <>
              <Tarjeta
                titulo="Animación Inicial (Splash Screen del Cóndor)"
                descripcion="Configura la pantalla de bienvenida animada cuando el usuario abre la plataforma"
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <Interruptor
                    id="splash-activo"
                    label="Mostrar animación del Cóndor al iniciar"
                    ayuda="Si se desactiva, el visitante entra directamente al Home sin ver la introducción."
                    valor={datos.home.splashActivo}
                    onChange={(v) => setDatos({ ...datos, home: { ...datos.home, splashActivo: v } })}
                  />
                  <Campo label="Subtítulo línea 1 (Splash)" id="splash-sub1">
                    <input
                      id="splash-sub1"
                      style={inputStyle}
                      value={datos.home.splashSubtitulo1}
                      onChange={(e) =>
                        setDatos({ ...datos, home: { ...datos.home, splashSubtitulo1: e.target.value } })
                      }
                    />
                  </Campo>
                  <Campo label="Subtítulo línea 2 (Splash)" id="splash-sub2">
                    <input
                      id="splash-sub2"
                      style={inputStyle}
                      value={datos.home.splashSubtitulo2}
                      onChange={(e) =>
                        setDatos({ ...datos, home: { ...datos.home, splashSubtitulo2: e.target.value } })
                      }
                    />
                  </Campo>
                </div>
              </Tarjeta>

              <Tarjeta
                titulo={`Diapositivas del Carrusel Principal (${datos.home.slides.length})`}
                descripcion="Cada diapositiva muestra un titular en 3 líneas (blanco + naranja + pastilla roja), descripción e imagen de fondo."
                accion={
                  <button type="button" onClick={agregarSlide} style={botonPrimario()}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      add_photo_alternate
                    </span>
                    Agregar diapositiva
                  </button>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {datos.home.slides.map((slide, idx) => (
                    <div
                      key={slide.id || idx}
                      style={{
                        border: `1.5px solid ${C.outlineVariant}`,
                        borderRadius: '12px',
                        padding: '16px',
                        background: slide.activo ? '#fff' : C.surfaceContainerLow,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                          marginBottom: '14px',
                          paddingBottom: '10px',
                          borderBottom: `1px solid ${C.outlineVariant}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              background: C.primary,
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 800,
                              fontFamily: FONT,
                            }}
                          >
                            Slide #{idx + 1}
                          </span>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
                            <input
                              type="checkbox"
                              checked={slide.activo}
                              onChange={(e) => actualizarSlide(idx, { activo: e.target.checked })}
                            />
                            Visible en el Home
                          </label>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => moverSlide(idx, -1)}
                            disabled={idx === 0}
                            style={botonIcono}
                            title="Subir orden"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              arrow_upward
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => moverSlide(idx, 1)}
                            disabled={idx === datos.home.slides.length - 1}
                            style={botonIcono}
                            title="Bajar orden"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              arrow_downward
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarSlide(idx)}
                            style={botonPeligro}
                            title="Eliminar diapositiva"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              delete
                            </span>
                            Eliminar
                          </button>
                        </div>
                      </div>

                      {/* Selector de imagen */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '12px',
                          marginBottom: '14px',
                        }}
                      >
                        <Campo label="Imagen de fondo" ayuda="Puedes usar una imagen integrada o subir una foto nueva">
                          <select
                            style={inputStyle}
                            value={slide.claveImagen}
                            onChange={(e) =>
                              actualizarSlide(idx, {
                                claveImagen: e.target.value as SlideHeroWeb['claveImagen'],
                              })
                            }
                          >
                            <option value="confort">Confort Interior (Silletería de lujo)</option>
                            <option value="bus">Bus Exterior Cootranar (Carretera)</option>
                            <option value="encomiendas">Encomiendas y Carga (Agencia)</option>
                            <option value="custom">Imagen personalizada (URL / Subida)</option>
                          </select>
                        </Campo>

                        <Campo label="Subir foto personalizada" ayuda="Formatos JPG, PNG o WEBP">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label
                              style={{
                                ...botonSecundario,
                                padding: '8px 12px',
                                fontSize: '12.5px',
                                cursor: subiendoSlideIdx === idx ? 'wait' : 'pointer',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                                upload_file
                              </span>
                              {subiendoSlideIdx === idx ? 'Subiendo...' : 'Subir archivo'}
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                disabled={subiendoSlideIdx === idx}
                                onChange={(e) => subirImagenSlide(idx, e.target.files?.[0])}
                              />
                            </label>
                            {slide.urlImagen && (
                              <span style={{ fontSize: '11.5px', color: C.success, fontWeight: 700, fontFamily: FONT }}>
                                Imagen personalizada activa
                              </span>
                            )}
                          </div>
                        </Campo>

                        {slide.claveImagen === 'custom' && (
                          <Campo label="URL de imagen personalizada">
                            <input
                              style={inputStyle}
                              placeholder="https://..."
                              value={slide.urlImagen || ''}
                              onChange={(e) => actualizarSlide(idx, { urlImagen: e.target.value || null })}
                            />
                          </Campo>
                        )}
                      </div>

                      {/* Textos en Español e Inglés */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '12px',
                          marginBottom: '12px',
                        }}
                      >
                        <Campo label="Línea 1 · Texto blanco (ES)">
                          <input
                            style={inputStyle}
                            value={slide.linea1Es}
                            onChange={(e) => actualizarSlide(idx, { linea1Es: e.target.value })}
                          />
                        </Campo>
                        <Campo label="Línea 2 · Texto naranja (ES)">
                          <input
                            style={inputStyle}
                            value={slide.linea2Es}
                            onChange={(e) => actualizarSlide(idx, { linea2Es: e.target.value })}
                          />
                        </Campo>
                        <Campo label="Línea 3 · Pastilla roja (ES)">
                          <input
                            style={inputStyle}
                            value={slide.pastillaEs}
                            onChange={(e) => actualizarSlide(idx, { pastillaEs: e.target.value })}
                          />
                        </Campo>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '12px',
                          marginBottom: '12px',
                        }}
                      >
                        <Campo label="Línea 1 · Texto blanco (EN)">
                          <input
                            style={inputStyle}
                            value={slide.linea1En}
                            onChange={(e) => actualizarSlide(idx, { linea1En: e.target.value })}
                          />
                        </Campo>
                        <Campo label="Línea 2 · Texto naranja (EN)">
                          <input
                            style={inputStyle}
                            value={slide.linea2En}
                            onChange={(e) => actualizarSlide(idx, { linea2En: e.target.value })}
                          />
                        </Campo>
                        <Campo label="Línea 3 · Pastilla roja (EN)">
                          <input
                            style={inputStyle}
                            value={slide.pastillaEn}
                            onChange={(e) => actualizarSlide(idx, { pastillaEn: e.target.value })}
                          />
                        </Campo>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                          gap: '12px',
                        }}
                      >
                        <Campo label="Descripción (Español)">
                          <textarea
                            style={textareaStyle}
                            value={slide.descripcionEs}
                            onChange={(e) => actualizarSlide(idx, { descripcionEs: e.target.value })}
                          />
                        </Campo>
                        <Campo label="Descripción (Inglés)">
                          <textarea
                            style={textareaStyle}
                            value={slide.descripcionEn}
                            onChange={(e) => actualizarSlide(idx, { descripcionEn: e.target.value })}
                          />
                        </Campo>
                      </div>
                    </div>
                  ))}
                </div>
              </Tarjeta>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              2. MISIÓN Y VISIÓN (QUIÉNES SOMOS)
             ═══════════════════════════════════════════════════════════════════════ */}
          {pestania === 'mision-vision' && (
            <>
              <Tarjeta
                titulo="Encabezado de la página Quiénes Somos"
                descripcion="Banner superior que aparece en las 4 subpáginas de Quiénes Somos"
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  <Campo label="Etiqueta superior (ES)">
                    <input
                      style={inputStyle}
                      value={datos.quienesSomos.encabezado.etiquetaEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            encabezado: { ...datos.quienesSomos.encabezado, etiquetaEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Etiqueta superior (EN)">
                    <input
                      style={inputStyle}
                      value={datos.quienesSomos.encabezado.etiquetaEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            encabezado: { ...datos.quienesSomos.encabezado, etiquetaEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Título principal (ES)">
                    <input
                      style={inputStyle}
                      value={datos.quienesSomos.encabezado.tituloEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            encabezado: { ...datos.quienesSomos.encabezado, tituloEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Título principal (EN)">
                    <input
                      style={inputStyle}
                      value={datos.quienesSomos.encabezado.tituloEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            encabezado: { ...datos.quienesSomos.encabezado, tituloEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Subtítulo (ES)">
                    <textarea
                      style={textareaStyle}
                      value={datos.quienesSomos.encabezado.subtituloEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            encabezado: { ...datos.quienesSomos.encabezado, subtituloEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Subtítulo (EN)">
                    <textarea
                      style={textareaStyle}
                      value={datos.quienesSomos.encabezado.subtituloEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            encabezado: { ...datos.quienesSomos.encabezado, subtituloEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                </div>
              </Tarjeta>

              <Tarjeta titulo="Misión y Visión Institucional" descripcion="Textos principales del primer submenú de Quiénes Somos">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <Campo label="Misión (Español)">
                    <textarea
                      style={{ ...textareaStyle, minHeight: '110px' }}
                      value={datos.quienesSomos.misionVision.misionEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            misionVision: { ...datos.quienesSomos.misionVision, misionEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Misión (Inglés)">
                    <textarea
                      style={{ ...textareaStyle, minHeight: '110px' }}
                      value={datos.quienesSomos.misionVision.misionEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            misionVision: { ...datos.quienesSomos.misionVision, misionEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Visión (Español)">
                    <textarea
                      style={{ ...textareaStyle, minHeight: '110px' }}
                      value={datos.quienesSomos.misionVision.visionEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            misionVision: { ...datos.quienesSomos.misionVision, visionEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Visión (Inglés)">
                    <textarea
                      style={{ ...textareaStyle, minHeight: '110px' }}
                      value={datos.quienesSomos.misionVision.visionEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            misionVision: { ...datos.quienesSomos.misionVision, visionEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                </div>
              </Tarjeta>

              <Tarjeta
                titulo={`Nuestro Compromiso (${datos.quienesSomos.misionVision.compromisos.length} pilares)`}
                descripcion="Tarjetas de principios y mejora continua que aparecen debajo de Misión y Visión"
                accion={
                  <button type="button" onClick={agregarCompromiso} style={botonPrimario()}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      add
                    </span>
                    Agregar compromiso
                  </button>
                }
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <Campo label="Encabezado de compromisos (ES)">
                    <textarea
                      style={textareaStyle}
                      value={datos.quienesSomos.misionVision.compromisosTituloEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            misionVision: {
                              ...datos.quienesSomos.misionVision,
                              compromisosTituloEs: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Encabezado de compromisos (EN)">
                    <textarea
                      style={textareaStyle}
                      value={datos.quienesSomos.misionVision.compromisosTituloEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            misionVision: {
                              ...datos.quienesSomos.misionVision,
                              compromisosTituloEn: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {datos.quienesSomos.misionVision.compromisos.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr 1fr auto',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `1px solid ${C.outlineVariant}`,
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Ícono Material</label>
                        <input
                          style={inputStyle}
                          value={item.icon}
                          onChange={(e) => actualizarCompromiso(idx, { icon: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Texto (Español)</label>
                        <input
                          style={inputStyle}
                          value={item.textoEs}
                          onChange={(e) => actualizarCompromiso(idx, { textoEs: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Texto (Inglés)</label>
                        <input
                          style={inputStyle}
                          value={item.textoEn}
                          onChange={(e) => actualizarCompromiso(idx, { textoEn: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarCompromiso(idx)}
                        style={{ ...botonPeligro, marginTop: '18px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          delete
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </Tarjeta>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              3. SISTEMA DE CALIDAD
             ═══════════════════════════════════════════════════════════════════════ */}
          {pestania === 'sistema-calidad' && (
            <>
              <Tarjeta titulo="Política del Sistema de Calidad" descripcion="Texto oficial de la Política de Calidad de Cootranar Ltda.">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <Campo label="Política (Español)">
                    <textarea
                      style={{ ...textareaStyle, minHeight: '115px' }}
                      value={datos.quienesSomos.sistemaCalidad.politicaEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            sistemaCalidad: {
                              ...datos.quienesSomos.sistemaCalidad,
                              politicaEs: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Política (Inglés)">
                    <textarea
                      style={{ ...textareaStyle, minHeight: '115px' }}
                      value={datos.quienesSomos.sistemaCalidad.politicaEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            sistemaCalidad: {
                              ...datos.quienesSomos.sistemaCalidad,
                              politicaEn: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                </div>
              </Tarjeta>

              <Tarjeta
                titulo={`Objetivos de Calidad (${datos.quienesSomos.sistemaCalidad.objetivos.length})`}
                descripcion="Metas institucionales del Sistema de Gestión de Calidad"
                accion={
                  <button type="button" onClick={agregarObjetivo} style={botonPrimario()}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      add
                    </span>
                    Agregar objetivo
                  </button>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {datos.quienesSomos.sistemaCalidad.objetivos.map((obj, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr 1fr auto',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `1px solid ${C.outlineVariant}`,
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Ícono Material</label>
                        <input
                          style={inputStyle}
                          value={obj.icon}
                          onChange={(e) => actualizarObjetivo(idx, { icon: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Objetivo (Español)</label>
                        <input
                          style={inputStyle}
                          value={obj.textoEs}
                          onChange={(e) => actualizarObjetivo(idx, { textoEs: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Objetivo (Inglés)</label>
                        <input
                          style={inputStyle}
                          value={obj.textoEn}
                          onChange={(e) => actualizarObjetivo(idx, { textoEn: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarObjetivo(idx)}
                        style={{ ...botonPeligro, marginTop: '18px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          delete
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </Tarjeta>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              4. TRANSPORTE DE PASAJEROS
             ═══════════════════════════════════════════════════════════════════════ */}
          {pestania === 'transporte-pasajeros' && (
            <>
              <Tarjeta
                titulo="Presentación del Parque Automotor y Talento Humano"
                descripcion="Párrafos introductorios de la página Transporte de Pasajeros"
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <Campo label="Párrafo 1 · Parque automotor y CDA (ES)">
                    <textarea
                      style={{ ...textareaStyle, minHeight: '110px' }}
                      value={datos.quienesSomos.transportePasajeros.parrafo1Es}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            transportePasajeros: {
                              ...datos.quienesSomos.transportePasajeros,
                              parrafo1Es: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Párrafo 1 · Parque automotor y CDA (EN)">
                    <textarea
                      style={{ ...textareaStyle, minHeight: '110px' }}
                      value={datos.quienesSomos.transportePasajeros.parrafo1En}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            transportePasajeros: {
                              ...datos.quienesSomos.transportePasajeros,
                              parrafo1En: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Párrafo 2 · Selección de personal (ES)">
                    <textarea
                      style={textareaStyle}
                      value={datos.quienesSomos.transportePasajeros.parrafo2Es}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            transportePasajeros: {
                              ...datos.quienesSomos.transportePasajeros,
                              parrafo2Es: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Párrafo 2 · Selección de personal (EN)">
                    <textarea
                      style={textareaStyle}
                      value={datos.quienesSomos.transportePasajeros.parrafo2En}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            transportePasajeros: {
                              ...datos.quienesSomos.transportePasajeros,
                              parrafo2En: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                </div>
              </Tarjeta>

              <Tarjeta
                titulo={`Líneas de Vehículos (${datos.quienesSomos.transportePasajeros.flota.length})`}
                descripcion="Tarjetas de flota: Aerocondor - Supercondor, Busetas - Microbuses, Camionetas y Aerovans"
                accion={
                  <button type="button" onClick={agregarCategoriaFlota} style={botonPrimario()}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      add
                    </span>
                    Agregar línea de flota
                  </button>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {datos.quienesSomos.transportePasajeros.flota.map((veh, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: `1.5px solid ${C.outlineVariant}`,
                        borderRadius: '12px',
                        padding: '16px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                          marginBottom: '12px',
                        }}
                      >
                        <strong style={{ fontSize: '14px', color: C.onSurface, fontFamily: FONT }}>
                          {veh.nombre}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
                            <input
                              type="checkbox"
                              checked={Boolean(veh.destacado)}
                              onChange={(e) => actualizarFlota(idx, { destacado: e.target.checked })}
                            />
                            Tarjeta destacada (Azul marino)
                          </label>
                          <button type="button" onClick={() => eliminarCategoriaFlota(idx)} style={botonPeligro}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              delete
                            </span>
                            Eliminar
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '12px',
                          marginBottom: '12px',
                        }}
                      >
                        <Campo label="Nombre de la línea">
                          <input
                            style={inputStyle}
                            value={veh.nombre}
                            onChange={(e) => actualizarFlota(idx, { nombre: e.target.value })}
                          />
                        </Campo>
                        <Campo label="Subtítulo (ES)">
                          <input
                            style={inputStyle}
                            value={veh.subtituloEs}
                            onChange={(e) => actualizarFlota(idx, { subtituloEs: e.target.value })}
                          />
                        </Campo>
                        <Campo label="Subtítulo (EN)">
                          <input
                            style={inputStyle}
                            value={veh.subtituloEn}
                            onChange={(e) => actualizarFlota(idx, { subtituloEn: e.target.value })}
                          />
                        </Campo>
                        <Campo label="Ícono Material">
                          <input
                            style={inputStyle}
                            value={veh.icon}
                            onChange={(e) => actualizarFlota(idx, { icon: e.target.value })}
                          />
                        </Campo>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                        <Campo
                          label="Características en Español (una por línea)"
                          ayuda="Cada línea se muestra como un ítem con ícono en la tarjeta"
                        >
                          <textarea
                            style={{ ...textareaStyle, minHeight: '120px' }}
                            value={veh.caracteristicasEs.map((c) => c.texto).join('\n')}
                            onChange={(e) => {
                              const lineas = e.target.value.split('\n');
                              const nuevas = lineas.map((t, cIdx) => ({
                                icon: veh.caracteristicasEs[cIdx]?.icon || 'check_circle',
                                texto: t,
                              }));
                              actualizarFlota(idx, { caracteristicasEs: nuevas });
                            }}
                          />
                        </Campo>
                        <Campo
                          label="Características en Inglés (una por línea)"
                          ayuda="Correspondencia en inglés para cada característica"
                        >
                          <textarea
                            style={{ ...textareaStyle, minHeight: '120px' }}
                            value={veh.caracteristicasEn.map((c) => c.texto).join('\n')}
                            onChange={(e) => {
                              const lineas = e.target.value.split('\n');
                              const nuevas = lineas.map((t, cIdx) => ({
                                icon: veh.caracteristicasEn[cIdx]?.icon || 'check_circle',
                                texto: t,
                              }));
                              actualizarFlota(idx, { caracteristicasEn: nuevas });
                            }}
                          />
                        </Campo>
                      </div>
                    </div>
                  ))}
                </div>
              </Tarjeta>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              5. TRANSPORTE DE ENCOMIENDAS Y CARGA
             ═══════════════════════════════════════════════════════════════════════ */}
          {pestania === 'transporte-encomiendas' && (
            <>
              <Tarjeta titulo="Presentación de Encomiendas y Carga">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <Campo label="Descripción (Español)">
                    <textarea
                      style={textareaStyle}
                      value={datos.quienesSomos.transporteEncomiendas.descripcionEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            transporteEncomiendas: {
                              ...datos.quienesSomos.transporteEncomiendas,
                              descripcionEs: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Descripción (Inglés)">
                    <textarea
                      style={textareaStyle}
                      value={datos.quienesSomos.transporteEncomiendas.descripcionEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          quienesSomos: {
                            ...datos.quienesSomos,
                            transporteEncomiendas: {
                              ...datos.quienesSomos.transporteEncomiendas,
                              descripcionEn: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Campo>
                </div>
              </Tarjeta>

              <Tarjeta
                titulo={`Directorio de Oficinas de Encomiendas (${datos.quienesSomos.transporteEncomiendas.oficinas.length})`}
                descripcion="Puntos de recepción y entrega que aparecen en Quiénes Somos › Transporte de Encomiendas"
                accion={
                  <button type="button" onClick={agregarOficinaEncomienda} style={botonPrimario()}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      add_business
                    </span>
                    Agregar oficina
                  </button>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {datos.quienesSomos.transporteEncomiendas.oficinas.map((ofi, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '130px 170px 1fr 150px auto',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `1px solid ${C.outlineVariant}`,
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Ciudad</label>
                        <input
                          style={inputStyle}
                          value={ofi.ciudad}
                          onChange={(e) => actualizarOficinaEncomienda(idx, { ciudad: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Sede</label>
                        <input
                          style={inputStyle}
                          value={ofi.sedeEs}
                          onChange={(e) =>
                            actualizarOficinaEncomienda(idx, { sedeEs: e.target.value, sedeEn: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Dirección</label>
                        <input
                          style={inputStyle}
                          value={ofi.direccion}
                          onChange={(e) => actualizarOficinaEncomienda(idx, { direccion: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Celular</label>
                        <input
                          style={inputStyle}
                          value={ofi.celular}
                          onChange={(e) => actualizarOficinaEncomienda(idx, { celular: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarOficinaEncomienda(idx)}
                        style={{ ...botonPeligro, marginTop: '18px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          delete
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </Tarjeta>

              <Tarjeta
                titulo="Rutas de Encomiendas y Carga"
                descripcion="Escribe una ruta por línea (ejemplo: Ipiales – Pasto y viceversa)"
              >
                <Campo label="Listado de rutas autorizadas (una por línea)">
                  <textarea
                    style={{ ...textareaStyle, minHeight: '160px' }}
                    value={datos.quienesSomos.transporteEncomiendas.rutas.join('\n')}
                    onChange={(e) =>
                      setDatos({
                        ...datos,
                        quienesSomos: {
                          ...datos.quienesSomos,
                          transporteEncomiendas: {
                            ...datos.quienesSomos.transporteEncomiendas,
                            rutas: e.target.value.split('\n').filter((r) => r.trim().length > 0),
                          },
                        },
                      })
                    }
                  />
                </Campo>
              </Tarjeta>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              6. PÁGINAS PÚBLICAS (VIAJES / ENCOMIENDAS) Y FOOTER
             ═══════════════════════════════════════════════════════════════════════ */}
          {pestania === 'paginas-footer' && (
            <>
              <Tarjeta
                titulo="Encabezado de la página Viajes, Destinos y Rutas (/viajes)"
                descripcion="Textos del banner superior en el catálogo público de viajes"
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <Campo label="Etiqueta (ES)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.viajes.etiquetaEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            viajes: { ...datos.paginasPublicas.viajes, etiquetaEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Etiqueta (EN)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.viajes.etiquetaEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            viajes: { ...datos.paginasPublicas.viajes, etiquetaEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Título (ES)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.viajes.tituloEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            viajes: { ...datos.paginasPublicas.viajes, tituloEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Título (EN)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.viajes.tituloEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            viajes: { ...datos.paginasPublicas.viajes, tituloEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Subtítulo (ES)">
                    <textarea
                      style={textareaStyle}
                      value={datos.paginasPublicas.viajes.subtituloEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            viajes: { ...datos.paginasPublicas.viajes, subtituloEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Subtítulo (EN)">
                    <textarea
                      style={textareaStyle}
                      value={datos.paginasPublicas.viajes.subtituloEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            viajes: { ...datos.paginasPublicas.viajes, subtituloEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                </div>
              </Tarjeta>

              <Tarjeta
                titulo="Encabezado de la página pública de Encomiendas (/encomiendas)"
                descripcion="Banner informativo para visitantes que consultan el servicio de paquetería"
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <Campo label="Título línea 1 (ES)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.encomiendas.titulo1Es}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            encomiendas: { ...datos.paginasPublicas.encomiendas, titulo1Es: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Título línea 2 celeste (ES)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.encomiendas.titulo2Es}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            encomiendas: { ...datos.paginasPublicas.encomiendas, titulo2Es: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Título línea 1 (EN)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.encomiendas.titulo1En}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            encomiendas: { ...datos.paginasPublicas.encomiendas, titulo1En: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Título línea 2 celeste (EN)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.encomiendas.titulo2En}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            encomiendas: { ...datos.paginasPublicas.encomiendas, titulo2En: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Subtítulo (ES)">
                    <textarea
                      style={textareaStyle}
                      value={datos.paginasPublicas.encomiendas.subtituloEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            encomiendas: { ...datos.paginasPublicas.encomiendas, subtituloEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Subtítulo (EN)">
                    <textarea
                      style={textareaStyle}
                      value={datos.paginasPublicas.encomiendas.subtituloEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            encomiendas: { ...datos.paginasPublicas.encomiendas, subtituloEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                </div>
              </Tarjeta>

              <Tarjeta
                titulo="Footer Cinematográfico y Redes Sociales"
                descripcion="Frase principal, cinta animada y enlaces a redes sociales oficiales de Cootranar"
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <Campo label="Pregunta principal del Footer (ES)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.footer.tituloEs}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            footer: { ...datos.paginasPublicas.footer, tituloEs: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="Pregunta principal del Footer (EN)">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.footer.tituloEn}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            footer: { ...datos.paginasPublicas.footer, tituloEn: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="URL de Instagram">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.footer.instagramUrl}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            footer: { ...datos.paginasPublicas.footer, instagramUrl: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="URL de Facebook">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.footer.facebookUrl}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            footer: { ...datos.paginasPublicas.footer, facebookUrl: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="URL de TikTok">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.footer.tiktokUrl}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            footer: { ...datos.paginasPublicas.footer, tiktokUrl: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                  <Campo label="URL de WhatsApp">
                    <input
                      style={inputStyle}
                      value={datos.paginasPublicas.footer.whatsappUrl}
                      onChange={(e) =>
                        setDatos({
                          ...datos,
                          paginasPublicas: {
                            ...datos.paginasPublicas,
                            footer: { ...datos.paginasPublicas.footer, whatsappUrl: e.target.value },
                          },
                        })
                      }
                    />
                  </Campo>
                </div>
              </Tarjeta>
            </>
          )}
        </div>
      )}
    </Layout>
  );
};
