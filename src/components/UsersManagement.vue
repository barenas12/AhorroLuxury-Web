<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { buildScopeQuery, isAdminUser, type ViewerUser } from '../utils/viewerScope'

const props = defineProps<{
  currentUser?: ViewerUser
}>()

const isAdmin = computed(() => isAdminUser(props.currentUser))

export interface PartnerUser {
  id: number
  documentId: string
  name: string
  lastName: string
  fullName: string
  savingsValue: number
  quotaValue?: number
  frequency: number
  savingsStartDate?: string | null
  cellphone: number | string
  coordinator: number
  coordinatorName: string
  partnerStatus: number
  profile: number
  userLoginStatus: number
  resetPassword: number
  ticket?: string | string[]
  ticket2?: string | string[]
}

export interface CoordinatorOption {
  id: number
  fullName: string
  profile: number
}

const users = ref<PartnerUser[]>([])
const coordinators = ref<CoordinatorOption[]>([])
const searchColumn = ref<'todas' | 'fullName' | 'documentId' | 'cellphone' | 'frequency' | 'ticket' | 'ticket2' | 'coordinatorName'>('todas')
const searchQuery = ref<string>('')
const statusFilter = ref<string>('todos')
const isLoading = ref<boolean>(false)
const showModal = ref<boolean>(false)
const isEditing = ref<boolean>(false)
const isSaving = ref<boolean>(false)
const modalError = ref<string>('')

const today = new Date().toISOString().substring(0, 10)

// Inputs reactivos para cada rifa en el modal
const newTicket1Input = ref<string>('')
const newTicket2Input = ref<string>('')

const form = ref({
  id: 0,
  documentId: '',
  name: '',
  lastName: '',
  savingsValue: 50000,
  frequency: 15,
  savingsStartDate: today,
  cellphone: '' as string | number,
  coordinator: 0,
  profile: 3,
  canLogin: true,
  ticket: [] as string[],
  ticket2: [] as string[]
})

const calculateQuota = (monthly: number, freq: number): number => {
  const val = Number(monthly) || 0
  const f = Number(freq) || 30
  if (f === 15) return Math.round(val / 2)
  if (f === 8) return Math.round(val / 4)
  return Math.round(val)
}

const formCalculatedQuota = computed(() => calculateQuota(form.value.savingsValue, form.value.frequency))

// Parsea boletas seguras desde JSON o string delimitado
const parseTickets = (raw: string | string[] | undefined): string[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw.split(',').map(t => t.trim()).filter(Boolean)
  }
}

