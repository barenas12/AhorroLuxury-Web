<script setup lang="ts">
import { computed, ref } from 'vue'

export interface UserSession {
  id?: number
  username?: string
  full_name?: string
  name?: string
  lastName?: string
  user?: string
  profile?: number | string
  resetPassword?: number
  status?: number
}

export interface SidebarItem {
  id: string
  label: string
  icon: string
  isImage: boolean
  badge?: string
  requiredProfiles?: number[]
}

interface Props {
  user: UserSession
  activeSection?: string
}

const props = withDefaults(defineProps<Props>(), {
  activeSection: 'resumen'
})

const emit = defineEmits<{
  (e: 'select-section', sectionId: string): void
  (e: 'logout'): void
}>()

// Menú del Sidebar con soporte para restricciones de perfil
// En src/components/Sidebar.vue
const menuItems = ref<SidebarItem[]>([
  { id: 'resumen', label: 'Dashboard', icon: '/icon/dashboard.png', isImage: true },
  { id: 'usuarios', label: 'Usuarios', icon: '/icon/users.png', requiredProfiles: [1, 2], isImage: true },
  { id: 'ahorro', label: 'Ahorro Programado', icon: '/icon/savings.png', isImage: true },
  { id: 'rifa1', label: 'Rifa Mensual 1', icon: '/icon/raffle.png', isImage: true }, // 👈 Cambiado de 'rifa-1' a 'rifa1'
  { id: 'rifa2', label: 'Rifa Mensual 2', icon: '/icon/raffle.png', isImage: true }, // 👈 Cambiado de 'rifa-2' a 'rifa2'
  { id: 'prestamos', label: 'Préstamos y Respaldos', icon: '/icon/loans.png', isImage: true },
  { id: 'pagos', label: 'Control de Pagos y Multas', icon: '/icon/pay.png', isImage: true },
])

// 1. Obtener el nombre para mostrar
const displayName = computed<string>(() => {
  return (
    props.user.full_name ||
    (props.user.name && props.user.lastName
      ? `${props.user.name} ${props.user.lastName}`.trim()
      : '') ||
    props.user.name ||
    props.user.user ||
    props.user.username ||
    'Usuario'
  )
})

// 2. Inicial para el círculo del avatar
const userInitial = computed<string>(() => {
  return displayName.value.trim().charAt(0).toUpperCase() || 'U'
})

// 3. Mapeo estricto del Rol (1: Administrador, 2: Coordinador, 3: Usuario)
const roleLabel = computed<string>(() => {
  const profileNum = Number(props.user.profile)
  switch (profileNum) {
    case 1:
      return 'Administrador'
    case 2:
      return 'Coordinador'
    case 3:
      return 'Usuario'
    default:
      return 'Usuario'
  }
})

// 4. Clases visuales según el rol
const roleBadgeClass = computed<string>(() => {
  const profileNum = Number(props.user.profile)
  if (profileNum === 1) return 'role-admin'
  if (profileNum === 2) return 'role-coord'
  return 'role-user'
})

// 5. Filtro de items visibles según el perfil
const visibleMenuItems = computed<SidebarItem[]>(() => {
  const currentProfile = Number(props.user.profile)
  return menuItems.value.filter((item) => {
    if (!item.requiredProfiles || item.requiredProfiles.length === 0) {
      return true
    }
    return item.requiredProfiles.includes(currentProfile)
  })
})

const isCollapsed = ref<boolean>(false)

const toggleSidebar = (): void => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <aside :class="['sidebar', { collapsed: isCollapsed }]">
    <!-- Cabecera del Sidebar -->
    <div class="sidebar-brand">
      <img src="/img/logo-luxury.png" alt="Ahorro Luxury" class="logo-image" />
      <div class="brand-info">
        <h3>Ahorro Luxury</h3>
        <span class="portal-tag">Panel de Gestión</span>
      </div>
      <button
        type="button"
        class="toggle-sidebar"
        :aria-label="isCollapsed ? 'Expandir menú' : 'Contraer menú'"
        :title="isCollapsed ? 'Expandir menú' : 'Contraer menú'"
        @click="toggleSidebar"
      >
        {{ isCollapsed ? '>' : '<' }}
      </button>
    </div>

    <!-- Chip del Usuario Logueado -->
    <div class="user-chip">
      <div class="user-avatar">{{ userInitial }}</div>
      <div class="user-details">
        <span class="user-name" :title="displayName">{{ displayName }}</span>
        <span :class="['role-badge', roleBadgeClass]">{{ roleLabel }}</span>
      </div>
    </div>

    <!-- Navegación -->
    <nav class="sidebar-nav">
      <ul>
        <li v-for="item in visibleMenuItems" :key="item.id">
          <button
            type="button"
            :class="['nav-btn', { active: props.activeSection === item.id }]"
            @click="emit('select-section', item.id)"
          >
            <span class="icon">
              <img
                v-if="item.isImage"
                :src="item.icon"
                :alt="item.label"
                class="icon-image"
              />
              <span v-else>{{ item.icon }}</span>
            </span>
            <span class="label">{{ item.label }}</span>
            <span v-if="item.badge" class="badge">{{ item.badge }}</span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- Botón Cerrar Sesión -->
    <div class="sidebar-footer">
      <button type="button" class="btn-logout" @click="emit('logout')">
        <span class="icon">🚪</span>
        <span>Cerrar Sesión</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  flex: 0 0 280px;
  min-height: calc(100vh - 70px);
  background-color: #ffffff;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  transition: width 0.25s ease, flex-basis 0.25s ease, padding 0.25s ease;
  overflow: hidden;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding-bottom: 1.2rem;
  border-bottom: 1px solid var(--color-border);
  min-height: 48px;
  position: relative;
}

