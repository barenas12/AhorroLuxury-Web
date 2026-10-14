export interface UserSession {
  id: number
  username: string
  full_name: string
  profile: number // 1: Administrador, 2: Coordinador, 3+: Socio / Otro
  role?: string
}

export interface SidebarItem {
  id: string
  label: string
  icon: string
  badge?: string
  requiredProfiles?: number[] // Opcional: si quieres ocultar items del menú según el perfil
}