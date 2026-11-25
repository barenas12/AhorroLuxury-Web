<script setup lang="ts">
import { jsPDF } from 'jspdf'

export interface LoanReceiptData {
  id: string
  loanId: string
  partnerName: string
  documentId: string
  deliveryMethod: string
  capital: number
  guarantee: string
  interestMode?: 'percentage' | 'fixed'
  interestPerCycle?: number
  interestRate: number
  deliveryDate: string
  installments: number
  overdueLabel: string
  interestPayment: number
  remainingInterest: number
  capitalPayment: number
  remainingCapital: number
  totalPayments: number
  totalRemaining: number
  status: string
  adjustment: string
  adjustmentValue: number
  description: string
  registeredBy: string
  receiptType: 'loan' | 'payment'
}

const props = defineProps<{
  receiptData: LoanReceiptData | null
}>()

const sanitizeFilename = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim()
    .replace(/\s+/g, '_')

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(amount) || 0)

const formatDate = (date: string): string => {
  if (!date) return ''
  const [year, month, day] = date.substring(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : date
}

interface LoadedLogo {
  dataUrl: string
  width: number
  height: number
}

const loadLogoImage = (): Promise<LoadedLogo | null> =>
  new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 200
        canvas.height = img.naturalHeight || 100
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0)
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height
        })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = '/img/logo-luxury.png'
  })

