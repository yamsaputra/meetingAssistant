<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">Function Calling</h2>
      <p class="text-sm text-gray-500 mt-1">The model decides which tools to call (Jira, Slack) based on your instruction.</p>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <label class="block text-sm font-medium text-gray-700">Instruction</label>
      <textarea
        v-model="input"
        rows="4"
        placeholder="e.g. Create Jira tickets for all open tasks from the meeting and notify the team on Slack."
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        @click="run"
        :disabled="loading || !input.trim()"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Run
      </button>

      <div v-if="loading"><LoadingSpinner label="Running agent loop…" /></div>
      <div v-if="error"><ErrorAlert :message="error" /></div>
    </div>

    <div v-if="result" class="space-y-5">
      <!-- Text output -->
      <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Model Response</p>
        <p class="text-sm text-gray-800 whitespace-pre-wrap">{{ result.output_text }}</p>
      </div>

      <!-- Executed calls -->
      <div v-if="result.executed_calls?.length" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Executed Tool Calls ({{ result.executed_calls.length }})
          </p>
        </div>
        <div class="divide-y divide-gray-100">
          <div v-for="(call, i) in result.executed_calls" :key="i" class="px-5 py-4 space-y-2">
            <div class="flex items-center gap-2">
              <span class="inline-block bg-purple-100 text-purple-700 text-xs font-mono px-2 py-0.5 rounded">
                {{ call.name }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <p class="text-xs text-gray-400 mb-1">Arguments</p>
                <JsonBlock :data="call.arguments" />
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-1">Result</p>
                <JsonBlock :data="call.result" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { runFunctions } from '../api.js';
import ErrorAlert from '../components/ErrorAlert.vue';
import JsonBlock from '../components/JsonBlock.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const input = ref('');
const loading = ref(false);
const error = ref('');
const result = ref(null);

async function run() {
  error.value = '';
  result.value = null;
  loading.value = true;
  try {
    result.value = await runFunctions(input.value.trim());
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
