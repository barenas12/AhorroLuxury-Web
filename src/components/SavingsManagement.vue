<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { buildScopeQuery, type ViewerUser } from '../utils/viewerScope'

const props = defineProps<{
  currentUser?: ViewerUser
}>()

export interface TicketStatusItem {
  number: string
  raffle: 'Rifa 1' | 'Rifa 2'
  raffleType: 1 | 2
  isPaid: boolean
  status: 'Al día' | 'En mora'
}

export interface PartnerSavings {
  id: number
  documentId: string
  fullName: string
  cellphone: string
  coordinatorName: string
  frequency: number
  savingsValue: number
  quotaValue: number
  savingsStartDate: string | null
  savingsUpToDateAt: string | null
  totalSavedCurrentPeriod: number
  overdueAmount: number
  savingsStatus: 'Al día' | 'En mora'
  overdueTotalDays: number
  overdueMonths: number
  overdueDays: number
  overdueLabel: string
  ticketsRifa1: TicketStatusItem[]
  ticketsRifa2: TicketStatusItem[]
  rifa1Status: 'Al día' | 'En mora' | 'Sin boletas'
  rifa2Status: 'Al día' | 'En mora' | 'Sin boletas'
  ticketsStatus: TicketStatusItem[]
  generalTicketStatus: 'Al día' | 'En mora'
}

type SavingsSortKey =
  | 'id'
  | 'partner'
  | 'quota'
  | 'startDate'
  | 'saved'
  | 'overdue'
  | 'overdueTime'
  | 'savingsStatus'
  | 'ticketsStatus'
type SortDirection = 'asc' | 'desc'

const partners = ref<PartnerSavings[]>([])
const isLoading = ref<boolean>(false)
const searchColumn = ref<'todas' | 'fullName' | 'documentId' | 'coordinatorName' | 'frequency' | 'savingsStartDate' | 'ticket'>('todas')
const searchQuery = ref<string>('')
const statusFilter = ref<'todos' | 'al_dia' | 'en_mora'>('todos')
const raffleScope = ref<'all' | 'both' | '1' | '2'>('all')
const raffleTicketStatusFilter = ref<'todos' | 'al_dia' | 'en_mora' | 'sin_boletas'>('todos')
const ticketNumberQuery = ref<string>('')
const sortKey = ref<SavingsSortKey>('id')
const sortDirection = ref<SortDirection>('desc')

