<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import LoanReceipt, { type LoanReceiptData } from './LoanReceipt.vue'
import { buildScopeQuery, isAdminUser, type ViewerUser } from '../utils/viewerScope'

export interface LoanRecord {
  id: number
  partnerId: number
  partnerName: string
  documentId: string
  initialCapital: number
  interestRate: number
  deliveryMethod: 'efectivo' | 'transferencia'
  guarantee: string
  deliveryDate: string
  termDays: number
  dueDate?: string | null
  lastInterestUpToDateAt?: string | null
  installments: number
  status: 'Activo' | 'Pagado' | 'En mora' | 'Anulado'
  observations: string
  paidCapital: number
  paidInterest: number
  remainingCapital: number
  interestPerCycle: number
  totalExpectedInterest: number
  remainingInterest: number
  condonedInterest: number
  interestAdjustment: number
  overdueTotalDays: number
  overdueMonths: number
  overdueDays: number
  overdueLabel: string
  registeredByName: string
}

export interface LoanPaymentReceipt {
  id: number
  loanId: number
  totalAmount: number
  capitalPayment: number
  interestPayment: number
  paymentDate: string
  createdAt: string
  observations: string
  registeredByName: string
}

type LoanSortKey =
  | 'id'
  | 'partner'
  | 'capital'
  | 'remainingCapital'
  | 'remainingInterest'
  | 'paidInterest'
  | 'guarantee'
  | 'deliveryDate'
  | 'overdueTime'
  | 'registeredBy'
  | 'status'
type SortDirection = 'asc' | 'desc'

const props = defineProps<{
  currentUser: ViewerUser & { id: number }
}>()

const isAdmin = computed(() => isAdminUser(props.currentUser))
const loans = ref<LoanRecord[]>([])
const partners = ref<{ id: number, fullName: string, documentId: string }[]>([])
const isLoading = ref(false)
const searchColumn = ref<'todas' | 'partnerName' | 'documentId' | 'guarantee' | 'deliveryDate' | 'registeredByName'>('todas')
const searchQuery = ref('')
const statusFilter = ref<'Activo' | 'Pagado' | 'Todos'>('Activo')
const sortKey = ref<LoanSortKey>('id')
const sortDirection = ref<SortDirection>('desc')

// Modales
const showCreateModal = ref(false)
const showPayModal = ref(false)
const showEditInterestModal = ref(false)
const showReceiptsModal = ref(false)
const isSaving = ref(false)
const modalError = ref('')

// Autocomplete buscable de socio al crear préstamo
const partnerSearchText = ref('')
const showPartnerDropdown = ref(false)

const selectedLoan = ref<LoanRecord | null>(null)
const loanReceipts = ref<LoanPaymentReceipt[]>([])
const isLoadingReceipts = ref(false)
const loanReceiptRef = ref<InstanceType<typeof LoanReceipt> | null>(null)
const loanReceiptData = ref<LoanReceiptData | null>(null)

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return ''
  return String(dateString).substring(0, 10)
}

const today = new Date().toISOString().substring(0, 10)
const defaultTermDays = 30

const newLoanForm = ref({
  partnerId: 0,
  initialCapital: 0,
  interestRate: 7,
  initialInterestAmount: 0,
  deliveryMethod: 'transferencia' as 'efectivo' | 'transferencia',
  guarantee: 'Oro',
  deliveryDate: today,
  termDays: defaultTermDays,
  installments: 1,
  observations: ''
})

watch(
  [() => newLoanForm.value.initialCapital, () => newLoanForm.value.interestRate],
  ([cap, rate]) => {
    newLoanForm.value.initialInterestAmount = Math.round(Number(cap || 0) * (Number(rate || 0) / 100))
  }
)

const payForm = ref({
  capitalEfectivo: 0,
  capitalTransferencia: 0,
  interesEfectivo: 0,
  interesTransferencia: 0,
  paymentDate: today,
  observations: '',
  markInterestUpToDate: false
})

const editInterestForm = ref({
  interestRate: 7,
  targetRemainingInterest: 0
})

// Filtramos al usuario en sesión para que no aparezca en la lista de préstamos
const availablePartners = computed(() => {
  const currentUserDoc = String(props.currentUser.user || props.currentUser.username || '')
  return partners.value.filter(p => String(p.documentId) !== currentUserDoc)
})

const filteredPartnerOptions = computed(() => {
  const q = partnerSearchText.value.toLowerCase().trim()
  if (!q) return availablePartners.value
  return availablePartners.value.filter(
    p => p.fullName.toLowerCase().includes(q) || String(p.documentId).toLowerCase().includes(q)
  )
})

const initialInterestPreview = computed(() =>
  Math.round(Number(newLoanForm.value.initialCapital || 0) * (Number(newLoanForm.value.interestRate || 0) / 100))
)

const loadData = async () => {
  isLoading.value = true
  try {
    const qs = buildScopeQuery(props.currentUser)
    const requests: Promise<Response>[] = [
      fetch(`${import.meta.env.VITE_API_URL}/api/loans${qs ? `?${qs}` : ''}`)
    ]
    if (isAdmin.value) {
      requests.push(fetch(`${import.meta.env.VITE_API_URL}/api/payments/partners?onlyPartners=1`))
    }
    const [resLoans, resPartners] = await Promise.all(requests)
    if (resLoans) {
      const dataLoans = await resLoans.json()
      if (dataLoans.success) loans.value = dataLoans.data
    }

    if (resPartners) {
      const dataPartners = await resPartners.json()
      if (dataPartners.success) partners.value = dataPartners.data
    }
  } catch (err) {
    console.error('Error al cargar préstamos:', err)
  } finally {
    isLoading.value = false
  }
}

