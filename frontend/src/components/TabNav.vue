<template>
  <div class="bg-white border-b border-gray-200">
    <div class="max-w-6xl mx-auto px-4">
      <nav class="flex gap-1 overflow-x-auto" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="$emit('select', tab.id)"
          :class="[
            'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
            active === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
defineProps({ tabs: Array, active: String });
defineEmits(['select']);
</script>
