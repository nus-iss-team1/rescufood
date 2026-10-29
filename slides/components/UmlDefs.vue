<script setup lang="ts">
defineProps<{ p: string }>()
</script>

<template>
  <defs>
    <marker :id="`${p}-arr`" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45" />
    </marker>
    <marker :id="`${p}-arrm`" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a" />
    </marker>
    <marker :id="`${p}-open`" viewBox="0 0 9 9" refX="8" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0.5 0.5 L8 4.5 L0.5 8.5" fill="none" stroke="#8a8a8a" stroke-width="1.3" />
    </marker>
    <marker :id="`${p}-openg`" viewBox="0 0 9 9" refX="8" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0.5 0.5 L8 4.5 L0.5 8.5" fill="none" stroke="#1f6b45" stroke-width="1.3" />
    </marker>
    <marker :id="`${p}-tri`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
      <path d="M0.5 0.5 L9.5 5 L0.5 9.5 Z" fill="#ffffff" stroke="#1f6b45" />
    </marker>
    <marker :id="`${p}-dia`" viewBox="0 0 12 8" refX="11" refY="4" markerWidth="12" markerHeight="8" orient="auto-start-reverse">
      <path d="M0 4 L6 0 L12 4 L6 8 Z" fill="#1f6b45" />
    </marker>
  </defs>
</template>