// Carga inicial
const loadData = async (): Promise<void> => {
  isLoading.value = true
  try {
    const qs = buildScopeQuery(props.currentUser)
    const [resUsers, resCoords] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/api/users${qs ? `?${qs}` : ''}`),
      fetch(`${import.meta.env.VITE_API_URL}/api/users/coordinators`)
    ])

    const dataUsers = await resUsers.json()
    const dataCoords = await resCoords.json()

    if (dataUsers.success) users.value = dataUsers.data
    if (dataCoords.success) coordinators.value = dataCoords.data
  } catch (err) {
    console.error('Error al cargar socios:', err)
  } finally {
    isLoading.value = false
  }
}

const getProfileName = (profile: number): string => {
  if (Number(profile) === 1) return 'Administrador'
  if (Number(profile) === 2) return 'Coordinador'
  return 'Socio'
}

// Búsqueda y filtrado por columna seleccionada (o Todas)
const filteredUsers = computed(() => {
  let list = users.value
  const q = searchQuery.value.toLowerCase().trim()

  if (statusFilter.value === 'activos') {
    list = list.filter(u => u.partnerStatus === 1)
  } else if (statusFilter.value === 'inactivos') {
    list = list.filter(u => u.partnerStatus === 0)
  }

  if (q) {
    list = list.filter(u => {
      switch (searchColumn.value) {
        case 'fullName':
          return u.fullName.toLowerCase().includes(q)
        case 'documentId':
          return String(u.documentId || '').toLowerCase().includes(q)
        case 'cellphone':
          return String(u.cellphone || '').toLowerCase().includes(q)
        case 'frequency': {
          const freqNum = Number(u.frequency)
          const numericQuery = /^\d+$/.test(q) ? Number(q) : null
          if (numericQuery !== null) {
            return freqNum === numericQuery
          }
          return getFrequencyLabel(freqNum).toLowerCase().includes(q)
        }
        case 'ticket':
          return parseTickets(u.ticket).some(t => t.includes(q))
        case 'ticket2':
          return parseTickets(u.ticket2).some(t => t.includes(q))
        case 'coordinatorName':
          return (u.coordinatorName || '').toLowerCase().includes(q)
        default:
          return (
            u.fullName.toLowerCase().includes(q) ||
            String(u.documentId || '').toLowerCase().includes(q) ||
            String(u.cellphone || '').toLowerCase().includes(q) ||
            (u.coordinatorName || '').toLowerCase().includes(q) ||
            parseTickets(u.ticket).some(t => t.includes(q)) ||
            parseTickets(u.ticket2).some(t => t.includes(q))
          )
      }
    })
  }
  return list
})

// Métricas de socios
const totalActivos = computed(() => users.value.filter(u => u.partnerStatus === 1).length)
const totalInactivos = computed(() => users.value.filter(u => u.partnerStatus === 0).length)

// ================= GESTIÓN BOLETAS RIFA 1 =================
const addTicket1 = () => {
  modalError.value = ''
  const raw = String(newTicket1Input.value || '').trim()
  if (!raw) return
  const num = parseInt(raw, 10)
  if (isNaN(num) || num < 0 || num > 99) {
    modalError.value = 'El número de Rifa 1 debe estar entre 00 y 99.'
    return
  }
  const formatted = num.toString().padStart(2, '0')
  if (form.value.ticket.includes(formatted)) {
    modalError.value = `El número ${formatted} ya está agregado en Rifa 1.`
    return
  }
  form.value.ticket.push(formatted)
  form.value.ticket.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  newTicket1Input.value = ''
}

const removeTicket1 = (t: string) => {
  form.value.ticket = form.value.ticket.filter(item => item !== t)
}

// ================= GESTIÓN BOLETAS RIFA 2 =================
const addTicket2 = () => {
  modalError.value = ''
  const raw = String(newTicket2Input.value || '').trim()
  if (!raw) return
  const num = parseInt(raw, 10)
  if (isNaN(num) || num < 0 || num > 99) {
    modalError.value = 'El número de Rifa 2 debe estar entre 00 y 99.'
    return
  }
  const formatted = num.toString().padStart(2, '0')
  if (form.value.ticket2.includes(formatted)) {
    modalError.value = `El número ${formatted} ya está agregado en Rifa 2.`
    return
  }
  form.value.ticket2.push(formatted)
  form.value.ticket2.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  newTicket2Input.value = ''
}

const removeTicket2 = (t: string) => {
  form.value.ticket2 = form.value.ticket2.filter(item => item !== t)
}

// Apertura de Modales
const openCreateModal = () => {
  isEditing.value = false
  modalError.value = ''
  newTicket1Input.value = ''
  newTicket2Input.value = ''
  form.value = {
    id: 0,
    documentId: '',
    name: '',
    lastName: '',
    savingsValue: 100000,
    frequency: 15,
    savingsStartDate: today,
    cellphone: '',
    coordinator: coordinators.value[0]?.id || 0,
    profile: 3,
    canLogin: true,
    ticket: [],
    ticket2: []
  }
  showModal.value = true
}

const openEditModal = (user: PartnerUser) => {
  isEditing.value = true
  modalError.value = ''
  newTicket1Input.value = ''
  newTicket2Input.value = ''
  form.value = {
    id: user.id,
    documentId: user.documentId,
    name: user.name,
    lastName: user.lastName,
    savingsValue: Number(user.savingsValue),
    frequency: Number(user.frequency) || 15,
    savingsStartDate: user.savingsStartDate ? String(user.savingsStartDate).substring(0, 10) : '',
    cellphone: user.cellphone ?? '',
    coordinator: user.coordinator,
    profile: Number(user.profile),
    canLogin: user.userLoginStatus === 1,
    ticket: [...parseTickets(user.ticket)],
    ticket2: [...parseTickets(user.ticket2)]
  }
  showModal.value = true
}

// Guardar (Crear / Editar)
const submitUser = async () => {
  modalError.value = ''
  if (!form.value.documentId || !form.value.name || !form.value.lastName) {
    modalError.value = 'Cédula, nombre y apellidos son campos obligatorios.'
    return
  }

  isSaving.value = true
  try {
    const url = isEditing.value
      ? `${import.meta.env.VITE_API_URL}/api/users/${form.value.id}`
      : `${import.meta.env.VITE_API_URL}/api/users`
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form.value,
        savingsStartDate: form.value.savingsStartDate || null
      })
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al guardar socio.')
    }

    showModal.value = false
    await loadData()
  } catch (err: any) {
    modalError.value = err.message
  } finally {
    isSaving.value = false
  }
}

// Cambiar estado Activo / Inactivo
const toggleStatus = async (user: PartnerUser) => {
  const newStatus = user.partnerStatus === 1 ? 0 : 1
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: user.documentId, status: newStatus })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'No se pudo cambiar el estado del socio.')
    }

    user.partnerStatus = newStatus
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Error al cambiar el estado del socio.')
  }
}

// Restablecer contraseña
const resetPassword = async (user: PartnerUser) => {
  if (!confirm(`¿Restablecer la contraseña de ${user.fullName} a su documento de identidad?`)) return
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: user.documentId })
    })
    const data = await res.json()
    if (data.success) {
      alert(`Contraseña de ${user.fullName} restablecida exitosamente.`)
    } else {
      alert(data.message || 'No se pudo restablecer la contraseña.')
    }
  } catch (err) {
    console.error('Error al restablecer contraseña:', err)
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount)
}

const getFrequencyLabel = (days: number) => {
  if (days === 8) return 'Semanal (8 d)'
  if (days === 15) return 'Quincenal (15 d)'
  if (days === 30) return 'Mensual (30 d)'
  return `${days} días`
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="users-view">
    <!-- Cabecera -->
    <div class="view-header">
      <div>
        <h2>Gestión de Socios y Usuarios</h2>
        <p>Administración general, asignación de rifas, fecha de inicio de ahorro y perfiles de acceso.</p>
      </div>
      <button v-if="isAdmin" type="button" class="btn-create" @click="openCreateModal">
        <span>+</span> Registrar Socio
      </button>
    </div>

    <!-- Estadísticas -->
    <div class="stats-row">
      <div class="stat-card primary">
        <span class="stat-label">Total Socios</span>
        <strong class="stat-value">{{ users.length }}</strong>
      </div>
      <div class="stat-card green">
        <span class="stat-label">Socios Activos</span>
        <strong class="stat-value">{{ totalActivos }}</strong>
      </div>
      <div class="stat-card orange">
        <span class="stat-label">Socios Inactivos</span>
        <strong class="stat-value">{{ totalInactivos }}</strong>
      </div>
    </div>

    <!-- Barra de Filtros -->
    <div class="filters-bar">
      <div class="column-filter-group">
        <select v-model="searchColumn" class="column-select" @change="searchQuery = ''">
          <option value="todas">Columna: Todas</option>
          <option value="fullName">Socio (Nombre)</option>
          <option value="documentId">Cédula</option>
          <option value="cellphone">Celular</option>
          <option value="frequency">Frecuencia</option>
          <option value="ticket">Boleta Rifa 1</option>
          <option value="ticket2">Boleta Rifa 2</option>
          <option value="coordinatorName">Coordinador</option>
        </select>

        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Escribe el valor a filtrar..."
          />
          <button v-if="searchQuery" class="btn-clear" @click="searchQuery = ''">✕</button>
        </div>
      </div>

      <div class="status-tabs">
        <button
          :class="['tab-btn', { active: statusFilter === 'todos' }]"
          @click="statusFilter = 'todos'"
        >
          Todos
        </button>
        <button
          :class="['tab-btn', { active: statusFilter === 'activos' }]"
          @click="statusFilter = 'activos'"
        >
          Activos
        </button>
        <button
          :class="['tab-btn', { active: statusFilter === 'inactivos' }]"
          @click="statusFilter = 'inactivos'"
        >
          Inactivos
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Socio</th>
            <th>Cédula</th>
            <th>Celular</th>
            <th>Ahorro / Cuota</th>
            <th>Inicio Ahorro</th>
            <th>Rifa 1</th>
            <th>Rifa 2</th>
            <th>Coordinador</th>
            <th>Estado</th>
            <th v-if="isAdmin">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td :colspan="isAdmin ? 10 : 9" class="center-text">Cargando socios...</td>
          </tr>
          <tr v-else-if="filteredUsers.length === 0">
            <td :colspan="isAdmin ? 10 : 9" class="center-text empty-state">No se encontraron socios con los filtros actuales.</td>
          </tr>
          <template v-else>
          <tr v-for="(u, idx) in filteredUsers" :key="`${u.id}-${idx}`" :class="{ 'row-inactive': u.partnerStatus === 0 }">
            <td>
              <strong>{{ u.fullName }}</strong>
              <small class="sub-text">
                Perfil: {{ getProfileName(Number(u.profile)) }}
              </small>
            </td>
            <td>{{ u.documentId }}</td>
            <td>{{ u.cellphone }}</td>
            <td>
              <span class="money-text">
                {{ formatCurrency(u.quotaValue ?? calculateQuota(Number(u.savingsValue), Number(u.frequency))) }}
              </span>
              <small class="sub-text">
                {{ getFrequencyLabel(Number(u.frequency)) }} · Mes: {{ formatCurrency(Number(u.savingsValue)) }}
              </small>
            </td>
            <td>
              <span v-if="u.savingsStartDate" class="start-date-pill">{{ u.savingsStartDate }}</span>
              <span v-else class="no-ticket-text">Sin definir</span>
            </td>
            <td>
              <div class="tickets-tag-container">
                <span v-for="t in parseTickets(u.ticket)" :key="t" class="ticket-badge r1">
                  #{{ t }}
                </span>
                <span v-if="parseTickets(u.ticket).length === 0" class="no-ticket-text">-</span>
              </div>
            </td>
            <td>
              <div class="tickets-tag-container">
                <span v-for="t in parseTickets(u.ticket2)" :key="t" class="ticket-badge r2">
                  #{{ t }}
                </span>
                <span v-if="parseTickets(u.ticket2).length === 0" class="no-ticket-text">-</span>
              </div>
            </td>
            <td>{{ u.coordinatorName }}</td>
            <td>
              <span :class="['status-pill', u.partnerStatus === 1 ? 'active' : 'inactive']">
                {{ u.partnerStatus === 1 ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td v-if="isAdmin">
              <div class="action-buttons">
                <button type="button" class="btn-action edit" @click="openEditModal(u)" title="Editar Socio">✏️</button>
                <button
                  type="button"
                  :class="['btn-action', u.partnerStatus === 1 ? 'deactivate' : 'activate']"
                  @click="toggleStatus(u)"
                  :title="u.partnerStatus === 1 ? 'Desactivar Socio' : 'Activar Socio'"
                >
                  {{ u.partnerStatus === 1 ? '🚫' : '✅' }}
                </button>
                <button type="button" class="btn-action reset" @click="resetPassword(u)" title="Restablecer Contraseña">🔑</button>
              </div>
            </td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- MODAL CREAR / EDITAR SOCIO -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-top">
          <h3>{{ isEditing ? 'Editar Socio' : 'Registrar Nuevo Socio' }}</h3>
          <button type="button" class="btn-close" @click="showModal = false">✕</button>
        </div>

        <div v-if="modalError" class="modal-error">{{ modalError }}</div>

        <form @submit.prevent="submitUser" class="modal-form">
          <div class="form-row">
            <div class="field">
              <label>Cédula / Documento *</label>
              <input type="text" v-model="form.documentId" required :disabled="isEditing" />
            </div>
            <div class="field">
              <label>Celular *</label>
              <input type="text" v-model="form.cellphone" required />
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Nombres *</label>
              <input type="text" v-model="form.name" required />
            </div>
            <div class="field">
              <label>Apellidos *</label>
              <input type="text" v-model="form.lastName" required />
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Ahorro Total Mensual ($) *</label>
              <input type="number" v-model="form.savingsValue" min="10000" step="5000" required />
              <small class="quota-hint">
                Cuota por pago: <strong>{{ formatCurrency(formCalculatedQuota) }}</strong>
              </small>
            </div>

            <div class="field">
              <label>Frecuencia de Ahorro *</label>
              <select v-model="form.frequency" required>
                <option :value="8">Cada 8 Días (Semanal ÷ 4)</option>
                <option :value="15">Cada 15 Días (Quincenal ÷ 2)</option>
                <option :value="30">Cada 30 Días (Mensual ÷ 1)</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Fecha Inicio de Ahorro *</label>
              <input type="date" v-model="form.savingsStartDate" required />
            </div>

            <div class="field">
              <label>Coordinador Asignado *</label>
              <select v-model="form.coordinator" required>
                <option :value="0" disabled>-- Seleccionar Coordinador --</option>
                <option v-for="c in coordinators" :key="c.id" :value="c.id">
                  {{ c.fullName }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Perfil en el Sistema</label>
              <select v-model="form.profile">
                <option :value="1">Administrador</option>
                <option :value="2">Coordinador</option>
                <option :value="3">Socio</option>
              </select>
            </div>

            <div class="field checkbox-field" style="justify-content: flex-end; padding-bottom: 0.4rem;">
              <label class="switch-box">
                <input type="checkbox" v-model="form.canLogin" />
                <span>¿Habilitar acceso al sistema web (Login)?</span>
              </label>
            </div>
          </div>

          <!-- SECCIÓN RIFA 1 -->
          <div class="ticket-box r1-border">
            <label class="ticket-box-title">Números de Boleta - Rifa 1 (00 al 99)</label>
            <div class="ticket-input-group">
              <input
                type="text"
                maxlength="2"
                v-model="newTicket1Input"
                placeholder="Ej. 07"
                @keydown.enter.prevent="addTicket1"
              />
              <button type="button" class="btn-add-ticket r1-btn" @click="addTicket1">+ Agregar Rifa 1</button>
            </div>
            <div class="ticket-tags-list">
              <span v-for="t in form.ticket" :key="t" class="ticket-tag r1-tag">
                Boleta #{{ t }}
                <button type="button" @click="removeTicket1(t)">✕</button>
              </span>
              <span v-if="form.ticket.length === 0" class="no-tickets-selected">
                Sin boletas asignadas en Rifa 1.
              </span>
            </div>
          </div>

          <!-- SECCIÓN RIFA 2 -->
          <div class="ticket-box r2-border">
            <label class="ticket-box-title">Números de Boleta - Rifa 2 (00 al 99)</label>
            <div class="ticket-input-group">
              <input
                type="text"
                maxlength="2"
                v-model="newTicket2Input"
                placeholder="Ej. 42"
                @keydown.enter.prevent="addTicket2"
              />
              <button type="button" class="btn-add-ticket r2-btn" @click="addTicket2">+ Agregar Rifa 2</button>
            </div>
            <div class="ticket-tags-list">
              <span v-for="t in form.ticket2" :key="t" class="ticket-tag r2-tag">
                Boleta #{{ t }}
                <button type="button" @click="removeTicket2(t)">✕</button>
              </span>
              <span v-if="form.ticket2.length === 0" class="no-tickets-selected">
                Sin boletas asignadas en Rifa 2.
              </span>
            </div>
          </div>

          <div class="modal-buttons">
            <button type="button" class="btn-cancel" @click="showModal = false">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="isSaving">
              {{ isSaving ? 'Guardando...' : (isEditing ? 'Actualizar Socio' : 'Crear Socio') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.users-view { width: 100%; display: flex; flex-direction: column; gap: 1.8rem; }
.view-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.view-header h2 { color: var(--color-primary); font-size: 1.7rem; margin: 0; }
.view-header p { color: var(--color-muted); font-size: 0.95rem; margin-top: 0.2rem; }
.btn-create { background-color: var(--color-secondary); color: #fff; border: none; padding: 0.75rem 1.4rem; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(31, 122, 99, 0.25); }
.btn-create:hover { opacity: 0.92; transform: translateY(-1px); }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.2rem; }
.stat-card { background: #fff; padding: 1.3rem 1.6rem; border-radius: 8px; border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.stat-card.primary { border-left: 5px solid var(--color-primary); }
.stat-card.green { border-left: 5px solid var(--color-secondary); }
.stat-card.orange { border-left: 5px solid #dd6b20; }
.stat-label { font-size: 0.85rem; color: var(--color-muted); font-weight: 600; }
.stat-value { font-size: 1.55rem; color: var(--color-primary); }

.filters-bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.column-filter-group { display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 280px; max-width: 640px; flex-wrap: wrap; }
.column-select { padding: 0.72rem 0.9rem; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; font-weight: 600; color: var(--color-primary); font-size: 0.88rem; }
.search-box { position: relative; flex: 1; min-width: 200px; }
.search-box input { width: 100%; padding: 0.75rem 2.4rem 0.75rem 2.6rem; border: 1px solid var(--color-border); border-radius: 8px; background-color: #fff; }
.search-icon { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); opacity: 0.6; }
.btn-clear { position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; }
.status-tabs { display: flex; background: #e2e8f0; border-radius: 8px; padding: 0.25rem; }
.tab-btn { border: none; background: none; padding: 0.55rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.88rem; color: #4a5568; }
.tab-btn.active { background: #fff; color: var(--color-primary); box-shadow: 0 2px 5px rgba(0,0,0,0.08); }

.table-container { width: 100%; background: #fff; border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.92rem; }
th, td { padding: 0.95rem 1.1rem; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
th { background-color: #f7fafc; color: var(--color-primary); font-weight: 700; font-size: 0.85rem; text-transform: uppercase; }
.row-inactive td { opacity: 0.6; background-color: #f7fafc; }
.money-text { font-weight: 700; color: var(--color-primary); display: block; }
.sub-text { display: block; font-size: 0.75rem; color: #718096; }
.start-date-pill { background: #edf2f7; color: #2d3748; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.82rem; font-weight: 600; }
.center-text { text-align: center; padding: 2rem; color: #718096; }

.tickets-tag-container { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.ticket-badge { padding: 0.15rem 0.45rem; border-radius: 6px; font-weight: 700; font-size: 0.75rem; }
.ticket-badge.r1 { background-color: #feebc8; color: #744210; border: 1px solid #fbd38d; }
.ticket-badge.r2 { background-color: #bee3f8; color: #2b6cb0; border: 1px solid #90cdf4; }
.no-ticket-text { color: #a0aec0; }

.status-pill { padding: 0.25rem 0.65rem; border-radius: 12px; font-size: 0.78rem; font-weight: 700; }
.status-pill.active { background-color: #c6f6d5; color: #22543d; }
.status-pill.inactive { background-color: #fed7d7; color: #9b2c2c; }

.action-buttons { display: flex; gap: 0.4rem; }
.btn-action { border: 1px solid var(--color-border); background: #fff; padding: 0.35rem 0.55rem; border-radius: 6px; cursor: pointer; }
.btn-action:hover { background: #edf2f7; }

.modal-overlay { position: fixed; inset: 0; background: rgba(8,28,45,0.65); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1.5rem; }
.modal-box { background: #fff; border-radius: 8px; width: 650px; max-width: 100%; padding: 2rem; max-height: 92vh; overflow-y: auto; }
.modal-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 1rem; margin-bottom: 1.2rem; }
.modal-top h3 { margin: 0; color: var(--color-primary); }
.btn-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; }
.modal-error { background: #fee2e2; color: #991b1b; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }
.modal-form { display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--color-primary); }
.field input, .field select { padding: 0.7rem; border: 1px solid var(--color-border); border-radius: 6px; }
.quota-hint { font-size: 0.78rem; color: var(--color-secondary); }
.switch-box { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem; }

.ticket-box { padding: 1rem; border-radius: 8px; border: 1px solid var(--color-border); background: #f8fafc; }
.r1-border { border-left: 4px solid #dd6b20; }
.r2-border { border-left: 4px solid #3182ce; }
.ticket-box-title { display: block; font-size: 0.85rem; font-weight: 700; color: var(--color-primary); margin-bottom: 0.6rem; }
.ticket-input-group { display: flex; gap: 0.6rem; margin-bottom: 0.7rem; }
.ticket-input-group input { width: 100px; padding: 0.5rem 0.7rem; border: 1px solid var(--color-border); border-radius: 6px; }
.btn-add-ticket { border: none; color: #fff; padding: 0.5rem 0.9rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
.r1-btn { background: #dd6b20; }
.r2-btn { background: #3182ce; }
.ticket-tags-list { display: flex; gap: 0.45rem; flex-wrap: wrap; }
.ticket-tag { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; }
.r1-tag { background: #feebc8; color: #744210; }
.r2-tag { background: #bee3f8; color: #2b6cb0; }
.ticket-tag button { background: none; border: none; cursor: pointer; font-weight: 700; color: inherit; }
.no-tickets-selected { font-size: 0.8rem; color: #a0aec0; }

.modal-buttons { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
.btn-cancel { background: none; border: 1px solid var(--color-border); padding: 0.7rem 1.4rem; border-radius: 6px; cursor: pointer; }
.btn-save { background: var(--color-secondary); color: #fff; border: none; padding: 0.7rem 1.4rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.5; }
</style>
