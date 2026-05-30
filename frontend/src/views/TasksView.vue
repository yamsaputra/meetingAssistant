<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">Task Extraction</h2>
      <p class="text-sm text-gray-500 mt-1">Paste meeting notes and extract structured tasks with priority, assignee, and due date.</p>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <label class="block text-sm font-medium text-gray-700">Meeting Notes</label>
      <textarea
        v-model="input"
        rows="8"
        placeholder="Paste your meeting protocol or notes here…"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
      />
      <button
        @click="extract"
        :disabled="loading || !input.trim()"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Extract Tasks
      </button>

      <div v-if="loading"><LoadingSpinner label="Extracting tasks…" /></div>
      <div v-if="error"><ErrorAlert :message="error" /></div>
    </div>

    <div v-if="tasks.length" class="space-y-3">
      <p class="text-sm font-medium text-gray-600">{{ tasks.length }} task{{ tasks.length !== 1 ? 's' : '' }} found</p>
      <div
        v-for="(task, i) in tasks"
        :key="i"
        class="bg-white rounded-xl border border-gray-200 p-5 space-y-2"
      >
        <div class="flex items-start justify-between gap-3">
          <h4 class="font-semibold text-gray-900 text-sm">{{ task.title }}</h4>
          <span :class="['px-2 py-0.5 rounded-full text-xs font-medium shrink-0', priorityClass(task.priority)]">
            {{ task.priority }}
          </span>
        </div>
        <p class="text-sm text-gray-600">{{ task.description }}</p>
        <div class="flex gap-4 text-xs text-gray-500 pt-1">
          <span v-if="task.assignee">
            <span class="font-medium">Assignee:</span> {{ task.assignee }}
          </span>
          <span v-if="task.due_date">
            <span class="font-medium">Due:</span> {{ task.due_date }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { extractTasks } from '../api.js';
import ErrorAlert from '../components/ErrorAlert.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const input = ref('');
const loading = ref(false);
const error = ref('');
const tasks = ref([]);

const priorityClass = (p) => ({
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}[p] ?? 'bg-gray-100 text-gray-600');

async function extract() {
  error.value = '';
  tasks.value = [];
  loading.value = true;
  try {
    const data = await extractTasks(input.value.trim());
    tasks.value = data.tasks ?? [];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
