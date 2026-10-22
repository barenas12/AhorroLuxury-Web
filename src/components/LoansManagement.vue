<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import LoanReceipt, { type LoanReceiptData } from './LoanReceipt.vue'

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
  dueDate: string
  installments: number
  status: 'Activo' | 'Pagado' | 'En mora' | 'Anulado'
  observations: string
  paidCapital: number
  paidInterest: number
  registeredByName: string
}

type LoanSortKey = 'id' | 'partner' | 'capital' | 'remainingCapital' | 'interestRate' | 'paidInterest' | 'guarantee' | 'dueDate' | 'registeredBy' | 'status'
type SortDirection = 'asc' | 'desc'

const props = defineProps<{
  currentUser: { id: number, name?: string, user?: string, username?: string }
}>()

const loans = ref<LoanRecord[]>([])
const partners = ref<{ id: number, fullName: string, documentId: string }[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const statusFilter = ref<'Activo' | 'Pagado' | 'Todos'>('Activo')
const sortKey = ref<LoanSortKey>('id')
const sortDirection = ref<SortDirection>('desc')

// Modales
const showCreateModal = ref(false)
const showPayModal = ref(false)
const isSaving = ref(false)
const modalError = ref('')

const selectedLoan = ref<LoanRecord | null>(null)
const loanReceiptRef = ref<InstanceType<typeof LoanReceipt> | null>(null)
const loanReceiptData = ref<LoanReceiptData | null>(null)

// Función para calcular la fecha sumando días
const calculateDueDate = (startDateStr: string, daysToAdd: number): string => {
  if (!startDateStr || !daysToAdd) return ''
  const d = new Date(startDateStr)
  d.setUTCDate(d.getUTCDate() + Number(daysToAdd))
  return d.toISOString().substring(0, 10)
}

// Limpiar el formato de fecha que llega de MySQL (quita el T00:00:00.000Z)
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return String(dateString).substring(0, 10)
}

// Valores por defecto
const today = new Date().toISOString().substring(0, 10)
const defaultTermDays = 30

const newLoanForm = ref({
  partnerId: 0,
  initialCapital: 0,
  interestRate: 7, 
  deliveryMethod: 'transferencia',
  guarantee: 'Oro', 
  deliveryDate: today,
  termDays: defaultTermDays,
  dueDate: calculateDueDate(today, defaultTermDays),
  installments: 1, 
  observations: ''
})

const payForm = ref({
  capitalEfectivo: 0,
  capitalTransferencia: 0,
  interesEfectivo: 0,
  interesTransferencia: 0,
  paymentDate: today,
  observations: ''
})

// Filtramos al usuario en sesión para que no aparezca en la lista de préstamos
const availablePartners = computed(() => {
  const currentUserDoc = String(props.currentUser.user || props.currentUser.username || '')
  return partners.value.filter(p => String(p.documentId) !== currentUserDoc)
})

const loadData = async () => {
  isLoading.value = true
  try {
    const [resLoans, resPartners] = await Promise.all([
      fetch('http://localhost:3000/api/loans'),
      fetch('http://localhost:3000/api/payments/partners')
    ])
    const dataLoans = await resLoans.json()
    const dataPartners = await resPartners.json()

    if (dataLoans.success) loans.value = dataLoans.data
    if (dataPartners.success) partners.value = dataPartners.data
  } catch (err) {
    console.error('Error al cargar préstamos:', err)
  } finally {
    isLoading.value = false
  }
}

// Watcher para recalcular la fecha límite
watch([() => newLoanForm.value.deliveryDate, () => newLoanForm.value.termDays], ([newDate, newDays]) => {
  newLoanForm.value.dueDate = calculateDueDate(newDate as string, newDays as number)
})

