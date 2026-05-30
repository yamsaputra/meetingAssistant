<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">Code Interpreter</h2>
      <p class="text-sm text-gray-500 mt-1">Run Python in a sandboxed container. Attach files uploaded in the Files tab.</p>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
        <textarea
          v-model="prompt"
          rows="4"
          placeholder="e.g. Who is overloaded? Create a bar chart of team capacity."
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Files from the Files tab (via Pinia) -->
      <div v-if="filesStore.uploadedFiles.length">
        <label class="block text-sm font-medium text-gray-700 mb-2">Attach uploaded files</label>
        <div class="space-y-1">
          <label
            v-for="f in filesStore.uploadedFiles"
            :key="f.file_id"
            class="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50"
          >
            <input type="checkbox" :value="f.file_id" v-model="selectedFileIds" class="accent-blue-600" />
            <div class="min-w-0">
              <span class="text-sm font-medium text-gray-800 truncate block">{{ f.filename }}</span>
              <span class="text-xs text-gray-400 font-mono">{{ f.file_id }}</span>
            </div>
          </label>
        </div>
      </div>
      <p v-else class="text-xs text-gray-400 italic">
        No files uploaded yet. Go to the <strong>Files & Search</strong> tab to upload a file first.
      </p>

      <button
        @click="run"
        :disabled="loading || !prompt.trim()"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Run
      </button>

      <div v-if="loading"><LoadingSpinner label="Running code interpreter…" /></div>
      <div v-if="error"><ErrorAlert :message="error" /></div>
    </div>

    <div v-if="result" class="space-y-4">
      <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Output</p>
        <p class="text-sm text-gray-800 whitespace-pre-wrap">{{ result.output_text }}</p>
      </div>

      <div v-if="result.generated_files?.length" class="space-y-3">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Generated Files</p>
        <div v-for="(file, i) in result.generated_files" :key="i" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span class="text-xs font-mono text-gray-500">{{ file.mime_type ?? 'file' }}</span>
          </div>
          <div class="p-4">
            <img
              v-if="file.mime_type?.startsWith('image/')"
              :src="`data:${file.mime_type};base64,${file.data}`"
              alt="Generated output"
              class="max-w-full rounded"
            />
            <pre v-else class="text-xs text-gray-700 overflow-x-auto">{{ file.data }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { runCode } from '../api.js';
import { useFilesStore } from '../stores/filesStore.js';
import ErrorAlert from '../components/ErrorAlert.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const filesStore = useFilesStore();
const prompt = ref('');
const selectedFileIds = ref([]);
const loading = ref(false);
const error = ref('');
const result = ref(null);

async function run() {
  error.value = '';
  result.value = null;
  loading.value = true;
  try {
    result.value = await runCode(prompt.value.trim(), selectedFileIds.value);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
