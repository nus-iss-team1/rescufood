<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  x: number
  y: number
  w: number
  h: number
  label: string
  tabW?: number
  dashed?: boolean
  tone?: string
}>()

const tw = computed(() => props.tabW ?? Math.max(96, props.label.length * 6.6 + 26))
const outline = computed(() => {
  const { x, y, w, h } = props
  return `M${x} ${y} H${x + tw.value} V${y + 18} H${x + w} V${y + h} H${x} Z`
})
</script>

<template>
  <g>
    <path
      :d="outline"
      :fill="tone ?? 'rgba(0,0,0,0.028)'"
      stroke="#00000033" stroke-width="1.2"
      :stroke-dasharray="dashed ? '5 4' : undefined"
    />
    <text :x="x + 12" :y="y + 13" style="font-size:10.5px;font-weight:700" fill="#1f6b45">{{ label }}</text>
  </g>
</template>