const filteredLoans = computed(() => {
  let list = loans.value
  if (statusFilter.value !== 'Todos') {
    list = list.filter(l => l.status === statusFilter.value)
  }
  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    list = list.filter(l => l.partnerName.toLowerCase().includes(q) || l.documentId.includes(q))
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
    case 'remainingCapital': return Number(loan.initialCapital) - Number(loan.paidCapital)
    case 'interestRate': return Number(loan.interestRate)
    case 'paidInterest': return Number(loan.paidInterest)
    case 'guarantee': return loan.guarantee
    case 'dueDate': return formatDate(loan.dueDate)
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
const totalCapitalEnCalle = computed(() => loans.value.reduce((acc, l) => acc + (Number(l.initialCapital) - Number(l.paidCapital)), 0))
const totalGananciaNeta = computed(() => loans.value.reduce((acc, l) => acc + Number(l.paidInterest), 0))

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

const expectedInterest = (loan: Pick<LoanRecord, 'initialCapital' | 'interestRate' | 'installments'>): number =>
  Number(loan.initialCapital) * (Number(loan.interestRate) / 100) * Number(loan.installments)

const getDaysLate = (dueDate: string, referenceDate = today): number => {
  const due = Date.parse(`${formatDate(dueDate)}T00:00:00Z`)
  const reference = Date.parse(`${formatDate(referenceDate)}T00:00:00Z`)
  if (Number.isNaN(due) || Number.isNaN(reference)) return 0
  return Math.max(0, Math.floor((reference - due) / 86400000))
}

const downloadLoanReceipt = async (data: LoanReceiptData): Promise<void> => {
  loanReceiptData.value = data
  await nextTick()
  try {
    if (!loanReceiptRef.value) throw new Error('No se pudo preparar el comprobante.')
    await loanReceiptRef.value.downloadPDF()
  } catch (error) {
    console.error('Error al generar el comprobante del préstamo:', error)
    window.alert('La operación se guardó, pero no se pudo generar el PDF. Inténtalo de nuevo.')
  }
}

// Lógica Formulario de Creación
const openCreateModal = () => {
  modalError.value = ''
  newLoanForm.value = {
    partnerId: availablePartners.value[0]?.id || 0,
    initialCapital: 0,
    interestRate: 7, 
    deliveryMethod: 'transferencia',
    guarantee: 'Oro', 
    deliveryDate: today,
    termDays: defaultTermDays,
    dueDate: calculateDueDate(today, defaultTermDays),
    installments: 1, 
    observations: ''
  }
  showCreateModal.value = true
}

const submitNewLoan = async () => {
  modalError.value = ''
  if (!newLoanForm.value.partnerId || newLoanForm.value.initialCapital <= 0) {
    modalError.value = 'Selecciona un socio y digita un capital mayor a 0.'
    return
  }
  isSaving.value = true
  try {
    // 1. OBTENER DATOS DEL SOCIO PARA EL CONCEPTO
    const partner = availablePartners.value.find(p => p.id === newLoanForm.value.partnerId)
    
    // 2. CREAR EL EGRESO (Salida de caja) PRIMERO
    const egressPayload = {
      concept: `Préstamo Entregado - C.C. ${partner?.documentId}`,
      amount: newLoanForm.value.initialCapital,
      paymentMethod: newLoanForm.value.deliveryMethod,
      recipient: partner?.fullName, // <--- EL NOMBRE DEL SOCIO
      paymentDate: newLoanForm.value.deliveryDate,
      observations: `Garantía: ${newLoanForm.value.guarantee}`,
      registeredBy: props.currentUser.id
    }

    const egressRes = await fetch('http://localhost:3000/api/egresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(egressPayload)
    })
    
    const egressData = await egressRes.json()
    if (!egressRes.ok || !egressData.success) {
      throw new Error(egressData.message || 'Error al descontar el dinero de la caja.')
    }

    // 3. SI EL EGRESO FUE EXITOSO, SE CREA EL CONTRATO DEL PRÉSTAMO
    const loanPayload = { ...newLoanForm.value, registeredBy: props.currentUser.id }
    const loanRes = await fetch('http://localhost:3000/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanPayload)
    })
    
    const loanData = await loanRes.json()
    if (!loanRes.ok || !loanData.success) throw new Error(loanData.message)
    const loanId = Number(loanData.id)
    if (!Number.isFinite(loanId) || loanId <= 0) {
      throw new Error('El préstamo se guardó, pero no se recibió su número de comprobante.')
    }

    const loan = {
      initialCapital: Number(newLoanForm.value.initialCapital),
      interestRate: Number(newLoanForm.value.interestRate),
      installments: Number(newLoanForm.value.installments)
    }
    const interest = expectedInterest(loan)
    const partnerName = partner?.fullName || 'Socio'
    const receiptData: LoanReceiptData = {
      id: String(loanId),
      partnerName,
      documentId: partner?.documentId || '',
      deliveryMethod: newLoanForm.value.deliveryMethod,
      capital: loan.initialCapital,
      guarantee: newLoanForm.value.guarantee,
      interestRate: loan.interestRate,
      deliveryDate: newLoanForm.value.deliveryDate,
      installments: loan.installments,
      dueDate: newLoanForm.value.dueDate,
      daysLate: getDaysLate(newLoanForm.value.dueDate),
      interestPayment: 0,
      remainingInterest: interest,
      capitalPayment: 0,
      remainingCapital: loan.initialCapital,
      totalPayments: 0,
      totalRemaining: loan.initialCapital + interest,
      status: 'Activo',
      adjustment: 'No',
      adjustmentValue: 0,
      description: newLoanForm.value.observations,
      registeredBy: props.currentUser.name || props.currentUser.user || props.currentUser.username || 'Administrador',
      receiptType: 'loan'
    }

    showCreateModal.value = false
    await loadData()
    await downloadLoanReceipt(receiptData)
  } catch (err: any) {
    modalError.value = err.message // Aquí mostrará "¡Fondos insuficientes!"
  } finally {
    isSaving.value = false
  }
}

