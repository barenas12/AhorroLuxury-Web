<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

export interface PartnerUser {
  id: number
  documentId: string
  name: string
  lastName: string
  fullName: string
  savingsValue: number
  frequency: number
  cellphone: number
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
const searchQuery = ref<string>('')
const statusFilter = ref<string>('todos')
const isLoading = ref<boolean>(false)
const showModal = ref<boolean>(false)
const isEditing = ref<boolean>(false)
const isSaving = ref<boolean>(false)
const modalError = ref<string>('')

// Inputs reactivos para cada rifa en el modal
const newTicket1Input = ref<string>('')
const newTicket2Input = ref<string>('')

// Formulario maestro
const form = ref({
  id: 0,
  documentId: '',
  name: '',
  lastName: '',
  savingsValue: 50000,
  frequency: 8,
  cellphone: 0,
  coordinator: 0,
  profile: 3,
  canLogin: true,
  ticket: [] as string[],
  ticket2: [] as string[]
})

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
    const [resUsers, resCoords] = await Promise.all([
      fetch('http://localhost:3000/api/users'),
      fetch('http://localhost:3000/api/users/coordinators')
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

// Búsqueda y filtrado
const filteredUsers = computed(() => {
  let list = users.value
  const q = searchQuery.value.toLowerCase().trim()

  if (statusFilter.value === 'activos') {
    list = list.filter(u => u.partnerStatus === 1)
  } else if (statusFilter.value === 'inactivos') {
    list = list.filter(u => u.partnerStatus === 0)
  }

  if (q) {
    list = list.filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      u.documentId.toLowerCase().includes(q) ||
      u.coordinatorName.toLowerCase().includes(q) ||
      parseTickets(u.ticket).some(t => t.includes(q)) ||
      parseTickets(u.ticket2).some(t => t.includes(q))
    )
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
    savingsValue: 50000,
    frequency: 8,
    cellphone: 0,
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
    frequency: Number(user.frequency),
    cellphone: Number(user.cellphone),
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
      ? `http://localhost:3000/api/users/${form.value.id}` 
      : 'http://localhost:3000/api/users'
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
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
    const res = await fetch(`http://localhost:3000/api/users/status/${user.documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    const data = await res.json()
    if (data.success) {
      user.partnerStatus = newStatus
    }
  } catch (err) {
    console.error('Error al cambiar estado:', err)
  }
}

// Restablecer contraseña
const resetPassword = async (user: PartnerUser) => {
  if (!confirm(`¿Restablecer la contraseña de ${user.fullName} a su documento de identidad?`)) return
  try {
    const res = await fetch(`http://localhost:3000/api/users/reset-password/${user.documentId}`, {
      method: 'POST'
    })
    const data = await res.json()
    if (data.success) {
      alert(`Contraseña de ${user.fullName} restablecida exitosamente.`)
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

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="users-view">
    <!-- Cabecera -->
    <div class="view-header">
      <div>
        <h2>Gestión de Socios & Usuarios</h2>
        <p>Administración general, asignación de rifas y perfiles de acceso.</p>
      </div>
      <button type="button" class="btn-create" @click="openCreateModal">
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
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Buscar por nombre, cédula, boleta o coordinador..." 
        />
        <button v-if="searchQuery" class="btn-clear" @click="searchQuery = ''">✕</button>
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
            <th>Ahorro Base</th>
            <th>Rifa 1</th>
            <th>Rifa 2</th>
            <th>Coordinador</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="9" class="center-text">Cargando socios...</td>
          </tr>
          <tr v-else-if="filteredUsers.length === 0">
            <td colspan="9" class="center-text empty-state">No se encontraron socios con los filtros actuales.</td>
          </tr>
          <tr v-for="u in filteredUsers" :key="u.id">
            <td><strong>{{ u.fullName }}</strong></td>
            <td>{{ u.documentId }}</td>
            <td>{{ u.cellphone }}</td>
            <td class="money-text">{{ formatCurrency(Number(u.savingsValue)) }}</td>
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
            <td>
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
              <label>Celular</label>
              <input type="number" v-model="form.cellphone" required />
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
              <label>Cuota de Ahorro Base ($) *</label>
              <input type="number" v-model="form.savingsValue" min="10000" step="5000" required />
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
                <option :value="1">Administrador (1)</option>
                <option :value="2">Coordinador (2)</option>
                <option :value="3">Socio Ahorrador (3)</option>
              </select>
            </div>
            <div class="field checkbox-field">
              <label class="switch-box">
                <input type="checkbox" v-model="form.canLogin" />
                <span>¿Habilitar acceso al sistema web?</span>
              </label>
            </div>
          </div>

          <!-- SECCIÓN RIFA 1 (ticket) -->
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

          <!-- SECCIÓN RIFA 2 (ticket2) -->
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
.users-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.view-header h2 {
  color: var(--color-primary);
  font-size: 1.7rem;
  margin: 0;
}

.view-header p {
  color: var(--color-muted);
  font-size: 0.95rem;
  margin-top: 0.2rem;
}

.btn-create {
  background-color: var(--color-secondary);
  color: #fff;
  border: none;
  padding: 0.75rem 1.4rem;
  border-radius: var(--radius);
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: 0 4px 12px rgba(31, 122, 99, 0.25);
}

.btn-create:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.2rem;
}

.stat-card {
  background: #fff;
  padding: 1.3rem 1.6rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: var(--shadow);
}

.stat-card.primary { border-left: 5px solid var(--color-primary); }
.stat-card.green { border-left: 5px solid var(--color-secondary); }
.stat-card.orange { border-left: 5px solid #dd6b20; }

.stat-label {
  font-size: 0.85rem;
  color: var(--color-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 1.55rem;
  color: var(--color-primary);
}

.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 480px;
}

.search-box input {
  width: 100%;
  padding: 0.75rem 2.4rem 0.75rem 2.6rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: #fff;
}

.search-icon {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
}

.btn-clear {
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
}

.status-tabs {
  display: flex;
  background: #e2e8f0;
  border-radius: 8px;
  padding: 0.25rem;
}

.tab-btn {
  border: none;
  background: none;
  padding: 0.55rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  color: #4a5568;
}

.tab-btn.active {
  background: #fff;
  color: var(--color-primary);
  box-shadow: 0 2px 5px rgba(0,0,0,0.08);
}

.table-container {
  width: 100%;
  background: #fff;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.92rem;
}

th, td {
  padding: 0.95rem 1.1rem;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

th {
  background-color: var(--color-bg-light);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.money-text {
  font-weight: 600;
  color: #2d3748;
}

.tickets-tag-container {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.ticket-badge {
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.75rem;
}

.ticket-badge.r1 {
  background-color: #feebc8;
  color: #744210;
  border: 1px solid #fbd38d;
}

.ticket-badge.r2 {
  background-color: #bee3f8;
  color: #2b6cb0;
  border: 1px solid #90cdf4;
}

.no-ticket-text {
  color: var(--color-muted);
}

.status-pill {
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 700;
}

.status-pill.active {
  background: #c6f6d5;
  color: #22543d;
}

.status-pill.inactive {
  background: #fed7d7;
  color: #9b2c2c;
}

.action-buttons {
  display: flex;
  gap: 0.4rem;
}

.btn-action {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  font-size: 0.88rem;
}

.btn-action:hover {
  background-color: var(--color-bg-light);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(8, 28, 45, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1.5rem;
  backdrop-filter: blur(3px);
}

.modal-box {
  background-color: #fff;
  border-radius: var(--radius);
  width: 700px;
  max-width: 100%;
  padding: 2.2rem;
  max-height: 92vh;
  overflow-y: auto;
}

.modal-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.3rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.8rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
}

.modal-error {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.2rem;
  font-size: 0.88rem;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary);
}

.field input, .field select {
  width: 100%;
  padding: 0.72rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.92rem;
}

.checkbox-field {
  justify-content: center;
}

.switch-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.switch-box input {
  width: 18px;
  height: 18px;
}

/* Cajas de Boletas Rifa 1 y Rifa 2 */
.ticket-box {
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.ticket-box.r1-border {
  background-color: #fffaf0;
  border: 1px solid #feebc8;
}

.ticket-box.r2-border {
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
}

.ticket-box-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary);
}

.ticket-input-group {
  display: flex;
  gap: 0.6rem;
}

.ticket-input-group input {
  width: 100px;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-weight: 700;
  text-align: center;
}

.btn-add-ticket {
  border: none;
  padding: 0.55rem 0.9rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
}

.btn-add-ticket.r1-btn {
  background-color: #dd6b20;
  color: #fff;
}

.btn-add-ticket.r2-btn {
  background-color: #2b6cb0;
  color: #fff;
}

.ticket-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-height: 28px;
  align-items: center;
}

.ticket-tag {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.55rem;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 700;
}

.ticket-tag.r1-tag {
  background-color: #feebc8;
  color: #744210;
  border: 1px solid #fbd38d;
}

.ticket-tag.r2-tag {
  background-color: #bee3f8;
  color: #2b6cb0;
  border: 1px solid #90cdf4;
}

.ticket-tag button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
}

.no-tickets-selected {
  font-size: 0.78rem;
  color: var(--color-muted);
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-cancel {
  background: none;
  border: 1px solid var(--color-border);
  padding: 0.75rem 1.4rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  background-color: var(--color-secondary);
  color: #fff;
  border: none;
  padding: 0.75rem 1.6rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
  .filters-bar { flex-direction: column; align-items: stretch; }
}
</style>