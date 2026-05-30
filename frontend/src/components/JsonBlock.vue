<template>
  <pre class="bg-gray-900 text-green-300 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words">{{ formatted }}</pre>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ data: [Object, Array, String] });
const formatted = computed(() =>
  typeof props.data === 'string' ? props.data : JSON.stringify(props.data, null, 2)
);
</script>
