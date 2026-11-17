import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { httpClient } from '../../infrastructure/api/httpClient';

export interface SlideHeroWeb {
  id: string;
  claveImagen: 'confort' | 'bus' | 'encomiendas' | 'custom';
  urlImagen: string | null;
  linea1Es: string;
  linea1En: string;
  linea2Es: string;
  linea2En: string;
  pastillaEs: string;
  pastillaEn: string;
  descripcionEs: string;
  descripcionEn: string;
  activo: boolean;
}

export interface ItemIconoTextoWeb {
  icon: string;
  textoEs: string;
  textoEn: string;
}

export interface CaracteristicaFlotaWeb {
  icon: string;
  texto: string;
}

export interface FlotaItemWeb {
  nombre: string;
  subtituloEs: string;
  subtituloEn: string;
  icon: string;
  destacado: boolean;
  caracteristicasEs: CaracteristicaFlotaWeb[];
  caracteristicasEn: CaracteristicaFlotaWeb[];
}

export interface OficinaEncomiendaWeb {
  ciudad: string;
  sedeEs: string;
  sedeEn: string;
  direccion: string;
  celular: string;
}

export interface ContenidoWebCompleto {
  home: {
    splashActivo: boolean;
    splashSubtitulo1: string;
    splashSubtitulo2: string;
    slides: SlideHeroWeb[];
  };
  quienesSomos: {
    encabezado: {
      etiquetaEs: string;
      etiquetaEn: string;
      tituloEs: string;
      tituloEn: string;
      subtituloEs: string;
      subtituloEn: string;
    };
    misionVision: {
      misionEs: string;
      misionEn: string;
      visionEs: string;
      visionEn: string;
      compromisosTituloEs: string;
      compromisosTituloEn: string;
      compromisos: ItemIconoTextoWeb[];
    };
    sistemaCalidad: {
      politicaEs: string;
      politicaEn: string;
      objetivos: ItemIconoTextoWeb[];
    };
    transportePasajeros: {
      parrafo1Es: string;
      parrafo1En: string;
      parrafo2Es: string;
      parrafo2En: string;
      flota: FlotaItemWeb[];
    };
    transporteEncomiendas: {
      descripcionEs: string;
      descripcionEn: string;
      oficinas: OficinaEncomiendaWeb[];
      rutas: string[];
    };
  };
  paginasPublicas: {
    viajes: {
      etiquetaEs: string;
      etiquetaEn: string;
      tituloEs: string;
      tituloEn: string;
      subtituloEs: string;
      subtituloEn: string;
    };
    encomiendas: {
      etiquetaEs: string;
      etiquetaEn: string;
      titulo1Es: string;
      titulo1En: string;
      titulo2Es: string;
      titulo2En: string;
      subtituloEs: string;
      subtituloEn: string;
    };
    footer: {
      tituloEs: string;
      tituloEn: string;
      frasesMarquesinaEs: string[];
      frasesMarquesinaEn: string[];
      instagramUrl: string;
      facebookUrl: string;
      tiktokUrl: string;
      whatsappUrl: string;
    };
  };
}