const buildReceiptDocument = (data: LoanReceiptData, logo: LoadedLogo | null): jsPDF => {
  const pageWidth = 80
  const marginX = 5
  const contentWidth = pageWidth - marginX * 2
  const labelMaxWidth = 31
  const valueMaxWidth = contentWidth - labelMaxWidth - 2

  const interestLabel =
    data.interestMode === 'fixed' && data.interestPerCycle !== undefined
      ? `${formatCurrency(data.interestPerCycle)}/ciclo (${data.interestRate}%)`
      : data.interestPerCycle !== undefined && data.interestPerCycle > 0
        ? `${data.interestRate}% (${formatCurrency(data.interestPerCycle)}/ciclo)`
        : `${data.interestRate}%`

  const deliveryLabel =
    data.deliveryMethod === 'transferencia'
      ? 'Transferencia'
      : data.deliveryMethod === 'efectivo'
        ? 'Efectivo'
        : data.deliveryMethod

  type RowEntry = { label: string; value: string; boldRow?: boolean }

  const section1: RowEntry[] = [
    ...(data.receiptType === 'payment'
      ? [{ label: 'N° Recibo', value: `#${data.id}` }]
      : []),
    { label: 'ID Préstamo', value: `#${data.loanId || data.id}`, boldRow: true },
    { label: 'Solicitante', value: data.partnerName },
    { label: 'Documento', value: String(data.documentId || '-') },
    { label: 'Se entrega en', value: deliveryLabel },
    { label: 'Capital', value: formatCurrency(data.capital) },
    { label: 'Préstamo en', value: data.guarantee },
    { label: 'Interés', value: interestLabel }
  ]

  const section2: RowEntry[] = [
    { label: 'Fecha Entrega', value: formatDate(data.deliveryDate) },
    { label: 'N° Cuotas (Info)', value: String(data.installments) },
    { label: 'Tiempo en mora', value: data.overdueLabel }
  ]

  const section3: RowEntry[] = [
    { label: 'Abono intereses', value: formatCurrency(data.interestPayment) },
    { label: 'Restante intereses', value: formatCurrency(data.remainingInterest) },
    { label: 'Abono capital', value: formatCurrency(data.capitalPayment) },
    { label: 'Restante capital', value: formatCurrency(data.remainingCapital) },
    { label: 'Total abonos', value: formatCurrency(data.totalPayments), boldRow: true },
    { label: 'Total restante', value: formatCurrency(data.totalRemaining), boldRow: true },
    { label: 'Estado préstamo', value: data.status },
    { label: 'Ajuste', value: data.adjustment },
    { label: 'Valor ajuste', value: formatCurrency(data.adjustmentValue) }
  ]

  const renderInto = (doc: jsPDF, dryRun: boolean): number => {
    let y = 6

    // Logo centrado manteniendo proporción exacta
    if (logo && logo.width > 0 && logo.height > 0) {
      const maxLogoW = 28
      const maxLogoH = 16
      const ratio = Math.min(maxLogoW / logo.width, maxLogoH / logo.height)
      const drawW = logo.width * ratio
      const drawH = logo.height * ratio
      if (!dryRun) {
        doc.addImage(logo.dataUrl, 'PNG', (pageWidth - drawW) / 2, y, drawW, drawH)
      }
      y += drawH + 3
    }

    // Cabecera
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    if (!dryRun) {
      doc.setTextColor(8, 28, 45)
      doc.text('AHORRO LUXURY', pageWidth / 2, y, { align: 'center' })
    }
    y += 4.8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const subtitle =
      data.receiptType === 'loan' ? 'Comprobante de Préstamo' : 'Comprobante de Abono a Préstamo'
    if (!dryRun) {
      doc.setTextColor(74, 85, 104)
      doc.text(subtitle, pageWidth / 2, y, { align: 'center' })
    }
    y += 4

    const drawDivider = () => {
      if (!dryRun) {
        doc.setDrawColor(140, 152, 168)
        doc.setLineWidth(0.25)
        doc.setLineDashPattern([1.2, 1.2], 0)
        doc.line(marginX, y, pageWidth - marginX, y)
        doc.setLineDashPattern([], 0)
      }
      y += 4
    }

    const drawRow = (row: RowEntry) => {
      const fontSize = row.boldRow ? 9 : 8.5
      const lineHeight = 3.8

      doc.setFont('helvetica', row.boldRow ? 'bold' : 'normal')
      doc.setFontSize(fontSize)
      const labelLines = doc.splitTextToSize(row.label, labelMaxWidth) as string[]

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(fontSize)
      const valueLines = doc.splitTextToSize(row.value || '-', valueMaxWidth) as string[]

      const maxLines = Math.max(labelLines.length, valueLines.length)

      if (!dryRun) {
        doc.setFont('helvetica', row.boldRow ? 'bold' : 'normal')
        doc.setTextColor(row.boldRow ? 8 : 55, row.boldRow ? 28 : 65, row.boldRow ? 45 : 81)
        labelLines.forEach((line, idx) => {
          doc.text(line, marginX, y + idx * lineHeight)
        })

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(17, 24, 39)
        valueLines.forEach((line, idx) => {
          doc.text(line, pageWidth - marginX, y + idx * lineHeight, { align: 'right' })
        })
      }

      y += maxLines * lineHeight + 1.3
    }

    drawDivider()
    section1.forEach(drawRow)

    drawDivider()
    section2.forEach(drawRow)

    drawDivider()
    section3.forEach((row, idx) => {
      if (row.label === 'Total abonos' && idx > 0) {
        if (!dryRun) {
          doc.setDrawColor(203, 213, 224)
          doc.setLineWidth(0.2)
          doc.line(marginX, y - 1, pageWidth - marginX, y - 1)
        }
        y += 1.5
      }
      drawRow(row)
    })

    drawDivider()

    // Descripción
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    if (!dryRun) {
      doc.setTextColor(8, 28, 45)
      doc.text('Descripción', marginX, y)
    }
    y += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.2)
    const descLines = doc.splitTextToSize(data.description?.trim() || '-', contentWidth) as string[]
    if (!dryRun) {
      doc.setTextColor(55, 65, 81)
      descLines.forEach((line, idx) => {
        doc.text(line, marginX, y + idx * 3.8)
      })
    }
    y += descLines.length * 3.8 + 3.5

    drawDivider()

    // Pie de página
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.2)
    const regLines = doc.splitTextToSize(`Registrado por: ${data.registeredBy || '-'}`, contentWidth) as string[]
    if (!dryRun) {
      doc.setTextColor(31, 41, 55)
      regLines.forEach((line, idx) => {
        doc.text(line, pageWidth / 2, y + idx * 3.8, { align: 'center' })
      })
    }
    y += regLines.length * 3.8 + 2

    doc.setFontSize(7.4)
    if (!dryRun) {
      doc.setTextColor(100, 116, 139)
      doc.text('Conserve este comprobante para sus registros.', pageWidth / 2, y, { align: 'center' })
    }
    y += 6

    return Math.max(90, Math.ceil(y))
  }

  // Primera pasada para medir altura exacta en 1 sola página
  const measureDoc = new jsPDF({ unit: 'mm', format: [pageWidth, 250], orientation: 'portrait' })
  const exactHeight = renderInto(measureDoc, true)

  // Segunda pasada con la altura definitiva exacta
  const finalDoc = new jsPDF({ unit: 'mm', format: [pageWidth, exactHeight], orientation: 'portrait' })
  renderInto(finalDoc, false)

  return finalDoc
}

const createPDF = async (): Promise<File> => {
  if (!props.receiptData) throw new Error('No hay datos para generar el comprobante.')

  const data = props.receiptData
  const logo = await loadLogoImage()
  const doc = buildReceiptDocument(data, logo)

  const personName = sanitizeFilename(data.partnerName) || 'Socio'
  const loanTag = sanitizeFilename(data.loanId || data.id) || String(Date.now())
  const receiptTag = sanitizeFilename(data.id) || loanTag
  const filename =
    data.receiptType === 'loan'
      ? `Prestamo_${personName}_ID${loanTag}.pdf`
      : `Abono_Prestamo_${loanTag}_${personName}_Rec${receiptTag}.pdf`

  const blob = doc.output('blob')
  return new File([blob], filename, { type: 'application/pdf' })
}

const downloadPDF = async (): Promise<void> => {
  const file = await createPDF()
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

defineExpose({ downloadPDF })
</script>

<template>
  <span style="display: none" aria-hidden="true"></span>
</template>
