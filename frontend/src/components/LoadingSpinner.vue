<template>
  <div class="flex items-center gap-2 text-sm text-gray-500">
    <svg class="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <span>{{ label ?? 'Loading…' }}</span>
  </div>
</template>

<script setup>
defineProps({ label: String });
</script>
