<script setup lang="ts">
import { watchEffect } from 'vue'

export interface SeoHeadProps {
  view: 'home' | 'login' | 'dashboard'
  section?: string
}

const props = defineProps<SeoHeadProps>()

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://ahorro-luxury-web-one.vercel.app').replace(/\/+$/, '')
const DEFAULT_IMAGE = `${SITE_URL}/img/logo-luxury.png`

const sectionTitles: Record<string, string> = {
  resumen: 'Dashboard Financiero',
  usuarios: 'Gestión de Socios y Usuarios',
  ahorro: 'Ahorro Programado',
  prestamos: 'Préstamos y Respaldos',
  egresos: 'Control de Egresos',
  pagos: 'Control de Pagos y Multas',
  rifa1: 'Rifa Mensual 1',
  rifa2: 'Rifa Mensual 2'
}

const upsertMeta = (attr: 'name' | 'property', key: string, content: string): void => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

const upsertCanonical = (href: string): void => {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

watchEffect(() => {
  let title = 'Ahorro Luxury | Ahorro Programado Inteligente, Rentabilidad y Rifa Anual'
  let description =
    'Ahorro Luxury: sistema de ahorro programado semanal o quincenal con rentabilidad mínima garantizada del 20%, respaldo en activos reales, préstamos a socios y rifa mensual.'
  let robots = 'index, follow, max-image-preview:large, max-snippet:-1'
  const canonicalUrl = `${SITE_URL}/`

  if (props.view === 'login') {
    title = 'Iniciar Sesión | Ahorro Luxury'
    description = 'Acceso privado para socios, coordinadores y administradores de Ahorro Luxury.'
    robots = 'noindex, nofollow'
  } else if (props.view === 'dashboard') {
    const secName = (props.section && sectionTitles[props.section]) || 'Panel de Gestión'
    title = `${secName} | Ahorro Luxury`
    description = 'Panel privado de administración de ahorros, préstamos, pagos y rifas de Ahorro Luxury.'
    robots = 'noindex, nofollow'
  }

  document.documentElement.lang = 'es-CO'
  document.title = title

  upsertMeta('name', 'description', description)
  upsertMeta('name', 'robots', robots)
  upsertCanonical(canonicalUrl)

  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:url', canonicalUrl)
  upsertMeta('property', 'og:image', DEFAULT_IMAGE)

  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', description)
  upsertMeta('name', 'twitter:image', DEFAULT_IMAGE)
})
</script>

<template>
  <!-- Componente de metadatos SEO dinámicos (gestiona document.head) -->
</template>
