<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

export interface PaymentRecord {
  id: number
  partnerId: number
  partnerDocument: string
  partnerName: string
  registeredBy: number
  registeredByName: string
  amount: number
  concept: string
  ticketNumber?: string | null
  paymentMethod: 'efectivo' | 'transferencia'
  hasFine: number
  fineAmount: number
  totalPaid: number
  paymentDate: string
  createdAt: string
  observations?: string
}

export interface PartnerOption {
  id: number
  documentId: string
  fullName: string
  savingsValue: number
  ticket?: string | string[]
}

export interface PaymentRowItem {
  concept: string
  ticketNumber?: string
  amount: number
  paymentMethod: 'efectivo' | 'transferencia'
  paymentDate: string
  observations: string
  hasFine: boolean
  fineAmount: number
}

const props = defineProps<{
  currentUser: {
    id: number
    name?: string
    full_name?: string
    user?: string
  }
}>()

const payments = ref<PaymentRecord[]>([])
const partners = ref<PartnerOption[]>([])
const searchQuery = ref('')
const methodFilter = ref<string>('todos')
const isLoading = ref(false)
const showModal = ref(false)
const isSaving = ref(false)
const modalError = ref('')
const itemsListRef = ref<HTMLElement | null>(null)

const conceptsList = [
  'Abono Ahorro',
  'Pago Boleta',
  'Pago Cuota Préstamo',
  'Multa',
  'Otro Aporte'
]

const form = ref({
  partnerId: 0,
  items: [] as PaymentRowItem[]
})

// Parsea las boletas del socio actual como array
const parseTickets = (raw: string | string[] | undefined): string[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw.split(',').map(t => t.trim()).filter(Boolean)
  }
}

// Boletas del socio seleccionado en el modal
const currentPartnerTickets = computed(() => {
  const selected = partners.value.find(p => p.id === form.value.partnerId)
  return selected ? parseTickets(selected.ticket) : []
})

// Oculta boletas seleccionadas en otras filas del formulario
const getAvailableTicketsForRow = (currentIndex: number): string[] => {
  const allTickets = currentPartnerTickets.value
  const takenTickets = form.value.items
    .filter((item, idx) => idx !== currentIndex && item.concept === 'Pago Boleta' && item.ticketNumber)
    .map(item => item.ticketNumber as string)

  return allTickets.filter(t => !takenTickets.includes(t))
}

const loadData = async (): Promise<void> => {
  isLoading.value = true
  try {
    const [resPayments, resPartners] = await Promise.all([
      fetch('http://localhost:3000/api/payments'),
      fetch('http://localhost:3000/api/payments/partners')
    ])

    const dataPayments = await resPayments.json()
    const dataPartners = await resPartners.json()

    if (dataPayments.success) payments.value = dataPayments.data
    if (dataPartners.success) partners.value = dataPartners.data
  } catch (err) {
    console.error('Error al cargar pagos:', err)
  } finally {
    isLoading.value = false
  }
}

const getSelectedPartnerSavings = (): number => {
  const selected = partners.value.find(p => p.id === form.value.partnerId)
  return selected ? Number(selected.savingsValue || 0) : 0
}

const onConceptChange = (index: number) => {
  const row = form.value.items[index]
  if (!row) return

  if (row.concept === 'Abono Ahorro') {
    row.amount = getSelectedPartnerSavings()
    row.ticketNumber = undefined
  } else if (row.concept === 'Pago Boleta') {
    const available = getAvailableTicketsForRow(index)
    const firstFree = available[0]

    row.ticketNumber = firstFree || undefined
    row.amount = 30000
  } else {
    row.amount = 0
    row.ticketNumber = undefined
  }
}

const onTicketNumberChange = (index: number) => {
  const row = form.value.items[index]
  if (!row) return
  row.amount = 30000
}

const onPartnerSelect = () => {
  const savings = getSelectedPartnerSavings()

  form.value.items.forEach((item, idx) => {
    if (item.concept === 'Abono Ahorro') {
      item.amount = savings
      item.ticketNumber = undefined
    } else if (item.concept === 'Pago Boleta') {
      const available = getAvailableTicketsForRow(idx)
      item.ticketNumber = available[0] || undefined
      item.amount = 30000
    } else {
      item.amount = 0
      item.ticketNumber = undefined
    }
  })
}