const loadSavingsData = async () => {
  isLoading.value = true
  try {
    const qs = buildScopeQuery(props.currentUser)
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/savings/dashboard${qs ? `?${qs}` : ''}`)
    const data = await res.json()
    if (data.success) {
      partners.value = data.data
    }
  } catch (err) {
    console.error('Error al cargar ahorro programado:', err)
  } finally {
    isLoading.value = false
  }
}

const getScopedTickets = (p: PartnerSavings): TicketStatusItem[] => {
  if (raffleScope.value === '1') return p.ticketsRifa1 || []
  if (raffleScope.value === '2') return p.ticketsRifa2 || []
  return p.ticketsStatus || []
}

const getScopedTicketStatus = (p: PartnerSavings): 'Al día' | 'En mora' | 'Sin boletas' => {
  if (raffleScope.value === '1') return p.rifa1Status
  if (raffleScope.value === '2') return p.rifa2Status
  if (!p.ticketsStatus || p.ticketsStatus.length === 0) return 'Sin boletas'
  return p.generalTicketStatus
}

const filteredPartners = computed(() => {
  let list = partners.value
  const q = searchQuery.value.toLowerCase().trim()
  const tq = ticketNumberQuery.value.trim()

  if (statusFilter.value === 'al_dia') {
    list = list.filter(p => p.savingsStatus === 'Al día')
  } else if (statusFilter.value === 'en_mora') {
    list = list.filter(p => p.savingsStatus === 'En mora')
  }

  // Filtro por boleta separado por Rifa (sin mezclar Rifa 1 y Rifa 2)
  if (raffleScope.value !== 'all') {
    if (raffleTicketStatusFilter.value === 'sin_boletas') {
      list = list.filter(p => getScopedTicketStatus(p) === 'Sin boletas')
    } else if (raffleTicketStatusFilter.value === 'al_dia') {
      list = list.filter(p => getScopedTicketStatus(p) === 'Al día')
    } else if (raffleTicketStatusFilter.value === 'en_mora') {
      list = list.filter(p => getScopedTicketStatus(p) === 'En mora')
    } else {
      // Cuando se filtra por Rifa 1, Rifa 2 o Con boletas (Rifa 1 y 2), ocultar los que no tienen boletas
      list = list.filter(p => getScopedTickets(p).length > 0)
    }
  }

  if (tq) {
    list = list.filter(p =>
      getScopedTickets(p).some(t => t.number.includes(tq))
    )
  }

  if (q) {
    list = list.filter(p => {
      switch (searchColumn.value) {
        case 'fullName':
          return p.fullName.toLowerCase().includes(q)
        case 'documentId':
          return String(p.documentId || '').toLowerCase().includes(q)
        case 'coordinatorName':
          return (p.coordinatorName || '').toLowerCase().includes(q)
        case 'frequency': {
          const freqNum = Number(p.frequency)
          const numericQuery = /^\d+$/.test(q) ? Number(q) : null
          if (numericQuery !== null) {
            return freqNum === numericQuery
          }
          return getFrequencyLabel(freqNum).toLowerCase().includes(q)
        }
        case 'savingsStartDate':
          return (p.savingsStartDate || '').toLowerCase().includes(q)
        case 'ticket':
          return getScopedTickets(p).some(t => t.number.includes(q))
        default:
          return (
            p.fullName.toLowerCase().includes(q) ||
            String(p.documentId || '').toLowerCase().includes(q) ||
            (p.coordinatorName || '').toLowerCase().includes(q) ||
            (p.savingsStartDate || '').toLowerCase().includes(q) ||
            getScopedTickets(p).some(t => t.number.includes(q))
          )
      }
    })
  }

  return [...list].sort((a, b) => {
    const first = getSavingsSortValue(a, sortKey.value)
    const second = getSavingsSortValue(b, sortKey.value)
    const comparison = typeof first === 'number' && typeof second === 'number'
      ? first - second
      : String(first).localeCompare(String(second), 'es', { numeric: true, sensitivity: 'base' })
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

const getSavingsSortValue = (partner: PartnerSavings, key: SavingsSortKey): number | string => {
  switch (key) {
    case 'id': return partner.id
    case 'partner': return partner.fullName
    case 'quota': return partner.quotaValue
    case 'startDate': return partner.savingsStartDate || ''
    case 'saved': return partner.totalSavedCurrentPeriod
    case 'overdue': return partner.overdueAmount
    case 'overdueTime': return partner.overdueTotalDays
    case 'savingsStatus': return partner.savingsStatus
    case 'ticketsStatus': return getScopedTicketStatus(partner)
  }
}

const toggleSavingsSort = (key: SavingsSortKey): void => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

const savingsSortIndicator = (key: SavingsSortKey): string => {
  if (sortKey.value !== key) return ''
  return sortDirection.value === 'asc' ? ' ▲' : ' ▼'
}

const getFrequencyLabel = (freq: number): string => {
  if (freq === 8) return 'Cada 8 días'
  if (freq === 15) return 'Cada 15 días'
  if (freq === 30) return 'Cada 30 días'
  return `Cada ${freq} días`
}

// Métricas
const totalSocios = computed(() => partners.value.length)
const totalAlDia = computed(() => partners.value.filter(p => p.savingsStatus === 'Al día').length)
const totalEnMora = computed(() => partners.value.filter(p => p.savingsStatus === 'En mora').length)
const totalCarteraEnMora = computed(() => partners.value.reduce((acc, p) => acc + Number(p.overdueAmount || 0), 0))

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount)
}

onMounted(() => {
  loadSavingsData()
})
</script>

<template>
  <div class="savings-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h2>Ahorro Programado y Mora</h2>
        <p>Monitoreo de ahorro neto, cuotas según frecuencia, tiempo en mora y estado independiente de boletas.</p>
      </div>
      <button type="button" class="btn-refresh" @click="loadSavingsData">
        🔄 Actualizar
      </button>
    </div>

    <!-- Cards de Resumen -->
    <div class="stats-row">
      <div class="stat-card primary">
        <span class="stat-label">Total Ahorradores</span>
        <strong class="stat-value">{{ totalSocios }}</strong>
        <small class="stat-desc">Socios activos</small>
      </div>
      <div class="stat-card green">
        <span class="stat-label">Total Al Día</span>
        <strong class="stat-value">{{ totalAlDia }}</strong>
        <small class="stat-desc">Sin deuda de cuotas</small>
      </div>
      <div class="stat-card orange">
        <span class="stat-label">Total Cartera en Mora</span>
        <strong class="stat-value">{{ formatCurrency(totalCarteraEnMora) }}</strong>
        <small class="stat-desc">{{ totalEnMora }} socios en mora de ahorro</small>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-panel">
      <div class="filters-bar">
        <div class="column-filter-group">
          <select v-model="searchColumn" class="column-select" @change="searchQuery = ''">
            <option value="todas">Columna: Todas</option>
            <option value="fullName">Socio (Nombre)</option>
            <option value="documentId">Cédula</option>
            <option value="coordinatorName">Coordinador</option>
            <option value="frequency">Frecuencia</option>
            <option value="savingsStartDate">Inicio Ahorro</option>
            <option value="ticket">Boleta</option>
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
          <button :class="['tab-btn', { active: statusFilter === 'todos' }]" @click="statusFilter = 'todos'">
            Ahorro: Todos
          </button>
          <button :class="['tab-btn', { active: statusFilter === 'al_dia' }]" @click="statusFilter = 'al_dia'">
            Al Día
          </button>
          <button :class="['tab-btn', { active: statusFilter === 'en_mora' }]" @click="statusFilter = 'en_mora'">
            En Mora
          </button>
        </div>
      </div>

      <!-- Filtro de boletas independiente por rifa -->
      <div class="raffle-filter-bar">
        <div class="raffle-scope-group">
          <span class="filter-label">Filtro de Boletas:</span>
          <select v-model="raffleScope" @change="raffleTicketStatusFilter = 'todos'" class="raffle-select">
            <option value="all">Todos los socios</option>
            <option value="both">Con boletas (Rifa 1 y 2)</option>
            <option value="1">Solo Rifa 1</option>
            <option value="2">Solo Rifa 2</option>
          </select>

          <select
            v-if="raffleScope !== 'all'"
            v-model="raffleTicketStatusFilter"
            class="raffle-select"
          >
            <option value="todos">Estado boleta: Todas con boleta</option>
            <option value="al_dia">Boleta Al día</option>
            <option value="en_mora">Boleta En mora</option>
            <option value="sin_boletas">
              {{ raffleScope === 'both' ? 'Sin boletas' : `Sin boletas en Rifa ${raffleScope}` }}
            </option>
          </select>

          <input
            type="text"
            v-model="ticketNumberQuery"
            maxlength="2"
            class="ticket-num-input"
            :placeholder="raffleScope === '1' || raffleScope === '2' ? `N° en Rifa ${raffleScope}` : 'N° boleta (ej. 07)'"
          />
          <button
            v-if="raffleScope !== 'all' || ticketNumberQuery"
            type="button"
            class="btn-reset-filter"
            @click="raffleScope = 'all'; raffleTicketStatusFilter = 'todos'; ticketNumberQuery = ''"
          >
            Limpiar filtro boletas
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th><button type="button" class="sort-header" @click="toggleSavingsSort('partner')">Socio{{ savingsSortIndicator('partner') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleSavingsSort('quota')">Cuota / Frecuencia{{ savingsSortIndicator('quota') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleSavingsSort('startDate')">Inicio Ahorro{{ savingsSortIndicator('startDate') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleSavingsSort('saved')">Abonado (Neto){{ savingsSortIndicator('saved') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleSavingsSort('overdue')">Valor en Mora{{ savingsSortIndicator('overdue') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleSavingsSort('overdueTime')">Tiempo en Mora{{ savingsSortIndicator('overdueTime') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleSavingsSort('savingsStatus')">Estado Ahorro{{ savingsSortIndicator('savingsStatus') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleSavingsSort('ticketsStatus')">Estado Boletas{{ savingsSortIndicator('ticketsStatus') }}</button></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="8" class="center-text">Calculando saldos y tiempos en mora...</td>
          </tr>
          <tr v-else-if="filteredPartners.length === 0">
            <td colspan="8" class="center-text empty-state">No hay registros con los filtros seleccionados.</td>
          </tr>
          <tr v-for="p in filteredPartners" :key="p.id">
            <td>
              <strong>{{ p.fullName }}</strong>
              <small class="sub-text">C.C. {{ p.documentId }} | Coord: {{ p.coordinatorName }}</small>
            </td>
            <td>
              <span class="money-text">{{ formatCurrency(p.quotaValue) }}</span>
              <small class="sub-text">
                {{ getFrequencyLabel(p.frequency) }} · Mes: {{ formatCurrency(p.savingsValue) }}
              </small>
            </td>
            <td>
              <span v-if="p.savingsStartDate" class="date-pill">{{ p.savingsStartDate }}</span>
              <span v-else class="no-tickets">Sin fecha</span>
              <small v-if="p.savingsUpToDateAt" class="sub-text up-to-date-note">
                Al día desde {{ p.savingsUpToDateAt }}
              </small>
            </td>
            <td class="money-text">{{ formatCurrency(p.totalSavedCurrentPeriod) }}</td>
            <td>
              <span v-if="p.overdueAmount > 0" class="overdue-amount-pill">
                {{ formatCurrency(p.overdueAmount) }}
              </span>
              <span v-else class="zero-debt">$0</span>
            </td>
            <td>
              <span :class="['mora-pill', p.overdueTotalDays > 0 ? 'expired' : 'ok']">
                {{ p.overdueLabel }}
              </span>
            </td>
            <td>
              <span :class="['status-badge', p.savingsStatus === 'Al día' ? 'on-time' : 'overdue']">
                {{ p.savingsStatus }}
              </span>
            </td>
            <td>
              <div v-if="getScopedTickets(p).length === 0" class="no-tickets">Sin boletas</div>
              <div v-else class="tickets-status-list">
                <span
                  v-for="t in getScopedTickets(p)"
                  :key="t.number + '-' + t.raffleType"
                  :class="['ticket-tag', t.isPaid ? 'paid' : 'unpaid']"
                  :title="`${t.raffle} - Boleta #${t.number}: ${t.status}`"
                >
                  R{{ t.raffleType }} #{{ t.number }} ({{ t.status }})
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.savings-view { width: 100%; display: flex; flex-direction: column; gap: 1.4rem; min-width: 0; }
.view-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.view-header h2 { color: var(--color-primary); font-size: clamp(1.35rem, 2.5vw, 1.7rem); margin: 0; }
.view-header p { color: var(--color-muted); font-size: 0.95rem; margin-top: 0.2rem; }
.btn-refresh { background-color: #ffffff; color: var(--color-primary); border: 1px solid var(--color-border); padding: 0.6rem 1.1rem; border-radius: 8px; font-weight: 700; cursor: pointer; }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: 1rem; }
.stat-card { background: #fff; padding: 1.2rem 1.4rem; border-radius: var(--radius); border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 0.25rem; box-shadow: var(--shadow); }
.stat-card.primary { border-left: 5px solid var(--color-primary); }
.stat-card.green { border-left: 5px solid var(--color-secondary); }
.stat-card.orange { border-left: 5px solid #dd6b20; }
.stat-label { font-size: 0.85rem; color: var(--color-muted); font-weight: 600; }
.stat-value { font-size: 1.55rem; color: var(--color-primary); }
.stat-desc { font-size: 0.75rem; color: #a0aec0; }

.filters-panel { display: flex; flex-direction: column; gap: 0.9rem; }
.filters-bar { display: flex; justify-content: space-between; align-items: center; gap: 0.85rem; flex-wrap: wrap; }
.column-filter-group { display: flex; align-items: center; gap: 0.65rem; flex: 1 1 280px; min-width: 0; max-width: 640px; flex-wrap: wrap; }
.column-select { padding: 0.72rem 0.9rem; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; font-weight: 600; color: var(--color-primary); font-size: 0.88rem; max-width: 100%; }
.search-box { position: relative; flex: 1 1 180px; min-width: 0; }
.search-box input { width: 100%; padding: 0.75rem 2.4rem 0.75rem 2.6rem; border: 1px solid var(--color-border); border-radius: 8px; background-color: #fff; }
.search-icon { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); opacity: 0.6; }
.btn-clear { position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; }

.status-tabs { display: flex; flex-wrap: wrap; background: #e2e8f0; border-radius: 8px; padding: 0.25rem; max-width: 100%; }
.tab-btn { border: none; background: none; padding: 0.55rem 0.95rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.86rem; color: #4a5568; }
.tab-btn.active { background: #fff; color: var(--color-primary); box-shadow: 0 2px 5px rgba(0,0,0,0.08); }

.raffle-filter-bar { background: #fff; padding: 0.85rem 1rem; border: 1px solid var(--color-border); border-radius: 8px; }
.raffle-scope-group { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.filter-label { font-size: 0.85rem; font-weight: 700; color: var(--color-primary); }
.raffle-select { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border); border-radius: 6px; background: #f8fafc; font-size: 0.86rem; max-width: 100%; }
.ticket-num-input { width: 145px; padding: 0.5rem 0.75rem; border: 1px solid var(--color-border); border-radius: 6px; font-size: 0.86rem; }
.btn-reset-filter { background: none; border: 1px solid #cbd5e0; padding: 0.45rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; color: #4a5568; }

.table-container { width: 100%; background: #fff; border-radius: var(--radius); border: 1px solid var(--color-border); box-shadow: var(--shadow); overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.92rem; }
th, td { padding: 0.95rem 1.1rem; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
th { background-color: var(--color-bg-light); color: var(--color-primary); font-weight: 700; font-size: 0.85rem; text-transform: uppercase; }
.sort-header { padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; text-transform: inherit; cursor: pointer; white-space: nowrap; }
.sub-text { display: block; font-size: 0.75rem; color: var(--color-muted); }
.up-to-date-note { color: #22543d; font-weight: 600; }
.date-pill { background: #edf2f7; color: #2d3748; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
.money-text { font-weight: 600; color: #2d3748; }
span.money-text { display: block; }
.overdue-amount-pill { color: #9b2c2c; background-color: #fed7d7; padding: 0.25rem 0.6rem; border-radius: 12px; font-weight: 800; font-size: 0.85rem; }
.zero-debt { color: #22543d; font-weight: 700; }
.status-badge { padding: 0.25rem 0.65rem; border-radius: 12px; font-size: 0.78rem; font-weight: 700; }
.status-badge.on-time { background: #c6f6d5; color: #22543d; }
.status-badge.overdue { background: #fed7d7; color: #9b2c2c; }
.mora-pill { padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; }
.mora-pill.expired { background: #fed7d7; color: #c53030; }
.mora-pill.ok { background: #e6fffa; color: #234e52; }
.tickets-status-list { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.ticket-tag { font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 6px; }
.ticket-tag.paid { background-color: #c6f6d5; color: #22543d; border: 1px solid #9ae6b4; }
.ticket-tag.unpaid { background-color: #fed7d7; color: #9b2c2c; border: 1px solid #feb2b2; }
.no-tickets { color: var(--color-muted); font-size: 0.8rem; }
.center-text { text-align: center; padding: 2.5rem 1rem; color: var(--color-muted); }

@media (max-width: 720px) {
  .btn-refresh { width: 100%; }
  .column-select { width: 100%; }
  .status-tabs { width: 100%; }
  .tab-btn { flex: 1; text-align: center; padding: 0.55rem 0.6rem; font-size: 0.82rem; }
  .raffle-scope-group { flex-direction: column; align-items: stretch; }
  .raffle-select,
  .ticket-num-input,
  .btn-reset-filter { width: 100%; }
}
</style>