// Lógica Formulario de Pago Mixto
const openPayModal = (loan: LoanRecord) => {
  modalError.value = ''
  selectedLoan.value = loan
  payForm.value = {
    capitalEfectivo: 0,
    capitalTransferencia: 0,
    interesEfectivo: 0,
    interesTransferencia: 0,
    paymentDate: today,
    observations: ''
  }
  showPayModal.value = true
}

const remainingCapitalSelected = computed(() => Number(selectedLoan.value?.initialCapital || 0) - Number(selectedLoan.value?.paidCapital || 0))

// Cálculo de Interés Pendiente (Capital * Tasa * Cuotas - Abonado)
const remainingInterestSelected = computed(() => {
  if (!selectedLoan.value) return 0
  const expectedInterest = (Number(selectedLoan.value.initialCapital) * (Number(selectedLoan.value.interestRate) / 100)) * Number(selectedLoan.value.installments)
  return Math.max(0, expectedInterest - Number(selectedLoan.value.paidInterest))
})

const totalAbonoCapitalDraft = computed(() => Number(payForm.value.capitalEfectivo || 0) + Number(payForm.value.capitalTransferencia || 0))
const totalAbonoInteresDraft = computed(() => Number(payForm.value.interesEfectivo || 0) + Number(payForm.value.interesTransferencia || 0))
const totalPagoDraft = computed(() => totalAbonoCapitalDraft.value + totalAbonoInteresDraft.value)

