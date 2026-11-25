<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import ReceiptTicket, { type TicketData } from './ReceiptTicket.vue'
import { buildScopeQuery, isAdminUser, type ViewerUser } from '../utils/viewerScope'

export interface ConsolidatedReceiptItem {
  id: number
  concept: string
  ticketNumber?: string | null
  raffleType?: 1 | 2 | null
  externalTicketId?: number | null
  amount: number
  hasFine: number
  fineAmount: number
  totalPaid: number
  paymentMethod: 'efectivo' | 'transferencia'
  paymentDate: string
  observations?: string
}

export interface ConsolidatedReceiptRecord {
  id: number
  receiptType: 'payment' | 'loan_payment'
  partnerId: number | null
  externalTicketId: number | null
  loanId: number | null
  payerType: 'partner' | 'external'
  partnerName: string
  partnerDocument: string
  registeredBy: number
  registeredByName: string
  totalAmount: number
  totalPureAmount: number
  totalFines: number
  paymentDate: string
  createdAt: string
  observations: string
  paymentMethods: ('efectivo' | 'transferencia')[]
  conceptsSummary: string
  itemsCount: number
  items: ConsolidatedReceiptItem[]
}

export interface PayerTicketOption {
  number: string
  raffleType: 1 | 2
  raffleLabel: string
  isPaid: boolean
  externalTicketId: number | null
}

export interface PayerOption {
  key: string
  id: number
  partnerId: number | null
  externalTicketId: number | null
  payerType: 'partner' | 'external'
  documentId: string
  fullName: string
  coordinatorName?: string
  savingsValue: number
  frequency: number
  quotaValue: number
  savingsStartDate?: string | null
  statusValue?: string
  tickets: PayerTicketOption[]
}

export interface PaymentRowItem {
  concept: string
  ticketKey?: string // `${raffleType}:${number}:${externalTicketId || ''}`
  ticketNumber?: string
  raffleType?: 1 | 2 | null
  externalTicketId?: number | null
  amount: number
  paymentMethod: 'efectivo' | 'transferencia'
  paymentDate: string
  observations: string
  hasFine: boolean
  fineAmount: number
}

type PaymentSortKey =
  | 'id'
  | 'partner'
  | 'concept'
  | 'method'
  | 'amount'
  | 'fine'
  | 'total'
  | 'paymentDate'
  | 'registeredBy'
  | 'createdAt'
type SortDirection = 'asc' | 'desc'

const props = defineProps<{
  currentUser: ViewerUser & { id: number }
}>()

const isAdmin = computed(() => isAdminUser(props.currentUser))
const receipts = ref<ConsolidatedReceiptRecord[]>([])
const payers = ref<PayerOption[]>([])
const searchColumn = ref<'todas' | 'partnerName' | 'partnerDocument' | 'conceptsSummary' | 'paymentDate' | 'registeredByName' | 'ticket'>('todas')
const searchQuery = ref('')
const methodFilter = ref<string>('todos')
const sortKey = ref<PaymentSortKey>('id')
const sortDirection = ref<SortDirection>('desc')
const isLoading = ref(false)
const showModal = ref(false)
const isSaving = ref(false)
const modalError = ref('')
const itemsListRef = ref<HTMLElement | null>(null)

// Autocomplete buscable de socio / comprador externo
const payerSearchText = ref('')
const showPayerDropdown = ref(false)

// Referencia al componente y datos del recibo PDF (descarga manual por botón)
const receiptRef = ref<InstanceType<typeof ReceiptTicket> | null>(null)
const currentTicketData = ref<TicketData | null>(null)

const allConcepts = [
  'Abono Ahorro',
  'Pago Boleta',
  'Pago Cuota Préstamo',
  'Multa',
  'Otro Aporte'
]

const form = ref({
  selectedKey: '',
  partnerId: null as number | null,
  externalTicketId: null as number | null,
  payerType: 'partner' as 'partner' | 'external',
  markSavingsUpToDate: false,
  items: [] as PaymentRowItem[]
})

const selectedPayer = computed<PayerOption | null>(() => {
  return payers.value.find(p => p.key === form.value.selectedKey) || null
})

const filteredPayerOptions = computed(() => {
  const q = payerSearchText.value.toLowerCase().trim()
  if (!q) return payers.value
  return payers.value.filter(p =>
    p.fullName.toLowerCase().includes(q) ||
    String(p.documentId || '').toLowerCase().includes(q) ||
    p.tickets.some(t => t.number.includes(q))
  )
})

