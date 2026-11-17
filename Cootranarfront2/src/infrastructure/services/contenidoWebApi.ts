import { httpClient } from '../api/httpClient';

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

const BASE = '/contenido-web';

export const contenidoWebApi = {
  obtener: () =>
    httpClient.get<{ success: boolean; data: ContenidoWebCompleto }>(BASE),

  guardar: (data: ContenidoWebCompleto) =>
    httpClient.put<{ success: boolean; data: ContenidoWebCompleto }>(BASE, data),

  restaurar: () =>
    httpClient.post<{ success: boolean; data: ContenidoWebCompleto }>(`${BASE}/restaurar`, {}),

  subirImagen: (archivo: File) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return httpClient.post<{ success: boolean; data: { url: string } }>(
      `${BASE}/imagenes`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};

export default contenidoWebApi;