export const CONTENIDO_WEB_INICIAL: ContenidoWebCompleto = {
  home: {
    splashActivo: true,
    splashSubtitulo1: 'Transporte de Pasajeros y Encomiendas',
    splashSubtitulo2: 'Conectando a Nariño y el suroccidente colombiano',
    slides: [
      {
        id: 'slide-1',
        claveImagen: 'confort',
        urlImagen: null,
        linea1Es: 'Tu viaje empieza',
        linea1En: 'Your trip begins',
        linea2Es: 'con la comodidad',
        linea2En: 'with the comfort',
        pastillaEs: 'de elegirnos.',
        pastillaEn: 'of choosing us.',
        descripcionEs:
          'Disfruta el camino con la comodidad de nuestros buses y los servicios a bordo pensados para acompañarte durante el recorrido.',
        descripcionEn:
          'Enjoy the road with the comfort of our buses and onboard services designed to accompany you throughout your journey.',
        activo: true,
      },
      {
        id: 'slide-2',
        claveImagen: 'bus',
        urlImagen: null,
        linea1Es: 'Tu seguridad es',
        linea1En: 'Your safety is',
        linea2Es: 'nuestra prioridad',
        linea2En: 'our top priority',
        pastillaEs: 'en cada kilómetro.',
        pastillaEn: 'every single mile.',
        descripcionEs:
          'Viaja tranquilo por Nariño y Colombia con rastreo satelital GPS 24/7, revisión técnico-mecánica permanente y conductores certificados.',
        descripcionEn:
          'Travel with peace of mind across Nariño and Colombia with 24/7 GPS tracking, permanent inspections, and certified drivers.',
        activo: true,
      },
      {
        id: 'slide-3',
        claveImagen: 'encomiendas',
        urlImagen: null,
        linea1Es: 'Tus encomiendas',
        linea1En: 'Your parcels',
        linea2Es: 'llegan seguras',
        linea2En: 'arrive safely',
        pastillaEs: 'a todo destino.',
        pastillaEn: 'to every destination.',
        descripcionEs:
          'Transportamos tus paquetes y carga con vehículos propios, guía digital en línea y agencias en Pasto, Cali, Popayán, Ipiales y Tumaco.',
        descripcionEn:
          'We transport your packages and cargo with our own fleet, digital tracking waybills, and offices in Pasto, Cali, Popayán, Ipiales, and Tumaco.',
        activo: true,
      },
    ],
  },
  quienesSomos: {
    encabezado: {
      etiquetaEs: 'Quiénes Somos · Cootranar Ltda.',
      etiquetaEn: 'About Us · Cootranar Ltda.',
      tituloEs: 'Conectando a Nariño y Colombia con calidad humana',
      tituloEn: 'Connecting Nariño and Colombia with human warmth',
      subtituloEs:
        'Cooperativa de Transportadores de Nariño — comprometidos con la seguridad, comodidad y el desarrollo social y económico de nuestra región.',
      subtituloEn:
        'Transport Cooperative of Nariño — committed to safety, comfort, and the social and economic development of our region.',
    },
    misionVision: {
      misionEs:
        'Somos una empresa Nariñense de transporte terrestre automotor de pasajeros y carga a nivel Nacional, orientados en brindar al cliente un servicio cómodo, seguro, con calidad humana, que genere desarrollo económico y bienestar social a la comunidad, a nuestros asociados y colaboradores.',
      misionEn:
        'We are a Nariño-based ground passenger and cargo transport company operating nationwide, focused on providing our customers with a comfortable, safe service with human warmth that generates economic development and social well-being for the community, our associates, and collaborators.',
      visionEs:
        'Ser reconocidos como la mejor empresa Nariñense de transporte terrestre automotor de pasajeros y carga a nivel nacional, por la calidad del servicio que ofrecemos a nuestros clientes.',
      visionEn:
        'To be recognized as the best Nariño-based ground passenger and cargo transport company nationwide for the quality of service we offer our customers.',
      compromisosTituloEs:
        'Estamos comprometidos en una mejora constante de nuestros procesos para ofrecer un servicio eficiente a todos y cada uno de nuestros clientes a través de:',
      compromisosTituloEn:
        'We are committed to constant improvement of our processes to offer an efficient service to each and every one of our customers through:',
      compromisos: [
        { icon: 'trending_up', textoEs: 'Mejora continua e innovación.', textoEn: 'Continuous improvement and innovation.' },
        { icon: 'favorite', textoEs: 'Empatía para satisfacer las necesidades de nuestros clientes.', textoEn: 'Empathy to meet the needs of our customers.' },
        { icon: 'fact_check', textoEs: 'Control de los procedimientos para conseguir el mejor rendimiento.', textoEn: 'Procedure control to achieve the best performance.' },
        { icon: 'groups', textoEs: 'Trabajo en equipo para conseguir nuestros objetivos.', textoEn: 'Teamwork to achieve our goals.' },
        { icon: 'school', textoEs: 'Formación continua y aprendizaje de nuestro equipo humano.', textoEn: 'Continuous training and learning of our human team.' },
        { icon: 'handshake', textoEs: 'Fomento del trabajo en equipo y trato respetuoso.', textoEn: 'Promoting teamwork and respectful treatment.' },
        { icon: 'balance', textoEs: 'Comportamiento ético.', textoEn: 'Ethical behavior.' },
        { icon: 'eco', textoEs: 'Minimizar el impacto con nuestro medio ambiente.', textoEn: 'Minimizing the impact on our environment.' },
      ],
    },
    sistemaCalidad: {
      politicaEs:
        'En cumplimiento a la normatividad colombiana aplicable al transporte terrestre automotor de pasajeros y carga por carretera, COOTRANAR LTDA., ofrece confort, seguridad, oportunidad, confiabilidad y una cálida atención a sus usuarios, con una adecuada infraestructura y talento humano competente, comprometido en el mejoramiento continuo de los procesos.',
      politicaEn:
        'In compliance with Colombian regulations applicable to ground passenger and road cargo transport, COOTRANAR LTDA. offers comfort, safety, timeliness, reliability, and warm customer service, supported by adequate infrastructure and competent human talent committed to the continuous improvement of processes.',
      objetivos: [
        { icon: 'sentiment_very_satisfied', textoEs: 'Incrementar el grado de satisfacción de los clientes de Cootranar Ltda.', textoEn: 'Increase the level of customer satisfaction at Cootranar Ltda.' },
        { icon: 'schedule', textoEs: 'Mantener el nivel de oportunidad de servicio.', textoEn: 'Maintain the level of service timeliness.' },
        { icon: 'airline_seat_recline_extra', textoEs: 'Incrementar el confort del servicio prestado.', textoEn: 'Increase the comfort of the service provided.' },
        { icon: 'workspace_premium', textoEs: 'Incrementar el grado de competencias del personal.', textoEn: 'Increase the competency level of staff.' },
        { icon: 'build_circle', textoEs: 'Ejecutar el plan de mantenimiento de infraestructura.', textoEn: 'Execute the infrastructure maintenance plan.' },
        { icon: 'autorenew', textoEs: 'Mejorar continuamente los procesos de Cootranar Ltda.', textoEn: 'Continuously improve the processes of Cootranar Ltda.' },
      ],
    },
    transportePasajeros: {
      parrafo1Es:
        'El parque automotor de Cootranar Ltda., está conformado por buses, busetas, microbuses, camionetas, que cumplen con las condiciones técnicas, mecánicas, operativas, que garantizan su normal operación en la prestación del servicio de transporte terrestre de pasajeros, ya que periódicamente se someten a una rigurosa revisión técnico mecánica en Centros de Diagnóstico Automotor autorizados, como en el Taller de Mantenimiento de Cootranar.',
      parrafo1En:
        'The fleet of Cootranar Ltda. consists of buses, minibuses, microbuses, and vans that meet all technical, mechanical, and operational conditions guaranteeing normal operation in ground passenger transport, as they periodically undergo rigorous technical-mechanical inspections at authorized Automotive Diagnostic Centers as well as at Cootranar’s Maintenance Workshop.',
      parrafo2Es:
        'Además, contamos con personal vinculado mediante un completo proceso de selección, que certifica su idoneidad y profesionalismo.',
      parrafo2En:
        'Furthermore, our staff is onboarded through a comprehensive selection process that certifies their suitability and professionalism.',
      flota: [
        {
          nombre: 'Aerocondor - Supercondor',
          subtituloEs: 'Bus de Lujo',
          subtituloEn: 'Luxury Bus',
          icon: 'directions_bus',
          destacado: true,
          caracteristicasEs: [
            { icon: 'groups', texto: 'Capacidad para 38 pasajeros' },
            { icon: 'ac_unit', texto: 'Aire acondicionado' },
            { icon: 'airline_seat_recline_extra', texto: 'Sillas reclinables' },
            { icon: 'power', texto: 'Tomacorriente' },
            { icon: 'wifi', texto: 'GPS, WIFI' },
            { icon: 'wc', texto: '1 Baño' },
            { icon: 'route', texto: 'Origen - Destino (paradas en los Terminales de Transporte y agencias de la empresa)' },
            { icon: 'badge', texto: 'Dos conductores profesionales' },
          ],
          caracteristicasEn: [
            { icon: 'groups', texto: 'Capacity for 38 passengers' },
            { icon: 'ac_unit', texto: 'Air conditioning' },
            { icon: 'airline_seat_recline_extra', texto: 'Reclining seats' },
            { icon: 'power', texto: 'Power outlets' },
            { icon: 'wifi', texto: 'GPS, WIFI' },
            { icon: 'wc', texto: '1 Restroom' },
            { icon: 'route', texto: 'Origin - Destination (stops at Transport Terminals and company agencies)' },
            { icon: 'badge', texto: 'Two professional drivers' },
          ],
        },
        {
          nombre: 'Busetas - Microbuses',
          subtituloEs: 'Servicio Intermunicipal y Regional',
          subtituloEn: 'Intermunicipal & Regional Service',
          icon: 'airport_shuttle',
          destacado: false,
          caracteristicasEs: [
            { icon: 'airline_seat_recline_extra', texto: 'Sillas reclinables' },
            { icon: 'gps_fixed', texto: 'GPS' },
            { icon: 'wifi', texto: 'WIFI' },
            { icon: 'wc', texto: '1 Baño (únicamente en busetas)' },
            { icon: 'pin_drop', texto: 'Origen - Destino (realiza paradas en la vía)' },
            { icon: 'badge', texto: 'Dos conductores profesionales' },
          ],
          caracteristicasEn: [
            { icon: 'airline_seat_recline_extra', texto: 'Reclining seats' },
            { icon: 'gps_fixed', texto: 'GPS' },
            { icon: 'wifi', texto: 'WIFI' },
            { icon: 'wc', texto: '1 Restroom (busetas only)' },
            { icon: 'pin_drop', texto: 'Origin - Destination (makes stops along the route)' },
            { icon: 'badge', texto: 'Two professional drivers' },
          ],
        },
        {
          nombre: 'Camionetas',
          subtituloEs: 'Servicio Ágil y Confiable',
          subtituloEn: 'Agile & Reliable Service',
          icon: 'local_taxi',
          destacado: false,
          caracteristicasEs: [
            { icon: 'gps_fixed', texto: 'GPS' },
            { icon: 'wifi', texto: 'WIFI' },
          ],
          caracteristicasEn: [
            { icon: 'gps_fixed', texto: 'GPS' },
            { icon: 'wifi', texto: 'WIFI' },
          ],
        },
        {
          nombre: 'Aerovans',
          subtituloEs: 'Confort Ejecutivo',
          subtituloEn: 'Executive Comfort',
          icon: 'rv_hookup',
          destacado: false,
          caracteristicasEs: [
            { icon: 'airline_seat_recline_extra', texto: 'Sillas reclinables' },
            { icon: 'wifi', texto: 'GPS, WIFI' },
          ],
          caracteristicasEn: [
            { icon: 'airline_seat_recline_extra', texto: 'Reclining seats' },
            { icon: 'wifi', texto: 'GPS, WIFI' },
          ],
        },
      ],
    },
    transporteEncomiendas: {
      descripcionEs:
        'Transportamos las encomiendas y carga que nos confían nuestros usuarios, utilizando vehículos propios, conducidos por motoristas profesionales e idóneos.',
      descripcionEn:
        'We transport the parcels and cargo entrusted to us by our users, using our own vehicles driven by professional and qualified drivers.',
      oficinas: [
        { ciudad: 'Pasto', sedeEs: 'Avenida Champagnat', sedeEn: 'Champagnat Avenue', direccion: 'Carrera 14 No. 13-26 Avenida Champagnat', celular: '314 814 1852' },
        { ciudad: 'Pasto', sedeEs: 'Terminal de Transportes', sedeEn: 'Transport Terminal', direccion: 'Terminal de Transportes de Pasto', celular: '314 830 08 61' },
        { ciudad: 'Cali', sedeEs: 'Terminal de Transportes', sedeEn: 'Transport Terminal', direccion: 'Terminal de Transportes de Cali', celular: '314 830 0863' },
        { ciudad: 'Cali', sedeEs: 'C.C. Las Américas', sedeEn: 'Las Américas Mall', direccion: 'Carrera 5 No. 16-33 C.C. Las Américas', celular: '318 200 3495' },
        { ciudad: 'Popayán', sedeEs: 'Barrio Santa Clara', sedeEn: 'Santa Clara Neighborhood', direccion: 'Calle 7N No. 9-46 Barrio Santa Clara', celular: '310 238 0733' },
        { ciudad: 'Ipiales', sedeEs: 'Terminal de Transportes', sedeEn: 'Transport Terminal', direccion: 'Terminal de Transportes Nivel 2 Local 2', celular: '314 814 1846' },
        { ciudad: 'Tumaco', sedeEs: 'Calle Las Mercedes', sedeEn: 'Las Mercedes Street', direccion: 'Calle Las Mercedes', celular: '314 814 1851' },
      ],
      rutas: [
        'Ipiales – Pasto y viceversa',
        'Ipiales – Cali y viceversa',
        'Pasto – La Unión y viceversa',
        'Pasto – Popayán y viceversa',
        'Pasto – Cali y viceversa',
        'Pasto – Tumaco y viceversa',
        'Tumaco - Pasto – Cali y viceversa',
      ],
    },
  },
  paginasPublicas: {
    viajes: {
      etiquetaEs: 'Catálogo de viajes',
      etiquetaEn: 'Trip catalog',
      tituloEs: 'Viajes, destinos y rutas',
      tituloEn: 'Trips, destinations and routes',
      subtituloEs:
        'Explora todas las salidas disponibles de Cootranar. Elige un destino o una ruta para ver sus horarios y reserva tu asiento.',
      subtituloEn:
        'Explore every available Cootranar departure. Pick a destination or route to see its schedule and book your seat.',
    },
    encomiendas: {
      etiquetaEs: 'Encomiendas Cootranar',
      etiquetaEn: 'Cootranar Parcels',
      titulo1Es: '¿Quieres enviar una encomienda?',
      titulo1En: 'Want to send a parcel?',
      titulo2Es: 'Nosotros la llevamos.',
      titulo2En: 'We will take it there.',
      subtituloEs:
        'Cotiza en línea, recibe tu código y despacha tu paquete en la oficina más cercana. Rastrea cada paso hasta su destino.',
      subtituloEn:
        'Get an online quote, receive your code and drop off your parcel at the nearest office. Track every step to its destination.',
    },
    footer: {
      tituloEs: '¿Listo para viajar?',
      tituloEn: 'Ready to travel?',
      frasesMarquesinaEs: [
        'Viaja seguro',
        'Rastreo GPS 24/7',
        'Encomiendas a toda la región',
        'Acumula millas',
        'Compra en línea',
      ],
      frasesMarquesinaEn: [
        'Travel safe',
        '24/7 GPS tracking',
        'Parcels across the region',
        'Earn miles',
        'Buy online',
      ],
      instagramUrl: 'https://www.instagram.com/',
      facebookUrl: 'https://www.facebook.com/',
      tiktokUrl: 'https://www.tiktok.com/',
      whatsappUrl: 'https://wa.me/573148141852',
    },
  },
};