const submitMixedPayment = async () => {
  modalError.value = ''
  if (!selectedLoan.value) return
  if (totalPagoDraft.value <= 0) {
    modalError.value = 'El total a pagar debe ser mayor a 0.'
    return
  }
  if (totalAbonoCapitalDraft.value > remainingCapitalSelected.value) {
    modalError.value = 'El abono a capital no puede superar el saldo pendiente.'
    return
  }

  isSaving.value = true
  try {
    const payload = { ...payForm.value, registeredBy: props.currentUser.id }
    const res = await fetch(`http://localhost:3000/api/loans/${selectedLoan.value.id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message)
    if (!Array.isArray(data.paymentIds) || data.paymentIds.length === 0) {
      throw new Error('El abono se guardó, pero el servidor no devolvió sus IDs.')
    }

    const loan = selectedLoan.value
    const abonoCapital = totalAbonoCapitalDraft.value
    const abonoInteres = totalAbonoInteresDraft.value
    const capitalRestante = Math.max(0, remainingCapitalSelected.value - abonoCapital)
    const interesRestante = Math.max(0, remainingInterestSelected.value - abonoInteres)
    const receiptData: LoanReceiptData = {
      id: data.paymentIds.map((id: number) => String(id)).join(', #'),
      partnerName: loan.partnerName,
      documentId: loan.documentId,
      deliveryMethod: loan.deliveryMethod,
      capital: Number(loan.initialCapital),
      guarantee: loan.guarantee,
      interestRate: Number(loan.interestRate),
      deliveryDate: formatDate(loan.deliveryDate),
      installments: Number(loan.installments),
      dueDate: formatDate(loan.dueDate),
      daysLate: getDaysLate(loan.dueDate, payForm.value.paymentDate),
      interestPayment: abonoInteres,
      remainingInterest: interesRestante,
      capitalPayment: abonoCapital,
      remainingCapital: capitalRestante,
      totalPayments: abonoCapital + abonoInteres,
      totalRemaining: capitalRestante + interesRestante,
      status: capitalRestante === 0 ? 'Pagado' : loan.status,
      adjustment: 'No',
      adjustmentValue: 0,
      description: payForm.value.observations,
      registeredBy: props.currentUser.name || props.currentUser.user || props.currentUser.username || 'Administrador',
      receiptType: 'payment'
    }

    showPayModal.value = false
    await loadData()
    await downloadLoanReceipt(receiptData)
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
        <h2>Préstamos & Respaldos</h2>
        <p>Control de capital prestado, intereses cobrados y pagos mixtos (Efectivo/Banco).</p>
      </div>
      <button type="button" class="btn-create" @click="openCreateModal">
        <span>+</span> Entregar Préstamo
      </button>
    </div>

    <div class="stats-row">
      <div class="stat-card primary">
        <span class="stat-label">Capital Prestado</span>
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
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" v-model="searchQuery" placeholder="Buscar socio o cédula..." />
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
            <th><button type="button" class="sort-header" @click="toggleLoanSort('interestRate')">Intereses (%){{ loanSortIndicator('interestRate') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('paidInterest')">Intereses Abonados{{ loanSortIndicator('paidInterest') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('guarantee')">Garantía{{ loanSortIndicator('guarantee') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('dueDate')">Vencimiento{{ loanSortIndicator('dueDate') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('registeredBy')">Responsable (Entregó){{ loanSortIndicator('registeredBy') }}</button></th>
            <th><button type="button" class="sort-header" @click="toggleLoanSort('status')">Estado{{ loanSortIndicator('status') }}</button></th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading"><td colspan="10" class="center-text">Cargando...</td></tr>
          <tr v-for="l in filteredLoans" :key="l.id">
            <td><strong>{{ l.partnerName }}</strong><small class="sub-text">C.C. {{ l.documentId }}</small></td>
            <td class="money-text">{{ formatCurrency(Number(l.initialCapital)) }}</td>
            <td class="money-text debt-text">{{ formatCurrency(Number(l.initialCapital) - Number(l.paidCapital)) }}</td>
            <td class="profit-text"><strong>{{ Number(l.interestRate) }}%</strong></td>
            <td class="money-text profit-text">{{ formatCurrency(Number(l.paidInterest)) }}</td>
            <td>{{ l.guarantee }}</td>
            <td>{{ formatDate(l.dueDate) }}</td>
            <td>{{ l.registeredByName }}</td>
            <td>
              <span :class="['status-badge', l.status === 'Pagado' ? 'paid' : 'active']">{{ l.status }}</span>
            </td>
            <td>
              <button 
                v-if="l.status !== 'Pagado'" 
                class="btn-action-pay" 
                @click="openPayModal(l)"
              >
                Abonar
              </button>
              <span v-else class="text-muted-small">Liquidado</span>
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
          <button class="btn-close" @click="showCreateModal = false">✕</button>
        </div>
        <div v-if="modalError" class="modal-error">{{ modalError }}</div>
        <form @submit.prevent="submitNewLoan" class="modal-form">
          <div class="field">
            <label>Socio *</label>
            <select v-model="newLoanForm.partnerId" required>
              <option v-for="p in availablePartners" :key="p.id" :value="p.id">{{ p.fullName }} - {{ p.documentId }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Capital a Prestar ($) *</label>
              <input type="number" v-model="newLoanForm.initialCapital" required />
            </div>
            <div class="field">
              <label>Interés (%) *</label>
              <input type="number" v-model="newLoanForm.interestRate" step="0.1" required />
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
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Fecha de Entrega *</label>
              <input type="date" v-model="newLoanForm.deliveryDate" required />
            </div>
            <div class="field">
              <label>Plazo (Días) *</label>
              <input type="number" v-model="newLoanForm.termDays" required min="1" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Fecha Límite Calculada</label>
              <input type="date" v-model="newLoanForm.dueDate" disabled class="disabled-input" />
            </div>
            <div class="field">
              <label>N° de Cuotas *</label>
              <input type="number" v-model="newLoanForm.installments" required min="1" />
            </div>
          </div>
          <div class="field mt-2">
            <label>Observaciones (Opcional)</label>
            <input type="text" v-model="newLoanForm.observations" placeholder="Ej. El oro se guarda en la caja fuerte..." />
          </div>
          <div class="modal-buttons">
            <button type="button" class="btn-cancel" @click="showCreateModal = false">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="isSaving">Guardar Préstamo</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL PAGO MIXTO -->
    <div v-if="showPayModal" class="modal-overlay" @click.self="showPayModal = false">
      <div class="modal-box pay-modal">
        <div class="modal-top">
          <h3>Registrar Pago de Préstamo #{{ selectedLoan?.id }}</h3>
          <button class="btn-close" @click="showPayModal = false">✕</button>
        </div>
        
        <div class="loan-info-bar">
          <div>Socio: <strong>{{ selectedLoan?.partnerName }}</strong></div>
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

          <div class="form-row mt-3">
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
            <div class="summary-total">Total a Ingresar Hoy: <span>{{ formatCurrency(totalPagoDraft) }}</span></div>
          </div>

          <div class="modal-buttons">
            <button type="button" class="btn-cancel" @click="showPayModal = false">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="isSaving || totalPagoDraft === 0">Procesar Recibo Consolidado</button>
          </div>
        </form>
      </div>
    </div>

    <LoanReceipt ref="loanReceiptRef" :receiptData="loanReceiptData" />
  </div>
</template>

<style scoped>
.disabled-input { background-color: #f7fafc; cursor: not-allowed; color: #718096; font-weight: 700; }

.loans-view { display: flex; flex-direction: column; gap: 1.8rem; width: 100%; }
.view-header { display: flex; justify-content: space-between; align-items: center; }
.view-header h2 { color: var(--color-primary); font-size: 1.7rem; margin: 0; }
.view-header p { color: var(--color-muted); font-size: 0.95rem; margin-top: 0.2rem; }
.btn-create { background-color: var(--color-secondary); color: #fff; border: none; padding: 0.75rem 1.4rem; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; gap: 0.4rem; }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.2rem; }
.stat-card { background: #fff; padding: 1.3rem 1.6rem; border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.stat-card.primary { border-left: 5px solid var(--color-primary); }
.stat-card.green { border-left: 5px solid var(--color-secondary); }
.stat-card.orange { border-left: 5px solid #dd6b20; }
.stat-label { font-size: 0.85rem; color: var(--color-muted); font-weight: 600; display: block; }
.stat-value { font-size: 1.55rem; color: var(--color-primary); display: block; margin: 0.3rem 0; }
.stat-desc { font-size: 0.75rem; color: #a0aec0; }

.filters-bar { display: flex; justify-content: space-between; gap: 1rem; }
.search-box { position: relative; flex: 1; max-width: 480px; }
.search-box input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.6rem; border: 1px solid var(--color-border); border-radius: 8px; }
.search-icon { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); opacity: 0.6; }
.method-tabs { display: flex; background: #e2e8f0; border-radius: 8px; padding: 0.25rem; }
.tab-btn { border: none; background: none; padding: 0.55rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; color: #4a5568; }
.tab-btn.active { background: #fff; color: var(--color-primary); }

.table-container { background: #fff; border-radius: 8px; border: 1px solid var(--color-border); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 0.95rem 1.1rem; border-bottom: 1px solid var(--color-border); }
th { background-color: var(--color-bg-light); color: var(--color-primary); font-size: 0.85rem; text-transform: uppercase; }
.sort-header { padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; text-transform: inherit; cursor: pointer; white-space: nowrap; }
.money-text { font-weight: 600; }
.debt-text { color: #c53030; }
.profit-text { color: var(--color-secondary); }
.sub-text { display: block; font-size: 0.75rem; color: var(--color-muted); }
.text-muted-small { font-size: 0.85rem; color: var(--color-muted); font-weight: 600;}
.status-badge { padding: 0.25rem 0.65rem; border-radius: 12px; font-size: 0.78rem; font-weight: 700; }
.status-badge.active { background: #bee3f8; color: #2b6cb0; }
.status-badge.paid { background: #c6f6d5; color: #22543d; }
.btn-action-pay { background: #edf2f7; border: 1px solid #cbd5e0; padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: 600; cursor: pointer; color: var(--color-primary); }
.btn-action-pay:hover { background: #e2e8f0; }

.modal-overlay { position: fixed; inset: 0; background: rgba(8,28,45,0.65); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1.5rem; }
.modal-box { background: #fff; border-radius: 8px; width: 600px; max-width: 100%; padding: 2rem; max-height: 90vh; overflow-y: auto; }
.modal-box.pay-modal { width: 750px; }
.modal-top { display: flex; justify-content: space-between; border-bottom: 1px solid var(--color-border); padding-bottom: 1rem; margin-bottom: 1rem; }
.btn-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; }
.modal-error { background: #fee2e2; color: #991b1b; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }
.modal-form { display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--color-primary); }
.field input, .field select { padding: 0.7rem; border: 1px solid var(--color-border); border-radius: 6px; }
.mt-2 { margin-top: 0.8rem; }
.mt-3 { margin-top: 1.2rem; }

.loan-info-bar { background: #fffaf0; border: 1px solid #fbd38d; padding: 0.8rem 1rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; font-size: 0.95rem; }
.debt-balances { display: flex; gap: 0.8rem; align-items: center; }
.divider { color: #cbd5e0; font-weight: 300; }

.payment-split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.split-column { padding: 1.2rem; border-radius: 8px; border: 1px solid var(--color-border); }
.capital-col { background-color: #faf5ff; border-color: #e9d8fd; }
.interes-col { background-color: #f0fff4; border-color: #c6f6d5; }
.split-column h4 { margin: 0 0 1rem 0; font-size: 0.9rem; color: var(--color-primary); text-align: center; }

.summary-box { background: var(--color-bg-light); border: 1px solid var(--color-border); padding: 1rem; border-radius: 8px; margin-top: 1rem; }
.summary-item { display: flex; justify-content: space-between; color: var(--color-muted); margin-bottom: 0.4rem; font-size: 0.9rem; }
.summary-total { display: flex; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 0.6rem; font-size: 1.2rem; font-weight: 700; color: var(--color-secondary); }

.modal-buttons { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
.btn-cancel { background: none; border: 1px solid var(--color-border); padding: 0.7rem 1.4rem; border-radius: 6px; cursor: pointer; }
.btn-save { background: var(--color-secondary); color: #fff; border: none; padding: 0.7rem 1.4rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.5; }
</style>