const availableConceptsForPayer = computed(() => {
  if (selectedPayer.value?.payerType === 'external') {
    return ['Pago Boleta']
  }
  return allConcepts
})

const getTicketOptionKey = (t: PayerTicketOption): string =>
  `${t.raffleType}:${t.number}:${t.externalTicketId ?? ''}`

const getAvailableTicketsForRow = (currentIndex: number): PayerTicketOption[] => {
  const allTickets = selectedPayer.value?.tickets || []
  const takenKeys = form.value.items
    .filter((item, idx) => idx !== currentIndex && item.concept === 'Pago Boleta' && item.ticketKey)
    .map(item => item.ticketKey as string)

  return allTickets.filter(t => !takenKeys.includes(getTicketOptionKey(t)))
}

const loadData = async (): Promise<void> => {
  isLoading.value = true
  try {
    const qs = buildScopeQuery(props.currentUser)
    const requests: Promise<Response>[] = [
      fetch(`${import.meta.env.VITE_API_URL}/api/payments/consolidated${qs ? `?${qs}` : ''}`)
    ]
    if (isAdmin.value) {
      requests.push(fetch(`${import.meta.env.VITE_API_URL}/api/payments/partners`))
    }

    const [resReceipts, resPartners] = await Promise.all(requests)
    if (resReceipts) {
      const dataReceipts = await resReceipts.json()
      if (dataReceipts.success) receipts.value = dataReceipts.data
    }

    if (resPartners) {
      const dataPartners = await resPartners.json()
      if (dataPartners.success) payers.value = dataPartners.data
    }
  } catch (err) {
    console.error('Error al cargar pagos:', err)
  } finally {
    isLoading.value = false
  }
}

const getSelectedPartnerQuota = (): number => {
  if (!selectedPayer.value || selectedPayer.value.payerType !== 'partner') return 0
  return Number(selectedPayer.value.quotaValue || selectedPayer.value.savingsValue || 0)
}

const applyTicketSelectionToRow = (row: PaymentRowItem, ticketKey: string | undefined) => {
  const tickets = selectedPayer.value?.tickets || []
  const found = tickets.find(t => getTicketOptionKey(t) === ticketKey)
  if (found) {
    row.ticketKey = ticketKey
    row.ticketNumber = found.number
    row.raffleType = found.raffleType
    row.externalTicketId = found.externalTicketId
  } else {
    row.ticketKey = undefined
    row.ticketNumber = undefined
    row.raffleType = null
    row.externalTicketId = null
  }
}

const onConceptChange = (index: number) => {
  const row = form.value.items[index]
  if (!row) return

  if (row.concept === 'Abono Ahorro') {
    row.amount = getSelectedPartnerQuota()
    applyTicketSelectionToRow(row, undefined)
  } else if (row.concept === 'Pago Boleta') {
    const available = getAvailableTicketsForRow(index)
    const firstUnpaid = available.find(t => !t.isPaid) || available[0]
    applyTicketSelectionToRow(row, firstUnpaid ? getTicketOptionKey(firstUnpaid) : undefined)
    row.amount = 30000
  } else if (row.concept === 'Multa') {
    row.amount = 0
    row.hasFine = true
    row.fineAmount = row.fineAmount || 0
    applyTicketSelectionToRow(row, undefined)
  } else {
    row.amount = 0
    applyTicketSelectionToRow(row, undefined)
  }
}

const onTicketKeyChange = (index: number) => {
  const row = form.value.items[index]
  if (!row) return
  applyTicketSelectionToRow(row, row.ticketKey)
  if (!row.amount || row.amount <= 0) {
    row.amount = 30000
  }
}

const pickPayer = (payer: PayerOption) => {
  form.value.selectedKey = payer.key
  form.value.partnerId = payer.partnerId
  form.value.externalTicketId = payer.externalTicketId
  form.value.payerType = payer.payerType
  form.value.markSavingsUpToDate = false

  payerSearchText.value =
    payer.payerType === 'external'
      ? `${payer.fullName} (Externo · Tel: ${payer.documentId})`
      : `${payer.fullName} - C.C. ${payer.documentId}`
  showPayerDropdown.value = false

  // Reajustar las filas existentes al nuevo pagador
  form.value.items.forEach((item, idx) => {
    if (payer.payerType === 'external') {
      item.concept = 'Pago Boleta'
      const available = getAvailableTicketsForRow(idx)
      const firstUnpaid = available.find(t => !t.isPaid) || available[0]
      applyTicketSelectionToRow(item, firstUnpaid ? getTicketOptionKey(firstUnpaid) : undefined)
      item.amount = 30000
      item.hasFine = false
      item.fineAmount = 0
    } else if (item.concept === 'Abono Ahorro') {
      item.amount = Number(payer.quotaValue || payer.savingsValue || 0)
      applyTicketSelectionToRow(item, undefined)
    } else if (item.concept === 'Pago Boleta') {
      const available = getAvailableTicketsForRow(idx)
      const firstUnpaid = available.find(t => !t.isPaid) || available[0]
      applyTicketSelectionToRow(item, firstUnpaid ? getTicketOptionKey(firstUnpaid) : undefined)
      item.amount = 30000
    }
  })
}

