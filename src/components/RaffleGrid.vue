<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { buildScopeQuery, isAdminUser, type ViewerUser } from '../utils/viewerScope'

export interface RaffleItem {
  number: string
  isAssigned: boolean
  assigneeType: 'partner' | 'external' | null
  isPaid: boolean
  paymentStatus: 'Disponible' | 'Al día' | 'En mora'
  partner: {
    id: number
    externalTicketId?: number
    documentId: string
    fullName: string
    cellphone: string | number
    coordinatorName?: string
    isExternal?: boolean
  } | null
}

interface PartnerOption {
  id: number
  documentId: string
  fullName: string
  payerType?: 'partner' | 'external'
}

interface CoordinatorOption {
  id: number
  fullName: string
}

const props = defineProps<{
  raffleType: '1' | '2'
  title: string
  currentUser?: ViewerUser
}>()

const isAdmin = computed(() => isAdminUser(props.currentUser))
const board = ref<RaffleItem[]>([])
const activePartners = ref<PartnerOption[]>([])
const coordinators = ref<CoordinatorOption[]>([])
const isLoading = ref<boolean>(false)
const searchColumn = ref<'todas' | 'number' | 'fullName' | 'contact' | 'coordinatorName'>('todas')
const filterQuery = ref<string>('')
const statusFilter = ref<'todos' | 'disponibles' | 'asignadas' | 'al_dia' | 'en_mora'>('todos')
const selectedNumber = ref<RaffleItem | null>(null)

// Modal de asignación desde cuadrícula (solo para boletas disponibles)
const showAssignModal = ref<boolean>(false)
const isAssigning = ref<boolean>(false)
const assignError = ref<string>('')
const partnerSearchText = ref<string>('')
const showPartnerDropdown = ref<boolean>(false)
const isFilteringPartner = ref<boolean>(false)
const coordinatorSearchText = ref<string>('')
const showCoordinatorDropdown = ref<boolean>(false)
const isFilteringCoordinator = ref<boolean>(false)

const assignForm = ref({
  ticketNumber: '',
  assigneeType: 'partner' as 'partner' | 'external',
  partnerId: 0,
  fullName: '',
  cellphone: '',
  coordinatorId: 0
})

const loadRaffleData = async () => {
  isLoading.value = true
  selectedNumber.value = null
  try {
    const qs = buildScopeQuery(props.currentUser)
    const requests: Promise<Response>[] = [
      fetch(`${import.meta.env.VITE_API_URL}/api/users/raffle/${props.raffleType}${qs ? `?${qs}` : ''}`)
    ]
    if (isAdmin.value) {
      requests.push(
        fetch(`${import.meta.env.VITE_API_URL}/api/payments/partners?onlyPartners=1`),
        fetch(`${import.meta.env.VITE_API_URL}/api/users/coordinators`)
      )
    }

    const [resBoard, resPartners, resCoords] = await Promise.all(requests)
    if (resBoard) {
      const dataBoard = await resBoard.json()
      if (dataBoard.success) board.value = dataBoard.data
    }

    if (resPartners) {
      const dataPartners = await resPartners.json()
      if (dataPartners.success) activePartners.value = dataPartners.data
    }
    if (resCoords) {
      const dataCoords = await resCoords.json()
      if (dataCoords.success) coordinators.value = dataCoords.data
    }
  } catch (err) {
    console.error(`Error al cargar datos de ${props.title}:`, err)
  } finally {
    isLoading.value = false
  }
}

// Métricas de la rifa
const totalAssigned = computed(() => board.value.filter(b => b.isAssigned).length)
const totalAvailable = computed(() => 100 - totalAssigned.value)
const totalPaid = computed(() => board.value.filter(b => b.isAssigned && b.isPaid).length)
const totalUnpaid = computed(() => board.value.filter(b => b.isAssigned && !b.isPaid).length)
const occupancyPercentage = computed(() => ((totalAssigned.value / 100) * 100).toFixed(0))

