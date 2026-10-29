<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  x: number
  y: number
  w?: number
  name: string
  stereotype?: string
  note?: string
  attrs?: string[]
  ops?: string[]
  accent?: boolean
  muted?: boolean
}>()

const ROW = 15

const W = computed(() => props.w ?? 230)
const headH = computed(() => (props.stereotype ? 42 : 30) + (props.note ? 14 : 0))
const attrsH = computed(() => (props.attrs?.length ? props.attrs.length * ROW + 8 : 0))
const opsH = computed(() => (props.ops?.length ? props.ops.length * ROW + 8 : 0))
const h = computed(() => headH.value + attrsH.value + opsH.value)

const stroke = computed(() => (props.accent ? '#1f6b45' : '#0000002e'))
const headFill = computed(() =>
  props.accent ? 'rgba(31,107,69,0.11)' : props.muted ? '#f1efec' : 'rgba(0,0,0,0.045)',
)
const bodyFill = computed(() => (props.muted ? '#faf9f7' : '#ffffff'))
const headPath = computed(() => {
  const { x, y } = props
  const w = W.value
  const b = y + headH.value
  return `M${x} ${b} L${x} ${y + 6} A6 6 0 0 1 ${x + 6} ${y} L${x + w - 6} ${y} A6 6 0 0 1 ${x + w} ${y + 6} L${x + w} ${b} Z`
})
</script>

<template>
  <g>
    <rect
      :x="x" :y="y" :width="W" :height="h" rx="6"
      :fill="bodyFill" :stroke="stroke" stroke-width="1.2"
    />
    <path :d="headPath" :fill="headFill" :stroke="stroke" stroke-width="1.2" />
    <text
      v-if="stereotype" :x="x + W / 2" :y="y + 16" text-anchor="middle"
      style="font-size:9.5px;font-weight:500" fill="#1f6b45"
    >&#171;{{ stereotype }}&#187;</text>
    <text
      :x="x + W / 2" :y="stereotype ? y + 33 : y + 20" text-anchor="middle"
      style="font-size:13px;font-weight:700" fill="#111111"
    >{{ name }}</text>
    <text
      v-if="note" :x="x + W / 2" :y="y + headH - 7" text-anchor="middle"
      style="font-size:9px" fill="#5a5a5a"
    >{{ note }}</text>
    <text
      v-for="(a, i) in attrs || []" :key="`a${i}`"
      :x="x + 10" :y="y + headH + 15 + i * ROW"
      style="font-size:10.5px" fill="#333333"
    >{{ a }}</text>
    <line
      v-if="attrs?.length && ops?.length"
      :x1="x" :y1="y + headH + attrsH" :x2="x + W" :y2="y + headH + attrsH"
      :stroke="stroke" stroke-width="1.2"
    />
    <text
      v-for="(o, i) in ops || []" :key="`o${i}`"
      :x="x + 10" :y="y + headH + attrsH + 15 + i * ROW"
      style="font-size:10.5px" fill="#333333"
    >{{ o }}</text>
  </g>
</template>