const createDefaultRow = (): PaymentRowItem => {
  const isExt = selectedPayer.value?.payerType === 'external'
  const baseRow: PaymentRowItem = {
    concept: isExt ? 'Pago Boleta' : 'Abono Ahorro',
    amount: isExt ? 30000 : getSelectedPartnerQuota(),
    paymentMethod: 'efectivo',
    paymentDate: new Date().toISOString().substring(0, 10),
    observations: '',
    hasFine: false,
    fineAmount: 0
  }

  if (isExt) {
    const available = getAvailableTicketsForRow(form.value.items.length)
    const firstUnpaid = available.find(t => !t.isPaid) || available[0]
    if (firstUnpaid) {
      applyTicketSelectionToRow(baseRow, getTicketOptionKey(firstUnpaid))
    }
  }
  return baseRow
}

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
  payerSearchText.value = ''
  showPayerDropdown.value = false
  form.value = {
    selectedKey: '',
    partnerId: null,
    externalTicketId: null,
    payerType: 'partner',
    markSavingsUpToDate: false,
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

const filteredReceipts = computed(() => {
  let list = receipts.value
  const q = searchQuery.value.toLowerCase().trim()

  if (methodFilter.value !== 'todos') {
    list = list.filter(r => r.paymentMethods.includes(methodFilter.value as 'efectivo' | 'transferencia'))
  }

  if (q) {
    list = list.filter(r => {
      switch (searchColumn.value) {
        case 'partnerName':
          return r.partnerName.toLowerCase().includes(q)
        case 'partnerDocument':
          return String(r.partnerDocument || '').toLowerCase().includes(q)
        case 'conceptsSummary':
          return r.conceptsSummary.toLowerCase().includes(q)
        case 'paymentDate':
          return (r.paymentDate || '').toLowerCase().includes(q)
        case 'registeredByName':
          return (r.registeredByName || '').toLowerCase().includes(q)
        case 'ticket':
          return r.items.some(it => it.ticketNumber && it.ticketNumber.includes(q))
        default:
          return (
            r.partnerName.toLowerCase().includes(q) ||
            String(r.partnerDocument || '').toLowerCase().includes(q) ||
            r.conceptsSummary.toLowerCase().includes(q) ||
            (r.paymentDate || '').toLowerCase().includes(q) ||
            (r.registeredByName || '').toLowerCase().includes(q) ||
            r.items.some(it => it.ticketNumber && it.ticketNumber.includes(q))
          )
      }
    })
  }

  return [...list].sort((a, b) => {
    const first = getPaymentSortValue(a, sortKey.value)
    const second = getPaymentSortValue(b, sortKey.value)
    const comparison = typeof first === 'number' && typeof second === 'number'
      ? first - second
      : String(first).localeCompare(String(second), 'es', { numeric: true, sensitivity: 'base' })
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

const getPaymentSortValue = (receipt: ConsolidatedReceiptRecord, key: PaymentSortKey): number | string => {
  switch (key) {
    case 'id': return Number(receipt.id)
    case 'partner': return receipt.partnerName
    case 'concept': return receipt.conceptsSummary
    case 'method': return receipt.paymentMethods.join(', ')
    case 'amount': return Number(receipt.totalPureAmount)
    case 'fine': return Number(receipt.totalFines)
    case 'total': return Number(receipt.totalAmount)
    case 'paymentDate': return receipt.paymentDate
    case 'registeredBy': return receipt.registeredByName
    case 'createdAt': return receipt.createdAt
  }
}

const togglePaymentSort = (key: PaymentSortKey): void => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

const paymentSortIndicator = (key: PaymentSortKey): string => {
  if (sortKey.value !== key) return ''
  return sortDirection.value === 'asc' ? ' ▲' : ' ▼'
}

const totalRecaudado = computed(() =>
  filteredReceipts.value.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0)
)

const totalAbonosPuros = computed(() =>
  filteredReceipts.value.reduce(
    (acc, r) => acc + r.items.filter(i => i.concept === 'Abono Ahorro').reduce((s, i) => s + Number(i.amount || 0), 0),
    0
  )
)

const totalBoletas = computed(() =>
  filteredReceipts.value.reduce(
    (acc, r) => acc + r.items.filter(i => i.concept === 'Pago Boleta').reduce((s, i) => s + Number(i.amount || 0), 0),
    0
  )
)

const totalMultas = computed(() =>
  filteredReceipts.value.reduce((acc, r) => acc + Number(r.totalFines || 0), 0)
)

const downloadReceiptPDF = async (receipt: ConsolidatedReceiptRecord): Promise<void> => {
  currentTicketData.value = {
    id: String(receipt.id),
    date: receipt.paymentDate,
    partnerName: receipt.partnerName,
    documentId: receipt.payerType === 'external' ? `Externo (${receipt.partnerDocument})` : receipt.partnerDocument,
    totalAmount: receipt.totalAmount,
    registeredBy: receipt.registeredByName,
    items: receipt.items.map(item => {
      let label = item.concept
      if (item.concept === 'Pago Boleta' && item.ticketNumber) {
        const rLabel = item.raffleType ? ` (Rifa ${item.raffleType})` : ''
        label = `Pago Boleta #${item.ticketNumber}${rLabel}`
      } else if (Number(item.amount) === 0 && Number(item.fineAmount) > 0) {
        label = `${item.concept} (Solo Multa)`
      } else if (Number(item.fineAmount) > 0) {
        label = `${item.concept} (+ Multa ${formatCurrency(Number(item.fineAmount))})`
      }
      return {
        concept: label,
        amount: Number(item.amount) + Number(item.fineAmount || 0),
        method: item.paymentMethod
      }
    })
  }

  await nextTick()
  try {
    if (!receiptRef.value) throw new Error('No se pudo preparar el recibo.')
    await receiptRef.value.downloadPDF()
  } catch (error) {
    console.error('Error al descargar el recibo:', error)
    window.alert('No se pudo generar el PDF. Inténtalo de nuevo.')
  }
}

const submitPayment = async () => {
  modalError.value = ''

  if (!selectedPayer.value) {
    modalError.value = 'Debes seleccionar un socio o comprador externo de la lista.'
    return
  }

  for (const item of form.value.items) {
    const amountVal = Number(item.amount || 0)
    const fineVal = item.hasFine ? Number(item.fineAmount || 0) : 0

    if (amountVal < 0 || fineVal < 0 || amountVal + fineVal <= 0) {
      modalError.value = `El concepto "${item.concept}" debe tener un monto de abono o una multa mayor a $0.`
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
      partnerId: selectedPayer.value.partnerId,
      externalTicketId: selectedPayer.value.externalTicketId,
      registeredBy: props.currentUser.id,
      markSavingsUpToDate: selectedPayer.value.payerType === 'partner' ? form.value.markSavingsUpToDate : false,
      items: form.value.items.map(it => ({
        concept: it.concept,
        ticketNumber: it.concept === 'Pago Boleta' ? it.ticketNumber : null,
        raffleType: it.concept === 'Pago Boleta' ? (it.raffleType || null) : null,
        externalTicketId: it.externalTicketId || (selectedPayer.value?.payerType === 'external' ? selectedPayer.value.externalTicketId : null),
        amount: Number(it.amount || 0),
        paymentMethod: it.paymentMethod,
        paymentDate: it.paymentDate,
        observations: it.observations,
        hasFine: it.hasFine,
        fineAmount: it.hasFine ? Number(it.fineAmount || 0) : 0
      }))
    }

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al guardar los abonos.')
    }

    // PDF NO automático: cerramos el modal y recargamos la tabla consolidada
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

const getFrequencyName = (freq: number): string => {
  if (freq === 8) return 'Semanal'
  if (freq === 15) return 'Quincenal'
  return 'Mensual'
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
        <h2>Control de Pagos y Multas</h2>
        <p>Historial consolidado por recibo único, abonos, boletas (socios y externos) y recargos por mora.</p>
      </div>
      <button v-if="isAdmin" type="button" class="btn-create" @click="openCreateModal">
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
      <div class="column-filter-group">
        <select v-model="searchColumn" class="column-select" @change="searchQuery = ''">
          <option value="todas">Columna: Todas</option>
          <option value="partnerName">Socio / Externo</option>
          <option value="partnerDocument">Documento / Tel</option>
          <option value="conceptsSummary">Conceptos</option>
          <option value="paymentDate">Fecha Imputada</option>
          <option value="registeredByName">Registrado Por</option>
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

      <div class="method-tabs">
        <button :class="['tab-btn', { active: methodFilter === 'todos' }]" @click="methodFilter = 'todos'">Todos</button>
        <button :class="['tab-btn', { active: methodFilter === 'efectivo' }]" @click="methodFilter = 'efectivo'">Efectivo</button>
        <button :class="['tab-btn', { active: methodFilter === 'transferencia' }]" @click="methodFilter = 'transferencia'">Transferencia</button>
      </div>
    </div>

    <!-- Tabla Consolidada (1 fila por recibo único + botón manual PDF, sin columna Recibo #) -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th><button type="button" class="sort-header" @click="togglePaymentSort('partner')">Socio / Externo{{ paymentSortIndicator('partner') }}</button></th>
            <th><button type="button" class="sort-header" @click="togglePaymentSort('concept')">Conceptos{{ paymentSortIndicator('concept') }}</button></th>
            <th><button type="button" class="sort-header" @click="togglePaymentSort('method')">Medio{{ paymentSortIndicator('method') }}</button></th>
            <th><button type="button" class="sort-header" @click="togglePaymentSort('amount')">Monto Abono{{ paymentSortIndicator('amount') }}</button></th>
            <th><button type="button" class="sort-header" @click="togglePaymentSort('fine')">Mora / Multa{{ paymentSortIndicator('fine') }}</button></th>
            <th><button type="button" class="sort-header" @click="togglePaymentSort('total')">Total Recibido{{ paymentSortIndicator('total') }}</button></th>
            <th><button type="button" class="sort-header" @click="togglePaymentSort('paymentDate')">Fecha Imputada{{ paymentSortIndicator('paymentDate') }}</button></th>
            <th><button type="button" class="sort-header" @click="togglePaymentSort('registeredBy')">Registrado Por{{ paymentSortIndicator('registeredBy') }}</button></th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="9" class="center-text">Cargando comprobantes consolidados...</td>
          </tr>
          <tr v-else-if="filteredReceipts.length === 0">
            <td colspan="9" class="center-text empty-state">No se registraron movimientos con los filtros actuales.</td>
          </tr>
          <tr v-for="rec in filteredReceipts" :key="rec.id">
            <td>
              <strong>{{ rec.partnerName }}</strong>
              <small class="sub-text">
                <span v-if="rec.payerType === 'external'">Tel: {{ rec.partnerDocument }}</span>
                <span v-else>C.C. {{ rec.partnerDocument }}</span>
              </small>
            </td>
            <td>
              <div class="concept-cell">
                <span class="concept-badge">{{ rec.conceptsSummary }}</span>
                <small v-if="rec.itemsCount > 1" class="multi-pill">
                  {{ rec.itemsCount }} pagos agrupados
                </small>
              </div>
            </td>
            <td>
              <div class="methods-stack">
                <span v-for="m in rec.paymentMethods" :key="m" :class="['method-tag', m]">
                  {{ m === 'efectivo' ? 'Efectivo' : 'Transferencia' }}
                </span>
              </div>
            </td>
            <td class="money-text">{{ formatCurrency(Number(rec.totalPureAmount)) }}</td>
            <td>
              <span v-if="rec.totalFines > 0" class="fine-badge">
                +{{ formatCurrency(Number(rec.totalFines)) }}
              </span>
              <span v-else class="no-fine">Sin mora</span>
            </td>
            <td class="total-text">{{ formatCurrency(Number(rec.totalAmount)) }}</td>
            <td><strong>{{ rec.paymentDate }}</strong></td>
            <td>{{ rec.registeredByName }}</td>
            <td>
              <button
                type="button"
                class="btn-pdf-row"
                @click="downloadReceiptPDF(rec)"
                title="Descargar comprobante PDF consolidado"
              >
                📄 PDF
              </button>
            </td>
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
          <!-- 1. BUSCADOR ESCRIBIBLE DE SOCIO O COMPRADOR EXTERNO -->
          <div class="field autocomplete-field">
            <label for="pSocioSearch">Socio o Comprador Externo (escribe nombre o documento) *</label>
            <input
              id="pSocioSearch"
              type="text"
              v-model="payerSearchText"
              placeholder="Escribe el nombre, cédula o número de boleta..."
              @focus="showPayerDropdown = true"
              @input="form.selectedKey = ''; showPayerDropdown = true"
              autocomplete="off"
              required
            />
            <div v-if="showPayerDropdown" class="autocomplete-list">
              <div
                v-for="p in filteredPayerOptions"
                :key="p.key"
                class="autocomplete-item"
                @mousedown.prevent="pickPayer(p)"
              >
                <div>
                  <strong>{{ p.fullName }}</strong>
                  <span v-if="p.payerType === 'external'" class="ext-badge-inline">Externo</span>
                  <small class="ac-sub">
                    {{ p.payerType === 'external' ? `Tel: ${p.documentId}` : `C.C. ${p.documentId} · Cuota ${getFrequencyName(p.frequency)}: ${formatCurrency(p.quotaValue)}` }}
                  </small>
                </div>
                <small v-if="p.tickets.length > 0" class="ac-tickets">
                  {{ p.tickets.length }} bol.
                </small>
              </div>
              <div v-if="filteredPayerOptions.length === 0" class="autocomplete-empty">
                No se encontraron resultados.
              </div>
            </div>

            <!-- Info rápida de cuota dividida + Botón "Al día" -->
            <div v-if="selectedPayer && selectedPayer.payerType === 'partner'" class="partner-info-banner">
              <div class="partner-quota-info">
                <span>
                  Cuota {{ getFrequencyName(selectedPayer.frequency) }}:
                  <strong>{{ formatCurrency(selectedPayer.quotaValue) }}</strong>
                  <small>(Mensual: {{ formatCurrency(selectedPayer.savingsValue) }})</small>
                </span>
              </div>
              <button
                type="button"
                :class="['btn-al-dia', { active: form.markSavingsUpToDate }]"
                @click="form.markSavingsUpToDate = !form.markSavingsUpToDate"
              >
                {{ form.markSavingsUpToDate ? '✅ Se marcará AL DÍA' : 'Marcar Ahorro Al Día' }}
              </button>
            </div>
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

                <!-- Concepto y Monto -->
                <div class="item-grid-2">
                  <div class="field">
                    <label>Concepto *</label>
                    <select v-model="item.concept" @change="onConceptChange(idx)" required>
                      <option v-for="c in availableConceptsForPayer" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </div>

                  <!-- Selector exclusivo de boletas (Rifa 1 y Rifa 2) -->
                  <div v-if="item.concept === 'Pago Boleta'" class="field">
                    <label>N° Boleta a Pagar *</label>
                    <select
                      v-model="item.ticketKey"
                      @change="onTicketKeyChange(idx)"
                      required
                    >
                      <option v-if="getAvailableTicketsForRow(idx).length === 0" :value="undefined" disabled>
                        No hay boletas disponibles para asignar
                      </option>
                      <option
                        v-for="t in getAvailableTicketsForRow(idx)"
                        :key="getTicketOptionKey(t)"
                        :value="getTicketOptionKey(t)"
                      >
                        {{ t.raffleLabel }} - Boleta #{{ t.number }} {{ t.isPaid ? '(Pagada)' : '(Pendiente)' }}
                      </option>
                    </select>
                  </div>

                  <!-- Valor (permite 0 si se registra solo multa) -->
                  <div class="field">
                    <label>Valor Abono ($) *</label>
                    <div class="input-currency-wrapper">
                      <span class="currency-prefix">$</span>
                      <input
                        type="number"
                        v-model="item.amount"
                        min="0"
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
                    placeholder="Ej. Aprobación Nequi M12345 o multa para ponerse al día"
                  />
                </div>

                <!-- Mora / Multa manual -->
                <div :class="['fine-section-inline', { active: item.hasFine }]">
                  <label class="switch-label-inline">
                    <input type="checkbox" v-model="item.hasFine" />
                    <span class="switch-title">¿Incluye multa / recargo por mora? (Puedes poner abono $0 y solo multa)</span>
                  </label>

                  <div v-if="item.hasFine" class="fine-input-inline">
                    <label>Valor Multa ($) - Ingreso Manual</label>
                    <div class="input-currency-wrapper fine-wrapper">
                      <span class="currency-prefix">$</span>
                      <input
                        type="number"
                        v-model="item.fineAmount"
                        min="0"
                        step="500"
                        placeholder="Ej. 50000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="button" class="btn-add-line-bottom" @click="addConceptRow">
              <span>+</span> Agregar Otro Concepto (mismo recibo único)
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

    <!-- COMPONENTE INVISIBLE PARA GENERAR EL PDF (Solo al dar clic en el botón PDF) -->
    <ReceiptTicket ref="receiptRef" :ticketData="currentTicketData" />
  </div>
</template>

<style scoped>
.payments-view { width: 100%; display: flex; flex-direction: column; gap: 1.8rem; }
.view-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.view-header h2 { color: var(--color-primary); font-size: 1.7rem; margin: 0; }
.view-header p { color: var(--color-muted); font-size: 0.95rem; margin-top: 0.2rem; }
.btn-create { background-color: var(--color-secondary); color: #fff; border: none; padding: 0.75rem 1.4rem; border-radius: var(--radius); font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(31, 122, 99, 0.25); }
.btn-create:hover { opacity: 0.92; transform: translateY(-1px); }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.2rem; }
.stat-card { background: #fff; padding: 1.3rem 1.6rem; border-radius: var(--radius); border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 0.25rem; box-shadow: var(--shadow); }
.stat-card.primary { border-left: 5px solid var(--color-primary); }
.stat-card.green { border-left: 5px solid var(--color-secondary); }
.stat-card.blue { border-left: 5px solid #2b6cb0; }
.stat-card.orange { border-left: 5px solid #dd6b20; }
.stat-label { font-size: 0.85rem; color: var(--color-muted); font-weight: 600; }
.stat-value { font-size: 1.55rem; color: var(--color-primary); }
.stat-desc { font-size: 0.75rem; color: #a0aec0; }

.filters-bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.column-filter-group { display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 280px; max-width: 640px; flex-wrap: wrap; }
.column-select { padding: 0.72rem 0.9rem; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; font-weight: 600; color: var(--color-primary); font-size: 0.88rem; }
.search-box { position: relative; flex: 1; min-width: 200px; }
.search-box input { width: 100%; padding: 0.75rem 2.4rem 0.75rem 2.6rem; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; }
.search-icon { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); opacity: 0.6; }
.btn-clear { position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; }
.method-tabs { display: flex; background: #e2e8f0; border-radius: 8px; padding: 0.25rem; }
.tab-btn { border: none; background: none; padding: 0.55rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; color: #4a5568; }
.tab-btn.active { background: #fff; color: var(--color-primary); }

.table-container { width: 100%; background: #fff; border-radius: var(--radius); border: 1px solid var(--color-border); box-shadow: var(--shadow); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
th, td { padding: 0.9rem 1rem; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
th { background-color: var(--color-bg-light); color: var(--color-primary); font-size: 0.82rem; text-transform: uppercase; }
.sort-header { padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; text-transform: inherit; cursor: pointer; }
.receipt-id-badge { background: #edf2f7; color: var(--color-primary); font-weight: 800; padding: 0.22rem 0.55rem; border-radius: 6px; font-size: 0.82rem; }
.sub-text { display: block; font-size: 0.75rem; color: var(--color-muted); }
.ext-badge { background: #e9d8fd; color: #553c9a; padding: 0.1rem 0.45rem; border-radius: 6px; font-weight: 700; font-size: 0.72rem; }
.ext-badge-inline { background: #e9d8fd; color: #553c9a; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700; font-size: 0.7rem; margin-left: 0.4rem; }
.concept-cell { display: flex; flex-direction: column; gap: 0.2rem; white-space: normal; max-width: 260px; }
.concept-badge { font-weight: 600; color: #2d3748; font-size: 0.85rem; }
.multi-pill { color: #2b6cb0; font-size: 0.72rem; font-weight: 700; }
.methods-stack { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.method-tag { padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
.method-tag.efectivo { background: #fefcbf; color: #744210; }
.method-tag.transferencia { background: #ebf8ff; color: #2b6cb0; }
.money-text { font-weight: 600; }
.total-text { font-weight: 800; color: var(--color-secondary); }
.fine-badge { background: #fed7d7; color: #9b2c2c; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.78rem; }
.no-fine { color: #a0aec0; font-size: 0.8rem; }
.btn-pdf-row { background: #fff; border: 1px solid var(--color-primary); color: var(--color-primary); padding: 0.35rem 0.7rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.btn-pdf-row:hover { background: var(--color-primary); color: #fff; }
.center-text { text-align: center; padding: 2.5rem; color: var(--color-muted); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(8,28,45,0.65); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1.5rem; }
.modal-box { background: #fff; border-radius: 8px; width: 720px; max-width: 100%; padding: 2rem; max-height: 92vh; overflow-y: auto; }
.modal-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 1rem; margin-bottom: 1.2rem; }
.modal-top h3 { margin: 0; color: var(--color-primary); }
.btn-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; }
.modal-error { background: #fee2e2; color: #991b1b; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }
.modal-form { display: flex; flex-direction: column; gap: 1.1rem; }

.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--color-primary); }
.field input, .field select { padding: 0.7rem; border: 1px solid var(--color-border); border-radius: 6px; }

.autocomplete-field { position: relative; }
.autocomplete-list { position: absolute; top: 72px; left: 0; right: 0; background: #fff; border: 1px solid var(--color-border); border-radius: 6px; max-height: 220px; overflow-y: auto; z-index: 60; box-shadow: 0 8px 20px rgba(0,0,0,0.14); }
.autocomplete-item { padding: 0.65rem 0.9rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
.autocomplete-item:hover { background: #edf2f7; }
.ac-sub { display: block; color: #718096; font-size: 0.76rem; }
.ac-tickets { background: #feebc8; color: #744210; padding: 0.15rem 0.45rem; border-radius: 6px; font-weight: 700; font-size: 0.72rem; }
.autocomplete-empty { padding: 0.85rem; text-align: center; color: #718096; font-size: 0.85rem; }

.partner-info-banner { margin-top: 0.5rem; background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.partner-quota-info { font-size: 0.86rem; color: #22543d; }
.partner-quota-info small { color: #4a5568; margin-left: 0.3rem; }
.btn-al-dia { background: #fff; border: 2px solid var(--color-secondary); color: var(--color-secondary); padding: 0.45rem 0.9rem; border-radius: 8px; font-weight: 700; font-size: 0.83rem; cursor: pointer; transition: all 0.15s ease; }
.btn-al-dia.active { background: var(--color-secondary); color: #fff; }

.concepts-card-wrapper { display: flex; flex-direction: column; gap: 0.8rem; }
.concepts-card-header { display: flex; justify-content: space-between; align-items: center; }
.concepts-card-header label { font-size: 0.9rem; font-weight: 700; color: var(--color-primary); }
.btn-add-line { background: var(--color-primary); color: #fff; border: none; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.83rem; }
.btn-add-line-bottom { background: #edf2f7; color: var(--color-primary); border: 1px dashed #a0aec0; padding: 0.65rem; border-radius: 8px; font-weight: 700; cursor: pointer; }

.items-list { display: flex; flex-direction: column; gap: 0.9rem; }
.item-card { background: #f8fafc; border: 1px solid var(--color-border); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; }
.item-card-top { display: flex; justify-content: space-between; align-items: center; }
.item-number { font-weight: 700; color: var(--color-primary); font-size: 0.86rem; }
.btn-remove-item { background: none; border: none; color: #c53030; cursor: pointer; font-size: 0.82rem; font-weight: 600; }
.btn-remove-item:disabled { opacity: 0.4; cursor: not-allowed; }
.item-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; }

.input-currency-wrapper { position: relative; display: flex; align-items: center; }
.currency-prefix { position: absolute; left: 0.7rem; color: #718096; font-weight: 700; }
.input-currency-wrapper input { width: 100%; padding-left: 1.6rem; }

.fine-section-inline { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.7rem; }
.fine-section-inline.active { background: #fff5f5; border-color: #feb2b2; }
.switch-label-inline { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #2d3748; }
.fine-input-inline { display: flex; flex-direction: column; gap: 0.35rem; max-width: 280px; }
.fine-input-inline label { font-size: 0.82rem; font-weight: 700; color: #9b2c2c; }
.fine-input-inline input { width: 100%; padding: 0.7rem 0.8rem 0.7rem 1.75rem; border: 1px solid #feb2b2; border-radius: 8px; background: #ffffff; color: var(--color-text-dark); font-size: 0.94rem; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.fine-input-inline input:focus { border-color: #c53030; box-shadow: 0 0 0 3px rgba(197, 48, 48, 0.14); }

.summary-box { background: var(--color-bg-light); border: 1px solid var(--color-border); padding: 1rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.4rem; }
.summary-row { display: flex; justify-content: space-between; font-size: 0.92rem; }
.fine-text { color: #c53030; font-weight: 600; }
.total-row { border-top: 1px solid var(--color-border); padding-top: 0.6rem; margin-top: 0.3rem; font-size: 1.15rem; color: var(--color-secondary); }

.modal-buttons { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 0.5rem; }
.btn-cancel { background: none; border: 1px solid var(--color-border); padding: 0.7rem 1.4rem; border-radius: 6px; cursor: pointer; }
.btn-save { background: var(--color-secondary); color: #fff; border: none; padding: 0.7rem 1.4rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.5; }
</style>
