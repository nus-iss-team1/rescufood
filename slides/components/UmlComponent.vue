<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  x: number
  y: number
  w: number
  h: number
  name: string
  stereotype?: string
  lines?: string[]
  accent?: boolean
  muted?: boolean
}>()

const stroke = computed(() => (props.accent ? '#1f6b45' : '#0000002e'))
const fill = computed(() =>
  props.accent ? 'rgba(31,107,69,0.07)' : props.muted ? '#f3f1ee' : '#ffffff',
)
const st = computed(() => props.stereotype ?? 'component')
const blockTop = computed(() => {
  const total = 12 + 17 + (props.lines?.length ?? 0) * 13
  return props.y + (props.h - total) / 2
})
const stereoY = computed(() => blockTop.value + 9)
const nameY = computed(() => blockTop.value + 25)
</script>

<template>
  <g>
    <rect :x="x" :y="y" :width="w" :height="h" rx="6" :fill="fill" :stroke="stroke" stroke-width="1.2" />
    <g :transform="`translate(${x + w - 28},${y + 9})`" :stroke="stroke" stroke-width="1.2" fill="none">
      <rect x="4" y="0" width="14" height="16" />
      <rect x="0" y="3" width="7" height="4.5" fill="#ffffff" />
      <rect x="0" y="9.5" width="7" height="4.5" fill="#ffffff" />
    </g>
    <text :x="x + w / 2" :y="stereoY" text-anchor="middle" style="font-size:9.5px;font-weight:500" fill="#1f6b45">&#171;{{ st }}&#187;</text>
    <text :x="x + w / 2" :y="nameY" text-anchor="middle" style="font-size:13.5px;font-weight:700" fill="#111111">{{ name }}</text>
    <text
      v-for="(l, i) in lines || []" :key="i"
      :x="x + w / 2" :y="nameY + 15 + i * 13" text-anchor="middle"
      style="font-size:10px" fill="#5a5a5a"
    >{{ l }}</text>
  </g>
</template>
