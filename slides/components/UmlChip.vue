<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  x: number
  y: number
  w: number
  h?: number
  label: string
  sub?: string
  accent?: boolean
}>()

const H = computed(() => props.h ?? 34)
const labelY = computed(() =>
  props.sub ? props.y + H.value / 2 - 1 : props.y + H.value / 2 + 4,
)
</script>

<template>
  <g>
    <rect
      :x="x" :y="y" :width="w" :height="H" rx="5"
      :fill="accent ? 'rgba(31,107,69,0.08)' : '#ffffff'"
      :stroke="accent ? '#1f6b45' : '#0000002e'" stroke-width="1.1"
    />
    <text :x="x + w / 2" :y="labelY" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">{{ label }}</text>
    <text v-if="sub" :x="x + w / 2" :y="y + H / 2 + 12" text-anchor="middle" style="font-size:9px" fill="#5a5a5a">{{ sub }}</text>
  </g>
</template>