const createDefaultRow = (): PaymentRowItem => ({
  concept: 'Abono Ahorro',
  amount: getSelectedPartnerSavings() || 50000,
  paymentMethod: 'efectivo',
  paymentDate: new Date().toISOString().substring(0, 10),
  observations: '',
  hasFine: false,
  fineAmount: 5000
})

const addConceptRow = async () => {
  form.value.items.push(createDefaultRow())
  await nextTick()
  if (itemsListRef.value) {
    const lastItem = itemsListRef.value.lastElementChild as HTMLElement
    if (lastItem) {
      lastItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}

const removeConceptRow = (index: number) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

const openCreateModal = () => {
  modalError.value = ''
  const defaultPartnerId = partners.value[0]?.id || 0
  form.value = {
    partnerId: defaultPartnerId,
    items: []
  }
  form.value.items.push(createDefaultRow())
  showModal.value = true
}

const subtotalItems = computed(() => {
  return form.value.items.reduce((acc, it) => acc + Number(it.amount || 0), 0)
})

const totalMultasModal = computed(() => {
  return form.value.items.reduce((acc, it) => acc + (it.hasFine ? Number(it.fineAmount || 0) : 0), 0)
})

const totalModal = computed(() => {
  return subtotalItems.value + totalMultasModal.value
})

const filteredPayments = computed(() => {
  let list = payments.value
  const q = searchQuery.value.toLowerCase().trim()

  if (methodFilter.value !== 'todos') {
    list = list.filter(p => p.paymentMethod === methodFilter.value)
  }

  if (q) {
    list = list.filter(p =>
      p.partnerName.toLowerCase().includes(q) ||
      p.partnerDocument.toLowerCase().includes(q) ||
      p.concept.toLowerCase().includes(q) ||
      (p.ticketNumber && p.ticketNumber.includes(q)) ||
      p.registeredByName.toLowerCase().includes(q)
    )
  }
  return list
})

const totalRecaudado = computed(() => {
  return filteredPayments.value.reduce((acc, p) => acc + Number(p.totalPaid), 0)
})

const totalAbonosPuros = computed(() => {
  return filteredPayments.value
    .filter(p => p.concept === 'Abono Ahorro')
    .reduce((acc, p) => acc + Number(p.amount), 0)
})

const totalBoletas = computed(() => {
  return filteredPayments.value
    .filter(p => p.concept === 'Pago Boleta')
    .reduce((acc, p) => acc + Number(p.amount), 0)
})

const totalMultas = computed(() => {
  return filteredPayments.value.reduce((acc, p) => acc + Number(p.fineAmount || 0), 0)
})

const submitPayment = async () => {
  modalError.value = ''

  if (!form.value.partnerId) {
    modalError.value = 'Debes seleccionar un socio.'
    return
  }

  for (const item of form.value.items) {
    if (!item.amount || Number(item.amount) <= 0) {
      modalError.value = `El concepto "${item.concept}" debe tener un valor mayor a cero.`
      return
    }
    if (item.concept === 'Pago Boleta' && !item.ticketNumber) {
      modalError.value = 'Debes seleccionar a qué número de boleta corresponde el pago.'
      return
    }
  }

  isSaving.value = true
  try {
    const payload = {
      partnerId: form.value.partnerId,
      registeredBy: props.currentUser.id,
      items: form.value.items.map(it => ({
        concept: it.concept,
        ticketNumber: it.concept === 'Pago Boleta' ? it.ticketNumber : null,
        amount: Number(it.amount),
        paymentMethod: it.paymentMethod,
        paymentDate: it.paymentDate,
        observations: it.observations,
        hasFine: it.hasFine,
        fineAmount: it.hasFine ? Number(it.fineAmount || 0) : 0
      }))
    }

    const res = await fetch('http://localhost:3000/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al guardar los abonos.')
    }

    showModal.value = false
    await loadData()
  } catch (err: any) {
    modalError.value = err.message
  } finally {
    isSaving.value = false
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
  <div class="payments-view">
    <!-- Encabezado -->
    <div class="view-header">
      <div>
        <h2>Control de Pagos & Multas</h2>
        <p>Historial y registro contable de abonos, boletas y recargos por mora.</p>
      </div>
      <button type="button" class="btn-create" @click="openCreateModal">
        <span class="plus-icon">+</span> Registrar Abono
      </button>
    </div>

    <!-- 4 Cards de Resumen -->
    <div class="stats-row">
      <div class="stat-card primary">
        <span class="stat-label">Total Recaudado</span>
        <strong class="stat-value">{{ formatCurrency(totalRecaudado) }}</strong>
        <small class="stat-desc">Aportes + Boletas + Multas</small>
      </div>
      <div class="stat-card green">
        <span class="stat-label">Capital Aportado</span>
        <strong class="stat-value">{{ formatCurrency(totalAbonosPuros) }}</strong>
        <small class="stat-desc">Abono ahorro exclusivo</small>
      </div>
      <div class="stat-card blue">
        <span class="stat-label">Recaudo Boletas</span>
        <strong class="stat-value">{{ formatCurrency(totalBoletas) }}</strong>
        <small class="stat-desc">Ingresos de rifas</small>
      </div>
      <div class="stat-card orange">
        <span class="stat-label">Recaudo Multas</span>
        <strong class="stat-value">{{ formatCurrency(totalMultas) }}</strong>
        <small class="stat-desc">Recargos por mora</small>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Buscar por socio, boleta, documento o concepto..." 
        />
        <button v-if="searchQuery" class="btn-clear" @click="searchQuery = ''">✕</button>
      </div>

      <div class="method-tabs">
        <button 
          :class="['tab-btn', { active: methodFilter === 'todos' }]" 
          @click="methodFilter = 'todos'"
        >
          Todos
        </button>
        <button 
          :class="['tab-btn', { active: methodFilter === 'efectivo' }]" 
          @click="methodFilter = 'efectivo'"
        >
          Efectivo
        </button>
        <button 
          :class="['tab-btn', { active: methodFilter === 'transferencia' }]" 
          @click="methodFilter = 'transferencia'"
        >
          Transferencia
        </button>
      </div>
    </div>

    <!-- Tabla (Sin columna ID) -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Socio</th>
            <th>Concepto</th>
            <th>Medio</th>
            <th>Monto Abono</th>
            <th>Mora / Multa</th>
            <th>Total Recibido</th>
            <th>Fecha Imputada</th>
            <th>Registrado Por</th>
            <th>Fecha Registro</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="9" class="center-text">Cargando movimientos...</td>
          </tr>
          <tr v-else-if="filteredPayments.length === 0">
            <td colspan="9" class="center-text empty-state">No se registraron movimientos con los filtros actuales.</td>
          </tr>
          <tr v-for="pay in filteredPayments" :key="pay.id">
            <td>
              <strong>{{ pay.partnerName }}</strong>
              <small class="sub-text">C.C. {{ pay.partnerDocument }}</small>
            </td>
            <td>
              <div class="concept-cell">
                <span class="concept-badge">{{ pay.concept }}</span>
                <span v-if="pay.ticketNumber" class="ticket-pill">
                  Boleta #{{ pay.ticketNumber }}
                </span>
              </div>
            </td>
            <td>
              <span :class="['method-tag', pay.paymentMethod]">
                {{ pay.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia' }}
              </span>
            </td>
            <td class="money-text">{{ formatCurrency(Number(pay.amount)) }}</td>
            <td>
              <span v-if="pay.hasFine === 1" class="fine-badge">
                +{{ formatCurrency(Number(pay.fineAmount)) }}
              </span>
              <span v-else class="no-fine">Sin mora</span>
            </td>
            <td class="total-text">{{ formatCurrency(Number(pay.totalPaid)) }}</td>
            <td><strong>{{ pay.paymentDate }}</strong></td>
            <td>{{ pay.registeredByName }}</td>
            <td class="date-text">{{ pay.createdAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL DE REGISTRO -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-top">
          <h3>Registrar Abonos / Pagos</h3>
          <button type="button" class="btn-close" @click="showModal = false">✕</button>
        </div>

        <div v-if="modalError" class="modal-error">{{ modalError }}</div>

        <form @submit.prevent="submitPayment" class="modal-form">
          <!-- 1. SELECTOR LIMPIO DE SOCIO -->
          <div class="field">
            <label for="pSocio">Socio a quien se le carga el abono *</label>
            <select id="pSocio" v-model="form.partnerId" @change="onPartnerSelect" required>
              <option :value="0" disabled>-- Selecciona un socio activo --</option>
              <option v-for="p in partners" :key="p.id" :value="p.id">
                {{ p.fullName }} - C.C. {{ p.documentId }}
              </option>
            </select>
          </div>

          <!-- 2. FILAS DE CONCEPTOS DINÁMICOS -->
          <div class="concepts-card-wrapper">
            <div class="concepts-card-header">
              <label>Conceptos y Detalles del Abono *</label>
              <button type="button" class="btn-add-line" @click="addConceptRow">
                <span>+</span> Agregar Concepto
              </button>
            </div>

            <div class="items-list" ref="itemsListRef">
              <div 
                v-for="(item, idx) in form.items" 
                :key="idx" 
                class="item-card"
              >
                <div class="item-card-top">
                  <span class="item-number">Concepto #{{ idx + 1 }}</span>
                  <button 
                    type="button" 
                    class="btn-remove-item" 
                    @click="removeConceptRow(idx)"
                    :disabled="form.items.length === 1"
                  >
                    ✕ Eliminar
                  </button>
                </div>

                <!-- Concepto y Monto (Selector de boleta condicional y exclusivo) -->
                <div class="item-grid-2">
                  <div class="field">
                    <label>Concepto *</label>
                    <select v-model="item.concept" @change="onConceptChange(idx)" required>
                      <option v-for="c in conceptsList" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </div>

                  <!-- Selector exclusivo de boletas disponibles -->
                  <div v-if="item.concept === 'Pago Boleta'" class="field">
                    <label>N° Boleta a Pagar *</label>
                    <select 
                      v-model="item.ticketNumber" 
                      @change="onTicketNumberChange(idx)" 
                      required
                    >
                      <option v-if="getAvailableTicketsForRow(idx).length === 0" :value="undefined" disabled>
                        No hay más boletas disponibles para asignar
                      </option>
                      <option 
                        v-for="t in getAvailableTicketsForRow(idx)" 
                        :key="t" 
                        :value="t"
                      >
                        Boleta #{{ t }}
                      </option>
                    </select>
                  </div>

                  <!-- Valor -->
                  <div class="field">
                    <label>Valor ($) *</label>
                    <div class="input-currency-wrapper">
                      <span class="currency-prefix">$</span>
                      <input 
                        type="number" 
                        v-model="item.amount" 
                        min="1000" 
                        step="500" 
                        placeholder="0"
                        required 
                      />
                    </div>
                  </div>
                </div>

                <!-- Medio de Pago y Fecha Contable -->
                <div class="item-grid-2">
                  <div class="field">
                    <label>Medio de Pago *</label>
                    <select v-model="item.paymentMethod">
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Fecha Contable a Imputar *</label>
                    <input type="date" v-model="item.paymentDate" required />
                  </div>
                </div>

                <!-- Observaciones -->
                <div class="field">
                  <label>Observación / N° Comprobante (opcional)</label>
                  <input 
                    type="text" 
                    v-model="item.observations" 
                    placeholder="Ej. Aprobación Nequi M12345 o cuota adelantada" 
                  />
                </div>

                <!-- Mora inline -->
                <div :class="['fine-section-inline', { active: item.hasFine }]">
                  <label class="switch-label-inline">
                    <input type="checkbox" v-model="item.hasFine" />
                    <span class="switch-title">¿Este concepto incluye recargo por mora?</span>
                  </label>

                  <div v-if="item.hasFine" class="fine-input-inline">
                    <label>Valor Multa ($)</label>
                    <div class="input-currency-wrapper fine-wrapper">
                      <span class="currency-prefix">$</span>
                      <input 
                        type="number" 
                        v-model="item.fineAmount" 
                        min="0" 
                        step="500" 
                        placeholder="5000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botón inferior para agregar conceptos sin desplazarse arriba -->
            <button type="button" class="btn-add-line-bottom" @click="addConceptRow">
              <span>+</span> Agregar Otro Concepto
            </button>
          </div>

          <!-- Resumen de Liquidación -->
          <div class="summary-box">
            <div class="summary-row">
              <span>Subtotal Conceptos:</span>
              <span>{{ formatCurrency(subtotalItems) }}</span>
            </div>
            <div v-if="totalMultasModal > 0" class="summary-row fine-text">
              <span>Total Multas:</span>
              <span>+{{ formatCurrency(totalMultasModal) }}</span>
            </div>
            <div class="summary-row total-row">
              <strong>Total a Recibir:</strong>
              <strong>{{ formatCurrency(totalModal) }}</strong>
            </div>
          </div>

          <div class="modal-buttons">
            <button type="button" class="btn-cancel" @click="showModal = false">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="isSaving">
              {{ isSaving ? 'Guardando...' : 'Confirmar y Guardar Abonos' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payments-view {
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
.stat-card.blue { border-left: 5px solid #2b6cb0; }
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

.stat-desc {
  font-size: 0.75rem;
  color: #a0aec0;
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

.method-tabs {
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

.sub-text {
  display: block;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.concept-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.concept-badge {
  background-color: #edf2f7;
  color: #2d3748;
  padding: 0.2rem 0.55rem;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 600;
}

.ticket-pill {
  background-color: #feebc8;
  color: #744210;
  font-weight: 700;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #fbd38d;
}

.method-tag {
  font-size: 0.8rem;
  font-weight: 600;
}

.money-text {
  font-weight: 600;
  color: #2d3748;
}

.fine-badge {
  color: #c53030;
  background: #fed7d7;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.78rem;
}

.no-fine {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.total-text {
  font-weight: 700;
  color: var(--color-secondary);
}

.date-text {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.center-text {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--color-muted);
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
  width: 760px;
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

.concepts-card-wrapper {
  background-color: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.concepts-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.concepts-card-header label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-primary);
}

.btn-add-line {
  background-color: #ffffff;
  color: var(--color-secondary);
  border: 1px solid var(--color-secondary);
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.btn-add-line:hover {
  background-color: var(--color-secondary);
  color: #ffffff;
}

.btn-add-line-bottom {
  width: 100%;
  background-color: #ffffff;
  color: var(--color-secondary);
  border: 2px dashed var(--color-secondary);
  padding: 0.7rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
  margin-top: 0.5rem;
}

.btn-add-line-bottom:hover {
  background-color: rgba(31, 122, 99, 0.08);
  border-style: solid;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-card {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

.item-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dashed var(--color-border);
  padding-bottom: 0.5rem;
}

.item-number {
  font-weight: 800;
  color: var(--color-primary);
  font-size: 0.85rem;
}

.btn-remove-item {
  background: none;
  border: none;
  color: #e53e3e;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
}

.btn-remove-item:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.item-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.input-currency-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-prefix {
  position: absolute;
  left: 0.75rem;
  color: var(--color-muted);
  font-weight: 700;
  font-size: 0.95rem;
}

.input-currency-wrapper input {
  padding-left: 1.7rem;
  font-weight: 600;
  color: var(--color-primary);
}

.fine-section-inline {
  background-color: #f7fafc;
  border: 1px solid #edf2f7;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.fine-section-inline.active {
  background-color: #fffaf0;
  border-color: #fbd38d;
}

.switch-label-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.switch-label-inline input {
  width: 17px;
  height: 17px;
  accent-color: #dd6b20;
}

.switch-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #744210;
}

.fine-input-inline {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.fine-input-inline label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #744210;
  white-space: nowrap;
}

.fine-wrapper input {
  max-width: 130px;
  padding: 0.45rem 0.6rem 0.45rem 1.6rem;
  border-color: #fbd38d;
  background-color: #ffffff;
}

.summary-box {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.9rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.summary-row.fine-text {
  color: #c53030;
  font-weight: 600;
}

.summary-row.total-row {
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
  margin-top: 0.2rem;
  font-size: 1.15rem;
  color: var(--color-secondary);
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 0.8rem;
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
  .item-grid-2 { grid-template-columns: 1fr; }
  .filters-bar { flex-direction: column; align-items: stretch; }
  .fine-section-inline { flex-direction: column; align-items: flex-start; }
}
</style>