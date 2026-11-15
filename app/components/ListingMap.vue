<script setup lang="ts">
import type { Listing } from '#shared/types/listing'

const props = withDefaults(defineProps<{
  listings?: Listing[]
  center?: [number, number]
  zoom?: number
  pickable?: boolean
  modelValue?: { lat: number, lng: number } | null
}>(), {
  listings: () => [],
  center: () => TRICITY_CENTER,
  zoom: 12,
  pickable: false,
  modelValue: null
})

const emit = defineEmits<{ 'update:modelValue': [value: { lat: number, lng: number }] }>()

const el = ref<HTMLElement | null>(null)
const error = ref('')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let layer: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pin: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any = null

function priceIcon(rent: number) {
  const label = rent >= 100000 ? `${(rent / 100000).toFixed(1)}L` : `${Math.round(rent / 1000)}k`
  // Zero-size anchor at the point; the label sizes itself to its text and is centred on it
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    html: `<div style="width:max-content;background:#ea580c;color:#fff;font:600 12px system-ui;padding:3px 8px;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.3);white-space:nowrap;transform:translate(-50%,-50%)">₹${label}</div>`
  })
}

function drawListings() {
  if (!map || !L) return
  if (layer) layer.remove()
  layer = L.layerGroup().addTo(map)
  const pts: [number, number][] = []
  for (const l of props.listings) {
    pts.push([l.lat, l.lng])
    L.marker([l.lat, l.lng], { icon: priceIcon(l.rent) })
      .bindPopup(`<a href="/property/${l.id}" style="font-weight:600">${escapeHtml(l.title)}</a><br>${escapeHtml(l.locality)} · ₹${l.rent.toLocaleString('en-IN')}/mo`)
      .addTo(layer)
  }
  if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 })
  else if (pts.length === 1) map.setView(pts[0], 15)
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c] as string))
}

function setPin(lat: number, lng: number) {
  if (!map || !L) return
  if (pin) pin.setLatLng([lat, lng])
  else {
    pin = L.marker([lat, lng], { draggable: true }).addTo(map)
    pin.on('dragend', () => {
      const p = pin.getLatLng()
      emit('update:modelValue', { lat: p.lat, lng: p.lng })
    })
  }
}

onMounted(async () => {
  try {
    L = await loadLeaflet()
    if (!el.value) return
    const start = props.modelValue ? [props.modelValue.lat, props.modelValue.lng] : props.center
    map = L.map(el.value, { scrollWheelZoom: !props.pickable }).setView(start, props.modelValue ? 16 : props.zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)
    if (props.pickable) {
      if (props.modelValue) setPin(props.modelValue.lat, props.modelValue.lng)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('click', (e: any) => {
        setPin(e.latlng.lat, e.latlng.lng)
        emit('update:modelValue', { lat: e.latlng.lat, lng: e.latlng.lng })
      })
    } else {
      drawListings()
    }
  } catch (e) {
    error.value = (e as Error).message
  }
})

watch(() => props.listings, drawListings)
watch(() => props.modelValue, (v) => {
  if (v && props.pickable) {
    setPin(v.lat, v.lng)
    map?.setView([v.lat, v.lng], Math.max(map.getZoom(), 15))
  }
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="relative size-full overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-800">
    <div ref="el" class="size-full" />
    <p v-if="error" class="absolute inset-0 grid place-items-center p-4 text-center text-sm text-stone-500">
      {{ error }}
    </p>
  </div>
</template>
