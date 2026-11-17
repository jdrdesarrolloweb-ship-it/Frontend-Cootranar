export type UserRole = 'ADMINISTRADOR' | 'TAQUILLERO' | 'EMPLEADO_ENCOMIENDAS' | 'ALMACENISTA' | 'CONTADOR' | 'OPERADOR';

export interface User {
  idusuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  nombrerol: string;
  activo: boolean;
  fotoperfil?: string | null;
  roles?: string[];
  rolActivo?: string;
}