.logo-image {
  width: 52px;
  height: 52px;
  min-width: 52px;
  object-fit: contain;
}

.brand-info h3 {
  font-size: 1.1rem;
  color: var(--color-primary);
  margin: 0;
}

.portal-tag {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.toggle-sidebar {
  margin-left: auto;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: #ffffff;
  color: var(--color-primary);
  font-family: Arial, sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1;
  padding: 0;
  cursor: pointer;
}

/* Ficha del usuario */
.user-chip {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 1.2rem 0;
  padding: 0.75rem 0.9rem;
  background-color: var(--color-bg-light);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

.user-avatar {
  width: 38px;
  height: 38px;
  min-width: 38px;
  background-color: var(--color-primary);
  color: #ffffff;
  border-radius: 50%;
  display: grid;
  place-content: center;
  font-weight: 700;
  font-size: 1rem;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.role-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 12px;
  width: fit-content;
}

.role-admin {
  background-color: rgba(8, 28, 45, 0.12);
  color: var(--color-primary);
}

.role-coord {
  background-color: rgba(31, 122, 99, 0.15);
  color: var(--color-secondary);
}

.role-user {
  background-color: #e2e8f0;
  color: #4a5568;
}

/* Navegación */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
}

.sidebar-nav ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0;
  margin: 0;
}

.nav-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-radius: 8px;
  color: #4a5568;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.nav-btn:hover {
  background-color: var(--color-bg-light);
  color: var(--color-primary);
}

.nav-btn.active {
  background-color: rgba(31, 122, 99, 0.1);
  color: var(--color-secondary);
  font-weight: 700;
}

.icon {
  font-size: 1.1rem;
  width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-image {
  width: 1.1rem;
  height: 1.1rem;
  object-fit: contain;
}

.label {
  flex: 1;
}

.badge {
  font-size: 0.75rem;
  background: var(--color-secondary);
  color: #ffffff;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
}

/* Pie del Sidebar */
.sidebar-footer {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.btn-logout {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  color: #e53e3e;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn-logout:hover {
  background-color: #fee2e2;
}

.sidebar.collapsed {
  width: 72px;
  flex-basis: 72px;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.sidebar.collapsed .sidebar-brand {
  justify-content: center;
}

.sidebar.collapsed .brand-info,
.sidebar.collapsed .user-details,
.sidebar.collapsed .label,
.sidebar.collapsed .btn-logout span:not(.icon) {
  display: none;
}

.sidebar.collapsed .toggle-sidebar {
  position: absolute;
  top: 1.5rem;
  right: -0.35rem;
  width: 24px;
  height: 24px;
  background: var(--color-primary);
  color: #ffffff;
  border: none;
  padding: 0;
}

.sidebar.collapsed .user-chip {
  justify-content: center;
  padding: 0.75rem 0.25rem;
}

.sidebar.collapsed .nav-btn,
.sidebar.collapsed .btn-logout {
  justify-content: center;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

@media (max-width: 768px) {
  .sidebar {
    width: 72px;
    flex-basis: 72px;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .sidebar .brand-info,
  .sidebar .user-details,
  .sidebar .label,
  .sidebar .btn-logout span:not(.icon) {
    display: none;
  }

  .sidebar .sidebar-brand,
  .sidebar .nav-btn,
  .sidebar .btn-logout {
    justify-content: center;
  }

  .sidebar .user-chip {
    justify-content: center;
    padding: 0.75rem 0.25rem;
  }
}
</style>