const STORAGE_KEY = 'cootranar_contenido_web_cache_v1';

interface ContenidoWebContextValue {
  contenido: ContenidoWebCompleto;
  recargarContenido: () => Promise<void>;
}

const ContenidoWebContext = createContext<ContenidoWebContextValue>({
  contenido: CONTENIDO_WEB_INICIAL,
  recargarContenido: async () => {},
});

export function ContenidoWebProvider({ children }: { children: ReactNode }) {
  const [contenido, setContenido] = useState<ContenidoWebCompleto>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        return { ...CONTENIDO_WEB_INICIAL, ...JSON.parse(guardado) };
      }
    } catch {
      /* sin storage */
    }
    return CONTENIDO_WEB_INICIAL;
  });

  const recargarContenido = async () => {
    try {
      const res = await httpClient.get<{ success: boolean; data: ContenidoWebCompleto }>('/contenido-web');
      if (res.data?.data) {
        setContenido(res.data.data);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.data));
        } catch {
          /* sin storage */
        }
      }
    } catch {
      /* conservar valores locales o predeterminados si el servidor no responde */
    }
  };

  useEffect(() => {
    recargarContenido();
  }, []);

  return (
    <ContenidoWebContext.Provider value={{ contenido, recargarContenido }}>
      {children}
    </ContenidoWebContext.Provider>
  );
}

export function useContenidoWeb() {
  return useContext(ContenidoWebContext);
}