const filteredLoans = computed(() => {
  let list = loans.value
  if (statusFilter.value !== 'Todos') {
    list = list.filter(l => l.status === statusFilter.value)
  }
  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    list = list.filter(l => {
      switch (searchColumn.value) {
        case 'partnerName':
          return l.partnerName.toLowerCase().includes(q)
        case 'documentId':
          return String(l.documentId || '').toLowerCase().includes(q)
        case 'guarantee':
          return (l.guarantee || '').toLowerCase().includes(q)
        case 'deliveryDate':
          return formatDate(l.deliveryDate).toLowerCase().includes(q)
        case 'registeredByName':
          return (l.registeredByName || '').toLowerCase().includes(q)
        default:
          return (
            l.partnerName.toLowerCase().includes(q) ||
            String(l.documentId || '').toLowerCase().includes(q) ||
            (l.guarantee || '').toLowerCase().includes(q) ||
            formatDate(l.deliveryDate).toLowerCase().includes(q) ||
            (l.registeredByName || '').toLowerCase().includes(q)
          )
      }
    })
  }
  return [...list].sort((a, b) => {
    const first = getLoanSortValue(a, sortKey.value)
    const second = getLoanSortValue(b, sortKey.value)
    const comparison = typeof first === 'number' && typeof second === 'number'
      ? first - second
      : String(first).localeCompare(String(second), 'es', { numeric: true, sensitivity: 'base' })
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

const getLoanSortValue = (loan: LoanRecord, key: LoanSortKey): number | string => {
  switch (key) {
    case 'id': return Number(loan.id)
    case 'partner': return loan.partnerName
    case 'capital': return Number(loan.initialCapital)
    case 'remainingCapital': return Number(loan.remainingCapital)
    case 'remainingInterest': return Number(loan.remainingInterest)
    case 'paidInterest': return Number(loan.paidInterest)
    case 'guarantee': return loan.guarantee
    case 'deliveryDate': return formatDate(loan.deliveryDate)
    case 'overdueTime': return Number(loan.overdueTotalDays || 0)
    case 'registeredBy': return loan.registeredByName
    case 'status': return loan.status
  }
}

const toggleLoanSort = (key: LoanSortKey): void => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

const loanSortIndicator = (key: LoanSortKey): string => {
  if (sortKey.value !== key) return ''
  return sortDirection.value === 'asc' ? ' ▲' : ' ▼'
}

// Métricas
const totalCapitalPrestado = computed(() => loans.value.reduce((acc, l) => acc + Number(l.initialCapital), 0))
const totalCapitalEnCalle = computed(() => loans.value.reduce((acc, l) => acc + Number(l.remainingCapital), 0))
const totalGananciaNeta = computed(() => loans.value.reduce((acc, l) => acc + Number(l.paidInterest), 0))

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

const downloadLoanReceipt = async (data: LoanReceiptData): Promise<void> => {
  loanReceiptData.value = data
  await nextTick()
  try {
    if (!loanReceiptRef.value) throw new Error('No se pudo preparar el comprobante.')
    await loanReceiptRef.value.downloadPDF()
  } catch (error) {
    console.error('Error al generar el comprobante del préstamo:', error)
    window.alert('No se pudo generar el PDF. Inténtalo de nuevo.')
  }
}

// Descarga manual del PDF del préstamo (botón al lado del registro)
const downloadLoanContractPDF = async (loan: LoanRecord): Promise<void> => {
  const receiptData: LoanReceiptData = {
    id: String(loan.id),
    partnerName: loan.partnerName,
    documentId: loan.documentId,
    deliveryMethod: loan.deliveryMethod,
    capital: Number(loan.initialCapital),
    guarantee: loan.guarantee,
    interestRate: Number(loan.interestRate),
    deliveryDate: formatDate(loan.deliveryDate),
    installments: Number(loan.installments || 1),
    overdueLabel: loan.overdueLabel || 'Al día',
    interestPayment: Number(loan.paidInterest || 0),
    remainingInterest: Number(loan.remainingInterest || 0),
    capitalPayment: Number(loan.paidCapital || 0),
    remainingCapital: Number(loan.remainingCapital || 0),
    totalPayments: Number(loan.paidCapital || 0) + Number(loan.paidInterest || 0),
    totalRemaining: Number(loan.remainingCapital || 0) + Number(loan.remainingInterest || 0),
    status: loan.status,
    adjustment: Number(loan.condonedInterest || 0) > 0 ? 'Condonación' : 'No',
    adjustmentValue: Number(loan.condonedInterest || 0),
    description: loan.observations || '',
    registeredBy: loan.registeredByName,
    receiptType: 'loan'
  }
  await downloadLoanReceipt(receiptData)
}

// Descarga manual del PDF de un abono consolidado de préstamo (con su ID único)
const downloadLoanPaymentReceiptPDF = async (loan: LoanRecord, receipt: LoanPaymentReceipt): Promise<void> => {
  const receiptData: LoanReceiptData = {
    id: String(receipt.id),
    partnerName: loan.partnerName,
    documentId: loan.documentId,
    deliveryMethod: loan.deliveryMethod,
    capital: Number(loan.initialCapital),
    guarantee: loan.guarantee,
    interestRate: Number(loan.interestRate),
    deliveryDate: formatDate(loan.deliveryDate),
    installments: Number(loan.installments || 1),
    overdueLabel: loan.overdueLabel || 'Al día',
    interestPayment: Number(receipt.interestPayment || 0),
    remainingInterest: Number(loan.remainingInterest || 0),
    capitalPayment: Number(receipt.capitalPayment || 0),
    remainingCapital: Number(loan.remainingCapital || 0),
    totalPayments: Number(receipt.totalAmount || 0),
    totalRemaining: Number(loan.remainingCapital || 0) + Number(loan.remainingInterest || 0),
    status: loan.status,
    adjustment: Number(loan.condonedInterest || 0) > 0 ? 'Condonación' : 'No',
    adjustmentValue: Number(loan.condonedInterest || 0),
    description: receipt.observations || loan.observations || '',
    registeredBy: receipt.registeredByName,
    receiptType: 'payment'
  }
  await downloadLoanReceipt(receiptData)
}

const pickPartnerForLoan = (p: { id: number, fullName: string, documentId: string }) => {
  newLoanForm.value.partnerId = p.id
  partnerSearchText.value = `${p.fullName} - C.C. ${p.documentId}`
  showPartnerDropdown.value = false
}

// Lógica Formulario de Creación
const openCreateModal = () => {
  modalError.value = ''
  partnerSearchText.value = ''
  showPartnerDropdown.value = false
  newLoanForm.value = {
    partnerId: 0,
    initialCapital: 0,
    interestRate: 7,
    initialInterestAmount: 0,
    deliveryMethod: 'transferencia',
    guarantee: 'Oro',
    deliveryDate: today,
    termDays: defaultTermDays,
    installments: 1,
    observations: ''
  }
  showCreateModal.value = true
}

const submitNewLoan = async () => {
  modalError.value = ''
  if (!newLoanForm.value.partnerId || newLoanForm.value.initialCapital <= 0) {
    modalError.value = 'Selecciona un socio de la lista y digita un capital mayor a 0.'
    return
  }
  isSaving.value = true
  try {
    const partner = availablePartners.value.find(p => p.id === newLoanForm.value.partnerId)

    // 1. Crear el egreso (salida de caja) primero
    const egressPayload = {
      concept: `Préstamo Entregado - C.C. ${partner?.documentId}`,
      amount: newLoanForm.value.initialCapital,
      paymentMethod: newLoanForm.value.deliveryMethod,
      recipient: partner?.fullName,
      paymentDate: newLoanForm.value.deliveryDate,
      observations: `Garantía: ${newLoanForm.value.guarantee}`,
      registeredBy: props.currentUser.id
    }

    const egressRes = await fetch(`${import.meta.env.VITE_API_URL}/api/egresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(egressPayload)
    })

    const egressData = await egressRes.json()
    if (!egressRes.ok || !egressData.success) {
      throw new Error(egressData.message || 'Error al descontar el dinero de la caja.')
    }

    // 2. Crear el contrato del préstamo (sin fecha límite obligatoria y sin PDF automático)
    const loanPayload = {
      ...newLoanForm.value,
      installments: Number(newLoanForm.value.installments) || 1,
      registeredBy: props.currentUser.id
    }
    const loanRes = await fetch(`${import.meta.env.VITE_API_URL}/api/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanPayload)
    })

    const loanData = await loanRes.json()
    if (!loanRes.ok || !loanData.success) throw new Error(loanData.message)

    showCreateModal.value = false
    await loadData()
  } catch (err: any) {
    modalError.value = err.message
  } finally {
    isSaving.value = false
  }
}

// Lógica Formulario de Pago Mixto + Botón "Intereses al día"
const openPayModal = (loan: LoanRecord) => {
  modalError.value = ''
  selectedLoan.value = loan
  payForm.value = {
    capitalEfectivo: 0,
    capitalTransferencia: 0,
    interesEfectivo: 0,
    interesTransferencia: 0,
    paymentDate: today,
    observations: '',
    markInterestUpToDate: false
  }
  showPayModal.value = true
}

// Modal de edición flexible de intereses
const openEditInterestModal = (loan: LoanRecord) => {
  modalError.value = ''
  selectedLoan.value = loan
  editInterestForm.value = {
    interestRate: Number(loan.interestRate),
    targetRemainingInterest: Number(loan.remainingInterest)
  }
  showEditInterestModal.value = true
}

const submitEditInterest = async () => {
  if (!selectedLoan.value) return
  modalError.value = ''
  isSaving.value = true
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/loans/${selectedLoan.value.id}/interest`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interestRate: Number(editInterestForm.value.interestRate),
        targetRemainingInterest: Number(editInterestForm.value.targetRemainingInterest)
      })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || 'No se pudo actualizar el interés.')

    showEditInterestModal.value = false
    await loadData()
  } catch (err: any) {
    modalError.value = err.message
  } finally {
    isSaving.value = false
  }
}

// Modal de recibos consolidados del préstamo
const openReceiptsModal = async (loan: LoanRecord) => {
  selectedLoan.value = loan
  loanReceipts.value = []
  showReceiptsModal.value = true
  isLoadingReceipts.value = true
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/loans/${loan.id}/receipts`)
    const data = await res.json()
    if (data.success) loanReceipts.value = data.data
  } catch (err) {
    console.error('Error al cargar recibos del préstamo:', err)
  } finally {
    isLoadingReceipts.value = false
  }
}