// Filtrado independiente de la cuadrícula de ESTA rifa
const filteredBoard = computed(() => {
  let list = board.value

  if (statusFilter.value === 'disponibles') {
    list = list.filter(i => !i.isAssigned)
  } else if (statusFilter.value === 'asignadas') {
    list = list.filter(i => i.isAssigned)
  } else if (statusFilter.value === 'al_dia') {
    list = list.filter(i => i.isAssigned && i.isPaid)
  } else if (statusFilter.value === 'en_mora') {
    list = list.filter(i => i.isAssigned && !i.isPaid)
  }

  const q = filterQuery.value.toLowerCase().trim()
  if (!q) return list

  return list.filter(item => {
    switch (searchColumn.value) {
      case 'number':
        return item.number.includes(q)
      case 'fullName':
        return Boolean(item.partner && item.partner.fullName.toLowerCase().includes(q))
      case 'contact':
        return Boolean(
          item.partner && (
            String(item.partner.documentId || '').toLowerCase().includes(q) ||
            String(item.partner.cellphone || '').toLowerCase().includes(q)
          )
        )
      case 'coordinatorName':
        return Boolean(item.partner && String(item.partner.coordinatorName || '').toLowerCase().includes(q))
      default: {
        const matchNumber = item.number.includes(q)
        const matchPartner = item.partner && (
          item.partner.fullName.toLowerCase().includes(q) ||
          String(item.partner.documentId || '').toLowerCase().includes(q) ||
          String(item.partner.cellphone || '').toLowerCase().includes(q) ||
          String(item.partner.coordinatorName || '').toLowerCase().includes(q)
        )
        return matchNumber || Boolean(matchPartner)
      }
    }
  })
})

const filteredPartnerOptions = computed(() => {
  const q = partnerSearchText.value.toLowerCase().trim()
  if (!isFilteringPartner.value || !q) return activePartners.value
  return activePartners.value.filter(
    p => p.fullName.toLowerCase().includes(q) || String(p.documentId).toLowerCase().includes(q)
  )
})

const filteredCoordinatorOptions = computed(() => {
  const q = coordinatorSearchText.value.toLowerCase().trim()
  if (!isFilteringCoordinator.value || !q) return coordinators.value
  return coordinators.value.filter(c => c.fullName.toLowerCase().includes(q))
})

const selectItem = (item: RaffleItem) => {
  selectedNumber.value = item
}

const openAssignModal = (item: RaffleItem) => {
  if (item.isAssigned) return
  assignError.value = ''
  partnerSearchText.value = ''
  showPartnerDropdown.value = false
  isFilteringPartner.value = false
  const defaultCoordinator = coordinators.value[0]
  coordinatorSearchText.value = defaultCoordinator?.fullName || ''
  showCoordinatorDropdown.value = false
  isFilteringCoordinator.value = false
  assignForm.value = {
    ticketNumber: item.number,
    assigneeType: 'partner',
    partnerId: 0,
    fullName: '',
    cellphone: '',
    coordinatorId: defaultCoordinator?.id || 0
  }
  showAssignModal.value = true
}

const pickPartnerForTicket = (p: PartnerOption) => {
  assignForm.value.partnerId = p.id
  partnerSearchText.value = `${p.fullName} - C.C. ${p.documentId}`
  showPartnerDropdown.value = false
  isFilteringPartner.value = false
}

const pickCoordinatorForTicket = (c: CoordinatorOption) => {
  assignForm.value.coordinatorId = c.id
  coordinatorSearchText.value = c.fullName
  showCoordinatorDropdown.value = false
  isFilteringCoordinator.value = false
}

const submitAssignTicket = async () => {
  assignError.value = ''

  if (assignForm.value.assigneeType === 'partner' && !assignForm.value.partnerId) {
    assignError.value = 'Debes seleccionar un socio ahorrador.'
    return
  }

  if (assignForm.value.assigneeType === 'external') {
    if (!assignForm.value.fullName.trim() || !assignForm.value.cellphone.trim() || !assignForm.value.coordinatorId) {
      assignError.value = 'Nombre, celular y coordinador responsable son obligatorios.'
      return
    }
  }

  isAssigning.value = true
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/raffle/${props.raffleType}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignForm.value)
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'No se pudo asignar la boleta.')
    }

    showAssignModal.value = false
    await loadRaffleData()
  } catch (err: any) {
    assignError.value = err.message
  } finally {
    isAssigning.value = false
  }
}

