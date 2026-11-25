<script setup lang="ts">
import { jsPDF } from 'jspdf'

export interface TicketItem {
  concept: string
  amount: number
  method: string
}

export interface TicketData {
  id: string
  loanId?: string | null
  date: string
  partnerName: string
  documentId: string
  totalAmount: number
  registeredBy: string
  items: TicketItem[]
}

const props = defineProps<{
  ticketData: TicketData | null
}>()

const sanitizeFilename = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim()
    .replace(/\s+/g, '_')

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(val) || 0)

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

const buildTicketDocument = (data: TicketData, logo: LoadedLogo | null): jsPDF => {
  const pageWidth = 80
  const marginX = 5
  const contentWidth = pageWidth - marginX * 2
  const labelWidth = 25
  const valueWidth = contentWidth - labelWidth - 2

  const renderInto = (doc: jsPDF, dryRun: boolean): number => {
    let y = 6

    // Logo centrado con proporción original
    if (logo && logo.width > 0 && logo.height > 0) {
      const maxLogoW = 24
      const maxLogoH = 15
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
    y += 4.6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.2)
    if (!dryRun) {
      doc.setTextColor(74, 85, 104)
      doc.text('Comprobante de Ingreso', pageWidth / 2, y, { align: 'center' })
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

    const drawMetaRow = (label: string, value: string, highlight = false) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      const valLines = doc.splitTextToSize(value || '-', valueWidth) as string[]
      if (!dryRun) {
        doc.setFont('helvetica', highlight ? 'bold' : 'normal')
        doc.setTextColor(highlight ? 8 : 55, highlight ? 28 : 65, highlight ? 45 : 81)
        doc.text(label, marginX, y)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(17, 24, 39)
        valLines.forEach((line, idx) => {
          doc.text(line, pageWidth - marginX, y + idx * 3.8, { align: 'right' })
        })
      }
      y += valLines.length * 3.8 + 1.3
    }

    drawDivider()

    drawMetaRow('Nro Recibo', `#${data.id}`)
    if (data.loanId) {
      drawMetaRow('ID Préstamo', `#${data.loanId}`, true)
    }
    drawMetaRow('Fecha', data.date)
    drawMetaRow('Socio', data.partnerName)
    drawMetaRow('Documento', data.documentId)

    drawDivider()

    // Detalle de conceptos pagados
    const conceptMaxWidth = 44
    for (const item of data.items) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      const conceptLines = doc.splitTextToSize(item.concept, conceptMaxWidth) as string[]
      const amountStr = formatCurrency(Number(item.amount))

      if (!dryRun) {
        doc.setTextColor(17, 24, 39)
        conceptLines.forEach((line, idx) => {
          doc.text(line, marginX, y + idx * 3.8)
        })
        doc.text(amountStr, pageWidth - marginX, y, { align: 'right' })
      }
      y += conceptLines.length * 3.8 + 0.8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      if (!dryRun) {
        doc.setTextColor(100, 116, 139)
        doc.text(`Medio: ${String(item.method || '').toUpperCase()}`, marginX, y)
      }
      y += 4.2
    }

    drawDivider()

    // Total Pagado
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    if (!dryRun) {
      doc.setTextColor(8, 28, 45)
      doc.text('TOTAL PAGADO:', marginX, y)
      doc.setTextColor(31, 122, 99)
      doc.text(formatCurrency(Number(data.totalAmount)), pageWidth - marginX, y, { align: 'right' })
    }
    y += 4.5

    drawDivider()

    // Pie de página
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.2)
    const regLines = doc.splitTextToSize(`Atendido por: ${data.registeredBy || '-'}`, contentWidth) as string[]
    if (!dryRun) {
      doc.setTextColor(31, 41, 55)
      regLines.forEach((line, idx) => {
        doc.text(line, pageWidth / 2, y + idx * 3.8, { align: 'center' })
      })
    }
    y += regLines.length * 3.8 + 2

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    if (!dryRun) {
      doc.setTextColor(8, 28, 45)
      doc.text('¡Gracias por su puntualidad!', pageWidth / 2, y, { align: 'center' })
    }
    y += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    if (!dryRun) {
      doc.setTextColor(100, 116, 139)
      doc.text('Este documento es un soporte válido de Ahorro Luxury.', pageWidth / 2, y, { align: 'center' })
    }
    y += 6

    return Math.max(85, Math.ceil(y))
  }

  const measureDoc = new jsPDF({ unit: 'mm', format: [pageWidth, 250], orientation: 'portrait' })
  const exactHeight = renderInto(measureDoc, true)

  const finalDoc = new jsPDF({ unit: 'mm', format: [pageWidth, exactHeight], orientation: 'portrait' })
  renderInto(finalDoc, false)

  return finalDoc
}

const createPDF = async (): Promise<File> => {
  if (!props.ticketData) throw new Error('No hay datos para generar el recibo.')

  const data = props.ticketData
  const logo = await loadLogoImage()
  const doc = buildTicketDocument(data, logo)

  const personName = sanitizeFilename(data.partnerName) || 'Socio'
  const receiptId = sanitizeFilename(data.id) || String(Date.now())
  const filename = data.loanId
    ? `Abono_Prestamo_${sanitizeFilename(data.loanId)}_${personName}_${receiptId}.pdf`
    : `Abono_${personName}_${receiptId}.pdf`

  const blob = doc.output('blob')
  return new File([blob], filename, { type: 'application/pdf' })
}

const downloadPDF = async (): Promise<void> => {
  const file = await createPDF()
  const downloadUrl = URL.createObjectURL(file)
  const downloadLink = document.createElement('a')
  downloadLink.href = downloadUrl
  downloadLink.download = file.name
  downloadLink.click()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
}

defineExpose({ downloadPDF })
</script>

<template>
  <span style="display: none" aria-hidden="true"></span>
</template>
