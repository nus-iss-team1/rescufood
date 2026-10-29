<script setup lang="ts">
defineProps<{ x: number; y: number; label: string; sub?: string }>()
</script>

<template>
  <g :transform="`translate(${x},${y})`">
    <g stroke="#1f6b45" stroke-width="1.7" stroke-linecap="round" fill="none">
      <circle cx="0" cy="-26" r="8" fill="#ffffff" />
      <line x1="0" y1="-18" x2="0" y2="5" />
      <line x1="-13" y1="-9" x2="13" y2="-9" />
      <line x1="0" y1="5" x2="-11" y2="23" />
      <line x1="0" y1="5" x2="11" y2="23" />
    </g>
    <text x="0" y="39" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">{{ label }}</text>
    <text v-if="sub" x="0" y="52" text-anchor="middle" style="font-size:9px" fill="#5a5a5a">{{ sub }}</text>
  </g>
</template>
