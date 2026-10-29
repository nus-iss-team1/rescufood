<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  x: number
  y: number
  w: number
  lines: string[]
  title?: string
}>()

const FOLD = 12
const h = computed(() => (props.title ? 20 : 6) + props.lines.length * 14 + 12)
const outline = computed(() => {
  const { x, y, w } = props
  return `M${x} ${y} H${x + w - FOLD} L${x + w} ${y + FOLD} V${y + h.value} H${x} Z`
})
const fold = computed(() => {
  const { x, y, w } = props
  return `M${x + w - FOLD} ${y} V${y + FOLD} H${x + w}`
})
</script>

<template>
  <g>
    <path :d="outline" fill="#fffdf7" stroke="#00000033" stroke-width="1.1" />
    <path :d="fold" fill="none" stroke="#00000033" stroke-width="1.1" />
    <text v-if="title" :x="x + 11" :y="y + 17" style="font-size:10px;font-weight:700" fill="#1f6b45">{{ title }}</text>
    <text
      v-for="(l, i) in lines" :key="i"
      :x="x + 11" :y="y + (title ? 34 : 19) + i * 14"
      style="font-size:10px" fill="#333333"
    >{{ l }}</text>
  </g>
</template>