const remainingCapitalSelected = computed(() => Number(selectedLoan.value?.remainingCapital || 0))
const remainingInterestSelected = computed(() => Number(selectedLoan.value?.remainingInterest || 0))
const totalAbonoCapitalDraft = computed(() => Number(payForm.value.capitalEfectivo || 0) + Number(payForm.value.capitalTransferencia || 0))
const totalAbonoInteresDraft = computed(() => Number(payForm.value.interesEfectivo || 0) + Number(payForm.value.interesTransferencia || 0))
const totalPagoDraft = computed(() => totalAbonoCapitalDraft.value + totalAbonoInteresDraft.value)

const submitMixedPayment = async () => {
  modalError.value = ''
  if (!selectedLoan.value) return
  if (totalPagoDraft.value <= 0 && !payForm.value.markInterestUpToDate) {
    modalError.value = 'El total a pagar debe ser mayor a 0 o marcar "Intereses al día".'
    return
  }
  if (totalAbonoCapitalDraft.value > remainingCapitalSelected.value) {
    modalError.value = 'El abono a capital no puede superar el saldo pendiente.'
    return
  }

  isSaving.value = true
  try {
    const payload = { ...payForm.value, registeredBy: props.currentUser.id }
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/loans/${selectedLoan.value.id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message)

    // PDF NO automático: cerramos el modal y recargamos datos
    showPayModal.value = false
    await loadData()
  } catch (err: any) {
    modalError.value = err.message
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="loans-view">
    <div class="view-header">
      <div>
        <h2>Préstamos y Respaldos</h2>
        <p>Control de capital prestado, intereses flexibles (7% por defecto), tiempo en mora y comprobantes consolidados.</p>
      </div>
      <button v-if="isAdmin" type="button" class="btn-create" @click="openCreateModal">
        <span>+</span> Entregar Préstamo
      </button>
    </div>

    <div class="stats-row">
      <div class="stat-card primary">
        <span class="stat-label">Capital Pendiente</span>
        <strong class="stat-value">{{ formatCurrency(totalCapitalEnCalle) }}</strong>
        <small class="stat-desc">Dinero pendiente por cobrar</small>
      </div>
      <div class="stat-card green">
        <span class="stat-label">Ganancia Neta (Intereses)</span>
        <strong class="stat-value">{{ formatCurrency(totalGananciaNeta) }}</strong>
        <small class="stat-desc">Utilidad pura del fondo</small>
      </div>
      <div class="stat-card orange">
        <span class="stat-label">Capital Total Movido</span>
        <strong class="stat-value">{{ formatCurrency(totalCapitalPrestado) }}</strong>
        <small class="stat-desc">Histórico entregado</small>
      </div>
    </div>

    <div class="filters-bar">
      <div class="column-filter-group">
        <select v-model="searchColumn" class="column-select" @change="searchQuery = ''">
          <option value="todas">Columna: Todas</option>
          <option value="partnerName">Socio (Nombre)</option>
          <option value="documentId">Cédula</option>
          <option value="guarantee">Garantía</option>
          <option value="deliveryDate">Fecha Entrega</option>
          <option value="registeredByName">Responsable</option>
        </select>

        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" v-model="searchQuery" placeholder="Escribe el valor a filtrar..." />
          <button v-if="searchQuery" class="btn-clear" @click="searchQuery = ''">✕</button>
        </div>
      </div>
      <div class="method-tabs">
        <button :class="['tab-btn', { active: statusFilter === 'Todos' }]" @click="statusFilter = 'Todos'">Todos</button>
        <button :class="['tab-btn', { active: statusFilter === 'Activo' }]" @click="statusFilter = 'Activo'">Activos</button>
        <button :class="['tab-btn', { active: statusFilter === 'Pagado' }]" @click="statusFilter = 'Pagado'">Pagados</button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('partner')">Socio{{ loanSortIndicator('partner') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('capital')">Capital Prestado{{ loanSortIndicator('capital') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('remainingCapital')">Capital Pendiente{{ loanSortIndicator('remainingCapital') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('remainingInterest')">Interés Pendiente{{ loanSortIndicator('remainingInterest') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('paidInterest')">Intereses Abonados{{ loanSortIndicator('paidInterest') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('guarantee')">Garantía{{ loanSortIndicator('guarantee') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('deliveryDate')">Entrega / Plazo{{ loanSortIndicator('deliveryDate') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('overdueTime')">Tiempo en Mora{{ loanSortIndicator('overdueTime') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('status')">Estado{{ loanSortIndicator('status') }}</button></th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading"><td colspan="10" class="center-text">Cargando...</td></tr>
          <tr v-else-if="filteredLoans.length === 0"><td colspan="10" class="center-text">No hay préstamos con los filtros actuales.</td></tr>
          <tr v-for="l in filteredLoans" :key="l.id">
            <td>
              <strong>{{ l.partnerName }}</strong>
              <small class="sub-text">C.C. {{ l.documentId }}</small>
            </td>
            <td class="money-text">{{ formatCurrency(Number(l.initialCapital)) }}</td>
            <td class="money-text debt-text">{{ formatCurrency(Number(l.remainingCapital)) }}</td>
            <td>
              <span class="money-text interest-pending-text">{{ formatCurrency(Number(l.remainingInterest)) }}</span>
              <small class="sub-text">Tasa: {{ Number(l.interestRate) }}% ({{ formatCurrency(Number(l.interestPerCycle)) }}/ciclo)</small>
            </td>
            <td class="money-text profit-text">
              {{ formatCurrency(Number(l.paidInterest)) }}
              <small v-if="Number(l.condonedInterest) > 0" class="sub-text">Cond: {{ formatCurrency(Number(l.condonedInterest)) }}</small>
            </td>
            <td>{{ l.guarantee }}</td>
            <td>
              <strong>{{ formatDate(l.deliveryDate) }}</strong>
              <small class="sub-text">Plazo: {{ l.termDays }}d · Cuotas (info): {{ l.installments }}</small>
            </td>
            <td>
              <span :class="['mora-pill', l.overdueTotalDays > 0 ? 'expired' : 'ok']">
                {{ l.overdueLabel }}
              </span>
              <small v-if="l.lastInterestUpToDateAt" class="sub-text">Al día: {{ l.lastInterestUpToDateAt }}</small>
            </td>
            <td>
              <span :class="['status-badge', l.status === 'Pagado' ? 'paid' : 'active']">{{ l.status }}</span>
            </td>
            <td>
              <div class="actions-cell">
                <button
                  v-if="isAdmin && l.status !== 'Pagado'"
                  type="button"
                  class="btn-action-pay"
                  @click="openPayModal(l)"
                >
                  Abonar
                </button>
                <button
                  v-if="isAdmin && l.status !== 'Pagado'"
                  type="button"
                  class="btn-action-secondary"
                  @click="openEditInterestModal(l)"
                  title="Modificar % o valor del interés"
                >
                  ✏️ Int
                </button>
                <button
                  type="button"
                  class="btn-action-pdf"
                  @click="downloadLoanContractPDF(l)"
                  title="Descargar PDF del préstamo"
                >
                  📄 PDF
                </button>
                <button
                  type="button"
                  class="btn-action-secondary"
                  @click="openReceiptsModal(l)"
                  title="Ver recibos consolidados de abonos"
                >
                  🧾
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL NUEVO PRÉSTAMO -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-box">
        <div class="modal-top">
          <h3>Entregar Nuevo Préstamo</h3>
          <button type="button" class="btn-close" @click="showCreateModal = false">✕</button>
        </div>
        <div v-if="modalError" class="modal-error">{{ modalError }}</div>
        <form @submit.prevent="submitNewLoan" class="modal-form">
          <div class="field autocomplete-field">
            <label>Socio (escribe nombre o documento) *</label>
            <input
              type="text"
              v-model="partnerSearchText"
              placeholder="Escribe el nombre o cédula del socio..."
              @focus="showPartnerDropdown = true"
              @blur="showPartnerDropdown = false"
              @input="newLoanForm.partnerId = 0; showPartnerDropdown = true"
              autocomplete="off"
              required
            />
            <div v-if="showPartnerDropdown" class="autocomplete-list">
              <div
                v-for="p in filteredPartnerOptions"
                :key="p.id"
                class="autocomplete-item"
                @mousedown.prevent="pickPartnerForLoan(p)"
              >
                <strong>{{ p.fullName }}</strong>
                <small>C.C. {{ p.documentId }}</small>
              </div>
              <div v-if="filteredPartnerOptions.length === 0" class="autocomplete-empty">
                No se encontraron socios.
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Capital a Prestar ($) *</label>
              <input type="number" v-model="newLoanForm.initialCapital" min="1" required />
            </div>
            <div class="field">
              <label>Tasa Interés Cada 30 Días (%) *</label>
              <input type="number" v-model="newLoanForm.interestRate" step="0.1" min="0" required />
              <small class="interest-hint">
                Cada 30 días de mora suma: <strong>{{ formatCurrency(initialInterestPreview) }}</strong>
              </small>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Plazo (Días) *</label>
              <input type="number" v-model="newLoanForm.termDays" required min="1" />
            </div>
            <div class="field">
              <label>Valor Interés Inicial ($) — Manual en Pesos *</label>
              <input type="number" v-model="newLoanForm.initialInterestAmount" min="0" step="500" required />
              <small class="interest-hint" v-if="Number(newLoanForm.termDays) < 30">
                Plazo menor a 30 días ({{ newLoanForm.termDays }}d): ingresa el valor manual en pesos.
              </small>
              <small class="interest-hint" v-else>
                Editable en pesos si deseas un valor inicial distinto al {{ newLoanForm.interestRate }}%.
              </small>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Forma de Entrega *</label>
              <select v-model="newLoanForm.deliveryMethod" required>
                <option value="transferencia">Transferencia / Nequi</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>
            <div class="field">
              <label>Garantía *</label>
              <select v-model="newLoanForm.guarantee" required>
                <option value="Oro">Oro</option>
                <option value="Prenda">Prenda</option>
                <option value="Sin Prenda">Sin Prenda</option>
                <option value="Negocio">Negocio</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Fecha de Entrega *</label>
              <input type="date" v-model="newLoanForm.deliveryDate" required />
            </div>
            <div class="field">
              <label>N° de Cuotas (Informativo)</label>
              <input type="number" v-model="newLoanForm.installments" min="1" placeholder="Opcional / Informativo" />
            </div>
          </div>

          <div class="field">
            <label>Observaciones (Opcional)</label>
            <input type="text" v-model="newLoanForm.observations" placeholder="Ej. Detalle de garantía 'Otro' o acuerdo..." />
          </div>

          <div class="modal-buttons">
            <button type="button" class="btn-cancel" @click="showCreateModal = false">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="isSaving">Guardar Préstamo</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL PAGO MIXTO + BOTÓN INTERESES AL DÍA -->
    <div v-if="showPayModal" class="modal-overlay" @click.self="showPayModal = false">
      <div class="modal-box pay-modal">
        <div class="modal-top">
          <h3>Registrar Pago de Préstamo #{{ selectedLoan?.id }}</h3>
          <button type="button" class="btn-close" @click="showPayModal = false">✕</button>
        </div>

        <div class="loan-info-bar">
          <div>
            Socio: <strong>{{ selectedLoan?.partnerName }}</strong>
            <span class="mora-inline">({{ selectedLoan?.overdueLabel }})</span>
          </div>
          <div class="debt-balances">
            <span>Capital Pendiente: <strong class="debt-text">{{ formatCurrency(remainingCapitalSelected) }}</strong></span>
            <span class="divider">|</span>
            <span>Interés Pendiente: <strong class="profit-text">{{ formatCurrency(remainingInterestSelected) }}</strong></span>
          </div>
        </div>

        <div v-if="modalError" class="modal-error">{{ modalError }}</div>

        <form @submit.prevent="submitMixedPayment" class="modal-form">
          <div class="payment-split-grid">
            <div class="split-column capital-col">
              <h4>Abonos a CAPITAL</h4>
              <div class="field">
                <label>Vía Transferencia ($)</label>
                <input type="number" v-model="payForm.capitalTransferencia" min="0" placeholder="0" />
              </div>
              <div class="field mt-2">
                <label>Vía Efectivo ($)</label>
                <input type="number" v-model="payForm.capitalEfectivo" min="0" placeholder="0" />
              </div>
            </div>

            <div class="split-column interes-col">
              <h4>Abonos a INTERESES (Ganancia)</h4>
              <div class="field">
                <label>Vía Transferencia ($)</label>
                <input type="number" v-model="payForm.interesTransferencia" min="0" placeholder="0" />
              </div>
              <div class="field mt-2">
                <label>Vía Efectivo ($)</label>
                <input type="number" v-model="payForm.interesEfectivo" min="0" placeholder="0" />
              </div>
            </div>
          </div>

          <!-- Botón Intereses al día -->
          <div :class="['up-to-date-box', { active: payForm.markInterestUpToDate }]">
            <div class="up-to-date-text">
              <strong>Intereses al día</strong>
              <small>
                Al activarlo, los intereses pendientes hasta la fecha del pago serán condonados y el conteo de mora/intereses se reiniciará desde esa fecha.
              </small>
            </div>
            <button
              type="button"
              :class="['btn-interest-up-to-date', { active: payForm.markInterestUpToDate }]"
              @click="payForm.markInterestUpToDate = !payForm.markInterestUpToDate"
            >
              {{ payForm.markInterestUpToDate ? '✅ Intereses Al Día Activado' : 'Marcar Intereses Al Día' }}
            </button>
          </div>

          <div class="form-row mt-2">
            <div class="field">
              <label>Fecha del Pago *</label>
              <input type="date" v-model="payForm.paymentDate" required />
            </div>
            <div class="field">
              <label>Observaciones (Opcional)</label>
              <input type="text" v-model="payForm.observations" placeholder="Ej. Comprobante Nequi 1234" />
            </div>
          </div>

          <div class="summary-box">
            <div class="summary-item">Total Abono Capital: <strong>{{ formatCurrency(totalAbonoCapitalDraft) }}</strong></div>
            <div class="summary-item">Total Abono Interés: <strong>{{ formatCurrency(totalAbonoInteresDraft) }}</strong></div>
            <div v-if="payForm.markInterestUpToDate" class="summary-item condone-info">
              Interés a condonar hasta la fecha:
              <strong>{{ formatCurrency(Math.max(0, remainingInterestSelected - totalAbonoInteresDraft)) }}</strong>
            </div>
            <div class="summary-total">Total a Ingresar Hoy: <span>{{ formatCurrency(totalPagoDraft) }}</span></div>
          </div>

          <div class="modal-buttons">
            <button type="button" class="btn-cancel" @click="showPayModal = false">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="isSaving || (totalPagoDraft === 0 && !payForm.markInterestUpToDate)">
              Guardar Pago Consolidado
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL EDITAR INTERESES FLEXIBLEMENTE -->
    <div v-if="showEditInterestModal" class="modal-overlay" @click.self="showEditInterestModal = false">
      <div class="modal-box small-modal">
        <div class="modal-top">
          <h3>Modificar Intereses — Préstamo #{{ selectedLoan?.id }}</h3>
          <button type="button" class="btn-close" @click="showEditInterestModal = false">✕</button>
        </div>
        <div v-if="modalError" class="modal-error">{{ modalError }}</div>
        <form @submit.prevent="submitEditInterest" class="modal-form">
          <div class="field">
            <label>Tasa de Interés (%) sobre Capital Inicial</label>
            <input type="number" v-model="editInterestForm.interestRate" step="0.1" min="0" required />
          </div>
          <div class="field">
            <label>Valor Interés Pendiente Actual ($)</label>
            <input type="number" v-model="editInterestForm.targetRemainingInterest" min="0" step="500" required />
            <small class="interest-hint">Puedes ajustar libremente el valor de los intereses a cobrar hoy.</small>
          </div>
          <div class="modal-buttons">
            <button type="button" class="btn-cancel" @click="showEditInterestModal = false">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="isSaving">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL RECIBOS CONSOLIDADOS DEL PRÉSTAMO -->
    <div v-if="showReceiptsModal && selectedLoan" class="modal-overlay" @click.self="showReceiptsModal = false">
      <div class="modal-box pay-modal">
        <div class="modal-top">
          <h3>Recibos de Abonos — Préstamo #{{ selectedLoan.id }} ({{ selectedLoan.partnerName }})</h3>
          <button type="button" class="btn-close" @click="showReceiptsModal = false">✕</button>
        </div>

        <div v-if="isLoadingReceipts" class="center-text">Cargando recibos...</div>
        <div v-else-if="loanReceipts.length === 0" class="center-text">Este préstamo aún no tiene abonos registrados.</div>
        <div v-else class="receipts-list">
          <div v-for="rec in loanReceipts" :key="rec.id" class="receipt-item-row">
            <div>
              <strong>Recibo #{{ rec.id }}</strong> · <span>{{ rec.paymentDate }}</span>
              <small class="sub-text">
                Capital: {{ formatCurrency(rec.capitalPayment) }} · Interés: {{ formatCurrency(rec.interestPayment) }} · Por: {{ rec.registeredByName }}
              </small>
            </div>
            <div class="receipt-item-right">
              <strong class="profit-text">{{ formatCurrency(rec.totalAmount) }}</strong>
              <button type="button" class="btn-action-pdf" @click="downloadLoanPaymentReceiptPDF(selectedLoan, rec)">
                📄 PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <LoanReceipt ref="loanReceiptRef" :receiptData="loanReceiptData" />
  </div>
</template>

<style scoped>
.loans-view { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; min-width: 0; }
.view-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.view-header h2 { color: var(--color-primary); font-size: clamp(1.35rem, 2.5vw, 1.7rem); margin: 0; }
.view-header p { color: var(--color-muted); font-size: 0.95rem; margin-top: 0.2rem; }
.btn-create { background-color: var(--color-secondary); color: #fff; border: none; padding: 0.75rem 1.4rem; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: 1rem; }
.stat-card { background: #fff; padding: 1.2rem 1.4rem; border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.stat-card.primary { border-left: 5px solid var(--color-primary); }
.stat-card.green { border-left: 5px solid var(--color-secondary); }
.stat-card.orange { border-left: 5px solid #dd6b20; }
.stat-label { font-size: 0.85rem; color: var(--color-muted); font-weight: 600; display: block; }
.stat-value { font-size: 1.55rem; color: var(--color-primary); display: block; margin: 0.3rem 0; }
.stat-desc { font-size: 0.75rem; color: #a0aec0; }

.filters-bar { display: flex; justify-content: space-between; align-items: center; gap: 0.85rem; flex-wrap: wrap; }
.column-filter-group { display: flex; align-items: center; gap: 0.65rem; flex: 1 1 280px; min-width: 0; max-width: 640px; flex-wrap: wrap; }
.column-select { padding: 0.72rem 0.9rem; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; font-weight: 600; color: var(--color-primary); font-size: 0.88rem; max-width: 100%; }
.search-box { position: relative; flex: 1 1 180px; min-width: 0; }
.search-box input { width: 100%; padding: 0.75rem 2.4rem 0.75rem 2.6rem; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; }
.search-icon { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); opacity: 0.6; }
.btn-clear { position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; }
.method-tabs { display: flex; flex-wrap: wrap; background: #e2e8f0; border-radius: 8px; padding: 0.25rem; max-width: 100%; }
.tab-btn { border: none; background: none; padding: 0.55rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; color: #4a5568; }
.tab-btn.active { background: #fff; color: var(--color-primary); }

.table-container { width: 100%; background: #fff; border-radius: 8px; border: 1px solid var(--color-border); overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
th, td { padding: 0.9rem 1rem; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
th { background-color: var(--color-bg-light); color: var(--color-primary); font-size: 0.82rem; text-transform: uppercase; }
.sort-header { padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; text-transform: inherit; cursor: pointer; white-space: nowrap; }
.money-text { font-weight: 600; }
span.money-text { display: block; }
.debt-text { color: #c53030; }
.interest-pending-text { color: #b7791f; font-weight: 700; }
.profit-text { color: var(--color-secondary); }
.sub-text { display: block; font-size: 0.74rem; color: var(--color-muted); }
.status-badge { padding: 0.25rem 0.65rem; border-radius: 12px; font-size: 0.78rem; font-weight: 700; }
.status-badge.active { background: #bee3f8; color: #2b6cb0; }
.status-badge.paid { background: #c6f6d5; color: #22543d; }

.mora-pill { padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 700; font-size: 0.78rem; display: inline-block; }
.mora-pill.expired { background: #fed7d7; color: #c53030; }
.mora-pill.ok { background: #e6fffa; color: #234e52; }
.mora-inline { font-size: 0.82rem; color: #718096; margin-left: 0.4rem; }

.actions-cell { display: flex; gap: 0.35rem; align-items: center; }
.btn-action-pay { background: var(--color-secondary); color: #fff; border: none; padding: 0.38rem 0.7rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.btn-action-secondary { background: #edf2f7; border: 1px solid #cbd5e0; padding: 0.35rem 0.6rem; border-radius: 6px; font-weight: 600; font-size: 0.78rem; cursor: pointer; color: var(--color-primary); }
.btn-action-pdf { background: #fff; border: 1px solid var(--color-primary); color: var(--color-primary); padding: 0.35rem 0.6rem; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; }
.btn-action-pdf:hover { background: var(--color-primary); color: #fff; }
.center-text { text-align: center; padding: 2rem; color: var(--color-muted); }

.modal-overlay { position: fixed; inset: 0; background: rgba(8,28,45,0.65); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1.5rem; }
.modal-box { background: #fff; border-radius: 8px; width: 620px; max-width: 100%; padding: 2rem; max-height: 92vh; overflow-y: auto; }
.modal-box.pay-modal { width: 760px; }
.modal-box.small-modal { width: 460px; }
.modal-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 1rem; margin-bottom: 1rem; }
.modal-top h3 { margin: 0; color: var(--color-primary); }
.btn-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; }
.modal-error { background: #fee2e2; color: #991b1b; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }
.modal-form { display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--color-primary); }
.field input, .field select { padding: 0.7rem; border: 1px solid var(--color-border); border-radius: 6px; }
.interest-hint { font-size: 0.78rem; color: var(--color-secondary); }
.mt-2 { margin-top: 0.8rem; }

.autocomplete-field { position: relative; }
.autocomplete-list { position: absolute; top: 70px; left: 0; right: 0; background: #fff; border: 1px solid var(--color-border); border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 50; box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
.autocomplete-item { padding: 0.6rem 0.85rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
.autocomplete-item:hover { background: #edf2f7; }
.autocomplete-empty { padding: 0.8rem; text-align: center; color: #718096; font-size: 0.85rem; }

.loan-info-bar { background: #fffaf0; border: 1px solid #fbd38d; padding: 0.85rem 1rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1rem; font-size: 0.92rem; }
.debt-balances { display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap; }
.divider { color: #cbd5e0; font-weight: 300; }

.payment-split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.split-column { padding: 1.2rem; border-radius: 8px; border: 1px solid var(--color-border); }
.capital-col { background-color: #faf5ff; border-color: #e9d8fd; }
.interes-col { background-color: #f0fff4; border-color: #c6f6d5; }
.split-column h4 { margin: 0 0 1rem 0; font-size: 0.9rem; color: var(--color-primary); text-align: center; }

.up-to-date-box { background: #f8fafc; border: 1px solid var(--color-border); border-radius: 8px; padding: 0.9rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.up-to-date-box.active { background: #f0fff4; border-color: #68d391; }
.up-to-date-text { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 220px; }
.up-to-date-text small { color: #4a5568; font-size: 0.78rem; }
.btn-interest-up-to-date { background: #fff; border: 2px solid var(--color-secondary); color: var(--color-secondary); padding: 0.5rem 0.95rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.83rem; }
.btn-interest-up-to-date.active { background: var(--color-secondary); color: #fff; }

.summary-box { background: var(--color-bg-light); border: 1px solid var(--color-border); padding: 1rem; border-radius: 8px; }
.summary-item { display: flex; justify-content: space-between; color: var(--color-muted); margin-bottom: 0.4rem; font-size: 0.9rem; }
.condone-info { color: #b7791f; font-weight: 600; }
.summary-total { display: flex; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 0.6rem; font-size: 1.2rem; font-weight: 700; color: var(--color-secondary); }

.receipts-list { display: flex; flex-direction: column; gap: 0.7rem; }
.receipt-item-row { display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; border: 1px solid var(--color-border); border-radius: 8px; background: #f8fafc; gap: 1rem; }
.receipt-item-right { display: flex; align-items: center; gap: 0.8rem; }

.modal-buttons { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
.btn-cancel { background: none; border: 1px solid var(--color-border); padding: 0.7rem 1.4rem; border-radius: 6px; cursor: pointer; }
.btn-save { background: var(--color-secondary); color: #fff; border: none; padding: 0.7rem 1.4rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.5; }

@media (max-width: 720px) {
  .modal-overlay { padding: 0.85rem; }
  .modal-box { padding: 1.25rem; }
  .form-row,
  .payment-split-grid { grid-template-columns: 1fr; gap: 0.9rem; }
  .column-select { width: 100%; }
  .method-tabs { width: 100%; }
  .tab-btn { flex: 1; text-align: center; padding: 0.55rem 0.65rem; }
  .btn-create { width: 100%; }
  .receipt-item-row { flex-direction: column; align-items: flex-start; }
  .receipt-item-right { width: 100%; justify-content: space-between; }
  .modal-buttons { flex-direction: column-reverse; }
  .modal-buttons button { width: 100%; }
}
</style>