watch(() => props.raffleType, () => {
  filterQuery.value = ''
  statusFilter.value = 'todos'
  loadRaffleData()
})

onMounted(() => {
  loadRaffleData()
})
</script>

<template>
  <div class="raffle-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h2>{{ title }}</h2>
        <p>Control visual, estado de pago y asignación directa de boletas disponibles (socios y externos).</p>
      </div>
      <button type="button" class="btn-refresh" @click="loadRaffleData">
        🔄 Actualizar
      </button>
    </div>

    <!-- Estadísticas -->
    <div class="stats-row">
      <div class="stat-card primary">
        <span class="stat-label">{{ isAdmin ? 'Números Asignados' : 'Boletas Asignadas' }}</span>
        <strong class="stat-value">{{ isAdmin ? `${totalAssigned} / 100` : totalAssigned }}</strong>
        <small class="stat-desc">{{ isAdmin ? `${occupancyPercentage}% de ocupación` : 'En tu alcance informativo' }}</small>
      </div>
      <div v-if="isAdmin" class="stat-card green">
        <span class="stat-label">Disponibles</span>
        <strong class="stat-value">{{ totalAvailable }}</strong>
        <small class="stat-desc">Clic en un número libre para asignar</small>
      </div>
      <div class="stat-card paid-card">
        <span class="stat-label">Boletas Al Día / En Mora</span>
        <strong class="stat-value">{{ totalPaid }} / {{ totalUnpaid }}</strong>
        <small class="stat-desc">{{ totalPaid }} pagadas · {{ totalUnpaid }} pendientes</small>
      </div>
      <div v-if="isAdmin" class="stat-card legend-card">
        <span class="stat-label">Convención</span>
        <div class="legend-items">
          <div class="legend-item"><span class="chip available"></span> Libre</div>
          <div class="legend-item"><span class="chip paid"></span> Pagada</div>
          <div class="legend-item"><span class="chip unpaid"></span> Pendiente</div>
        </div>
      </div>
    </div>

    <!-- Barra de Búsqueda por Columna y Filtro de Estado -->
    <div class="filters-bar">
      <div class="column-filter-group">
        <select v-model="searchColumn" class="column-select" @change="filterQuery = ''">
          <option value="todas">Columna: Todas</option>
          <option value="number">N° Boleta</option>
          <option value="fullName">Nombre Asignado</option>
          <option value="contact">Celular / Doc</option>
          <option value="coordinatorName">Coordinador</option>
        </select>

        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            v-model="filterQuery"
            placeholder="Escribe el valor a filtrar..."
          />
          <button v-if="filterQuery" class="btn-clear" @click="filterQuery = ''">✕</button>
        </div>
      </div>

      <div class="status-tabs">
        <button :class="['tab-btn', { active: statusFilter === 'todos' }]" @click="statusFilter = 'todos'">Todos</button>
        <button v-if="isAdmin" :class="['tab-btn', { active: statusFilter === 'disponibles' }]" @click="statusFilter = 'disponibles'">Disponibles</button>
        <button :class="['tab-btn', { active: statusFilter === 'al_dia' }]" @click="statusFilter = 'al_dia'">Al día</button>
        <button :class="['tab-btn', { active: statusFilter === 'en_mora' }]" @click="statusFilter = 'en_mora'">En mora</button>
      </div>
    </div>

    <!-- Vista según Perfil: Admin = Cuadrícula 00–99 | Coordinador y Socio = Solo sus boletas (Opción A) -->
    <div v-if="isLoading" class="loading-state">
      Cargando boletas de {{ title }}...
    </div>

    <div v-else-if="!isAdmin" class="readonly-cards-grid">
      <div v-if="filteredBoard.length === 0" class="loading-state">
        No hay boletas asignadas con los filtros seleccionados.
      </div>
      <div
        v-for="item in filteredBoard"
        :key="item.number"
        :class="['readonly-ticket-card', item.isPaid ? 'paid' : 'unpaid']"
      >
        <div class="rt-header">
          <span class="rt-number">Boleta #{{ item.number }}</span>
          <span :class="['badge-payment', item.isPaid ? 'paid' : 'unpaid']">
            {{ item.isPaid ? 'Al día (Pagada)' : 'En mora (Pendiente)' }}
          </span>
        </div>
        <div v-if="item.partner" class="rt-body">
          <p>
            <strong>{{ item.partner.fullName }}</strong>
            <span v-if="item.assigneeType === 'external'" class="badge-ext">Externo</span>
          </p>
          <small v-if="item.assigneeType === 'partner'">C.C. {{ item.partner.documentId }} · Tel: {{ item.partner.cellphone }}</small>
          <small v-else>Tel: {{ item.partner.cellphone }}</small>
          <small>Coordinador: {{ item.partner.coordinatorName || 'Sin asignar' }}</small>
        </div>
      </div>
    </div>

    <div v-else class="grid-container">
      <div
        v-for="item in filteredBoard"
        :key="item.number"
        :class="[
          'grid-cell',
          !item.isAssigned ? 'available' : (item.isPaid ? 'assigned-paid' : 'assigned-unpaid'),
          { selected: selectedNumber?.number === item.number }
        ]"
        @click="selectItem(item)"
      >
        <span class="cell-number">{{ item.number }}</span>
        <span class="cell-status">
          {{ item.isAssigned ? item.partner?.fullName.split(' ')[0] : 'Libre' }}
        </span>
        <span v-if="item.assigneeType === 'external'" class="ext-mini-tag">Ext</span>
      </div>
    </div>

    <!-- Detalle Flotante del Número Seleccionado -->
    <div v-if="selectedNumber" class="detail-card">
      <div class="detail-header">
        <h3>Detalle de la Boleta #{{ selectedNumber.number }}</h3>
        <button type="button" class="btn-close-detail" @click="selectedNumber = null">✕</button>
      </div>

      <div v-if="selectedNumber.isAssigned && selectedNumber.partner" class="detail-content">
        <p>
          <strong>Asignada a:</strong> {{ selectedNumber.partner.fullName }}
          <span v-if="selectedNumber.assigneeType === 'external'" class="badge-ext">Comprador Externo</span>
          <span v-else class="badge-partner">Socio Ahorrador</span>
        </p>
        <p v-if="selectedNumber.assigneeType === 'partner'">
          <strong>Documento:</strong> {{ selectedNumber.partner.documentId }}
        </p>
        <p><strong>Celular:</strong> {{ selectedNumber.partner.cellphone }}</p>
        <p><strong>Coordinador Responsable:</strong> {{ selectedNumber.partner.coordinatorName || 'Sin asignar' }}</p>
        <div class="detail-badges">
          <span :class="['badge-payment', selectedNumber.isPaid ? 'paid' : 'unpaid']">
            {{ selectedNumber.isPaid ? 'Pagada (Al día)' : 'Pendiente (En mora)' }}
          </span>
        </div>
      </div>

      <div v-else class="detail-content">
        <p class="free-text">Este número está disponible. Puedes asignarlo ahora a un socio ahorrador o a una persona externa.</p>
        <div class="free-actions">
          <span class="badge-status-free">Disponible</span>
          <button type="button" class="btn-assign-open" @click="openAssignModal(selectedNumber)">
            + Asignar Boleta #{{ selectedNumber.number }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL ASIGNAR BOLETA DISPONIBLE -->
    <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
      <div class="modal-box">
        <div class="modal-top">
          <h3>Asignar Boleta #{{ assignForm.ticketNumber }} — {{ title }}</h3>
          <button type="button" class="btn-close" @click="showAssignModal = false">✕</button>
        </div>

        <div v-if="assignError" class="modal-error">{{ assignError }}</div>

        <form @submit.prevent="submitAssignTicket" class="modal-form">
          <div class="type-selector">
            <button
              type="button"
              :class="['type-btn', { active: assignForm.assigneeType === 'partner' }]"
              @click="assignForm.assigneeType = 'partner'"
            >
              👤 Socio Ahorrador
            </button>
            <button
              type="button"
              :class="['type-btn', { active: assignForm.assigneeType === 'external' }]"
              @click="assignForm.assigneeType = 'external'"
            >
              🎟️ Comprador Externo (Por afuera)
            </button>
          </div>

          <!-- ASIGNAR A SOCIO -->
          <div v-if="assignForm.assigneeType === 'partner'" class="field autocomplete-field">
            <label>Buscar Socio Ahorrador (Nombre o Documento) *</label>
            <input
              type="text"
              v-model="partnerSearchText"
              placeholder="Escribe el nombre o cédula del socio..."
              @focus="showPartnerDropdown = true; isFilteringPartner = false"
              @blur="showPartnerDropdown = false"
              @input="assignForm.partnerId = 0; showPartnerDropdown = true; isFilteringPartner = true"
              autocomplete="off"
            />
            <div v-if="showPartnerDropdown" class="autocomplete-list">
              <div
                v-for="p in filteredPartnerOptions"
                :key="p.id"
                :class="['autocomplete-item', { 'is-selected': assignForm.partnerId === p.id }]"
                @mousedown.prevent="pickPartnerForTicket(p)"
              >
                <strong>{{ p.fullName }}</strong>
                <small>C.C. {{ p.documentId }}</small>
              </div>
              <div v-if="filteredPartnerOptions.length === 0" class="autocomplete-empty">
                No se encontraron socios.
              </div>
            </div>
          </div>

          <!-- ASIGNAR A EXTERNO -->
          <template v-else>
            <div class="field">
              <label>Nombre Completo *</label>
              <input type="text" v-model="assignForm.fullName" placeholder="Ej. Carlos Ramírez" required />
            </div>
            <div class="field">
              <label>Celular *</label>
              <input type="text" v-model="assignForm.cellphone" placeholder="Ej. 3001234567" required />
            </div>
            <div class="field autocomplete-field">
              <label>Coordinador Responsable (escribe el nombre) *</label>
              <input
                type="text"
                v-model="coordinatorSearchText"
                placeholder="Escribe el nombre del coordinador..."
                @focus="showCoordinatorDropdown = true; isFilteringCoordinator = false"
                @blur="showCoordinatorDropdown = false"
                @input="assignForm.coordinatorId = 0; showCoordinatorDropdown = true; isFilteringCoordinator = true"
                autocomplete="off"
                required
              />
              <div v-if="showCoordinatorDropdown" class="autocomplete-list">
                <div
                  v-for="c in filteredCoordinatorOptions"
                  :key="c.id"
                  :class="['autocomplete-item', { 'is-selected': assignForm.coordinatorId === c.id }]"
                  @mousedown.prevent="pickCoordinatorForTicket(c)"
                >
                  <strong>{{ c.fullName }}</strong>
                </div>
                <div v-if="filteredCoordinatorOptions.length === 0" class="autocomplete-empty">
                  No se encontraron coordinadores.
                </div>
              </div>
            </div>
          </template>

          <div class="modal-buttons">
            <button type="button" class="btn-cancel" @click="showAssignModal = false">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="isAssigning">
              {{ isAssigning ? 'Asignando...' : 'Confirmar Asignación' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.raffle-view { width: 100%; display: flex; flex-direction: column; gap: 1.4rem; min-width: 0; }
.view-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.view-header h2 { color: var(--color-primary); font-size: clamp(1.35rem, 2.5vw, 1.7rem); margin: 0; }
.view-header p { color: var(--color-muted); font-size: 0.95rem; margin-top: 0.2rem; }
.btn-refresh { background-color: #ffffff; color: var(--color-primary); border: 1px solid var(--color-border); padding: 0.6rem 1.1rem; border-radius: 8px; font-weight: 700; cursor: pointer; }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: 1rem; }
.stat-card { background: #fff; padding: 1.1rem 1.35rem; border-radius: var(--radius); border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 0.25rem; box-shadow: var(--shadow); }
.stat-card.primary { border-left: 5px solid var(--color-primary); }
.stat-card.green { border-left: 5px solid var(--color-secondary); }
.stat-card.paid-card { border-left: 5px solid #dd6b20; }
.stat-label { font-size: 0.82rem; color: var(--color-muted); font-weight: 600; }
.stat-value { font-size: 1.45rem; color: var(--color-primary); }
.stat-desc { font-size: 0.74rem; color: #a0aec0; }

.legend-items { display: flex; gap: 0.9rem; margin-top: 0.4rem; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; font-weight: 600; color: #4a5568; }
.chip { width: 13px; height: 13px; border-radius: 4px; }
.chip.available { background-color: #edf2f7; border: 1px solid #cbd5e0; }
.chip.paid { background-color: #c6f6d5; border: 1px solid #68d391; }
.chip.unpaid { background-color: #feebc8; border: 1px solid #f6ad55; }

.filters-bar { display: flex; justify-content: space-between; align-items: center; gap: 0.85rem; flex-wrap: wrap; }
.column-filter-group { display: flex; align-items: center; gap: 0.65rem; flex: 1 1 280px; min-width: 0; max-width: 640px; flex-wrap: wrap; }
.column-select { padding: 0.72rem 0.9rem; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; font-weight: 600; color: var(--color-primary); font-size: 0.88rem; max-width: 100%; }
.search-bar { position: relative; flex: 1 1 180px; min-width: 0; }

.readonly-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
.readonly-ticket-card { background: #fff; border: 1px solid var(--color-border); border-radius: 10px; padding: 1.15rem 1.3rem; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 0.6rem; }
.readonly-ticket-card.paid { border-left: 5px solid var(--color-secondary); }
.readonly-ticket-card.unpaid { border-left: 5px solid #dd6b20; }
.rt-header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.rt-number { font-size: 1.2rem; font-weight: 800; color: var(--color-primary); }
.rt-body { display: flex; flex-direction: column; gap: 0.25rem; }
.rt-body p { margin: 0; font-size: 0.95rem; color: #2d3748; }
.rt-body small { color: #718096; font-size: 0.8rem; }
.search-bar input { width: 100%; padding: 0.75rem 2.4rem 0.75rem 2.6rem; border: 1px solid var(--color-border); border-radius: 8px; background-color: #fff; outline: none; }
.search-icon { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); opacity: 0.6; }
.btn-clear { position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; }

.status-tabs { display: flex; background: #e2e8f0; border-radius: 8px; padding: 0.25rem; flex-wrap: wrap; }
.tab-btn { border: none; background: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; color: #4a5568; }
.tab-btn.active { background: #fff; color: var(--color-primary); box-shadow: 0 2px 5px rgba(0,0,0,0.08); }

.grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 0.7rem; background-color: #ffffff; padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--color-border); box-shadow: var(--shadow); }
.grid-cell { position: relative; aspect-ratio: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 8px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; user-select: none; padding: 0.3rem; text-align: center; }
.grid-cell:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
.grid-cell.available { background-color: #f7fafc; border: 1px solid #e2e8f0; color: #718096; }
.grid-cell.assigned-paid { background-color: #c6f6d5; border: 1px solid #68d391; color: #22543d; }
.grid-cell.assigned-unpaid { background-color: #feebc8; border: 1px solid #fbd38d; color: #744210; }
.grid-cell.selected { outline: 3px solid var(--color-secondary); }
.cell-number { font-size: 1.25rem; font-weight: 800; line-height: 1.1; }
.cell-status { font-size: 0.68rem; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 100%; margin-top: 0.2rem; }
.ext-mini-tag { position: absolute; top: 3px; right: 4px; font-size: 0.58rem; font-weight: 800; background: #553c9a; color: #fff; padding: 0 4px; border-radius: 4px; }

.detail-card { background-color: #ffffff; border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1.2rem 1.5rem; box-shadow: var(--shadow); }
.detail-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 0.6rem; margin-bottom: 0.8rem; }
.detail-header h3 { color: var(--color-primary); margin: 0; font-size: 1.1rem; }
.btn-close-detail { background: none; border: none; cursor: pointer; font-size: 1.1rem; }
.detail-content p { margin: 0.35rem 0; font-size: 0.92rem; color: #2d3748; }
.badge-ext { background: #e9d8fd; color: #553c9a; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; margin-left: 0.4rem; }
.badge-partner { background: #bee3f8; color: #2b6cb0; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; margin-left: 0.4rem; }
.detail-badges { margin-top: 0.6rem; }
.badge-payment { display: inline-block; font-weight: 700; font-size: 0.8rem; padding: 0.25rem 0.7rem; border-radius: 12px; }
.badge-payment.paid { background: #c6f6d5; color: #22543d; }
.badge-payment.unpaid { background: #fed7d7; color: #9b2c2c; }

.free-actions { display: flex; align-items: center; gap: 1rem; margin-top: 0.7rem; flex-wrap: wrap; }
.badge-status-free { display: inline-block; background-color: #c6f6d5; color: #22543d; font-weight: 700; font-size: 0.78rem; padding: 0.25rem 0.65rem; border-radius: 12px; }
.btn-assign-open { background: var(--color-secondary); color: #fff; border: none; padding: 0.55rem 1.1rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
.loading-state { text-align: center; padding: 3rem; color: var(--color-muted); }

.modal-overlay { position: fixed; inset: 0; background: rgba(8,28,45,0.65); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1.5rem; }
.modal-box { background: #fff; border-radius: 8px; width: 520px; max-width: 100%; padding: 1.8rem; max-height: 90vh; overflow-y: auto; }
.modal-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 0.8rem; margin-bottom: 1rem; }
.modal-top h3 { margin: 0; color: var(--color-primary); font-size: 1.15rem; }
.btn-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; }
.modal-error { background: #fee2e2; color: #991b1b; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem; }
.modal-form { display: flex; flex-direction: column; gap: 1rem; }
.type-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.type-btn { padding: 0.65rem; border: 1px solid var(--color-border); background: #f8fafc; border-radius: 8px; cursor: pointer; font-weight: 600; color: #4a5568; }
.type-btn.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }

.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--color-primary); }
.field input, .field select { padding: 0.7rem; border: 1px solid var(--color-border); border-radius: 6px; }

.autocomplete-field { position: relative; }
.autocomplete-list { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid var(--color-border); border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 50; box-shadow: 0 8px 20px rgba(0,0,0,0.12); margin-top: 2px; }
.autocomplete-item { padding: 0.6rem 0.8rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
.autocomplete-item:hover, .autocomplete-item.is-selected { background: #edf2f7; }
.autocomplete-item small { color: #718096; }
.autocomplete-empty { padding: 0.8rem; text-align: center; color: #718096; font-size: 0.85rem; }

.modal-buttons { display: flex; justify-content: flex-end; gap: 0.8rem; margin-top: 0.5rem; flex-wrap: wrap; }
.btn-cancel { background: none; border: 1px solid var(--color-border); padding: 0.65rem 1.2rem; border-radius: 6px; cursor: pointer; }
.btn-save { background: var(--color-secondary); color: #fff; border: none; padding: 0.65rem 1.2rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.5; }

@media (max-width: 720px) {
  .btn-refresh { width: 100%; }
  .column-select { width: 100%; }
  .status-tabs { width: 100%; }
  .tab-btn { flex: 1; text-align: center; padding: 0.5rem 0.6rem; font-size: 0.82rem; }
  .grid-container { padding: 0.9rem; gap: 0.5rem; grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); }
  .cell-number { font-size: 1.05rem; }
  .modal-overlay { padding: 0.85rem; }
  .modal-box { padding: 1.25rem; }
  .type-selector { grid-template-columns: 1fr; }
  .modal-buttons { flex-direction: column-reverse; }
  .modal-buttons button { width: 100%; }
}
</style>
