<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">Vision</h2>
      <p class="text-sm text-gray-500 mt-1">Analyze an image or whiteboard photo with a natural-language prompt.</p>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <!-- Mode toggle -->
      <div class="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
        <button
          v-for="m in ['upload', 'url']"
          :key="m"
          @click="mode = m"
          :class="[
            'px-4 py-2 text-sm font-medium capitalize',
            mode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50',
          ]"
        >
          {{ m === 'upload' ? 'Upload File' : 'Paste URL' }}
        </button>
      </div>

      <!-- File upload -->
      <div v-if="mode === 'upload'">
        <div
          class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
          @click="fileInput.click()"
          @dragover.prevent
          @drop.prevent="e => onDrop(e)"
        >
          <p class="text-sm text-gray-500">Drop an image here or <span class="text-blue-600 font-medium">click to browse</span></p>
        </div>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
      </div>

      <!-- URL input -->
      <div v-else>
        <input
          v-model="imageUrl"
          type="url"
          placeholder="https://example.com/image.png"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Preview -->
      <div v-if="previewSrc" class="rounded-lg overflow-hidden border border-gray-200">
        <img :src="previewSrc" alt="Preview" class="w-full max-h-64 object-contain bg-gray-100" />
      </div>

      <!-- Prompt -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
        <textarea
          v-model="prompt"
          rows="2"
          placeholder="What do you see in this image?"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        @click="analyze"
        :disabled="loading || (!imageFile && !imageUrl.trim())"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Analyze
      </button>

      <div v-if="loading"><LoadingSpinner label="Analyzing image…" /></div>
      <div v-if="error"><ErrorAlert :message="error" /></div>

      <div v-if="result" class="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">
        {{ result }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { analyzeVision } from '../api.js';
import ErrorAlert from '../components/ErrorAlert.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const mode = ref('upload');
const fileInput = ref(null);
const imageFile = ref(null);
const imageUrl = ref('');
const previewSrc = ref('');
const prompt = ref('');
const loading = ref(false);
const error = ref('');
const result = ref('');

function onFileChange(e) {
  setFile(e.target.files[0]);
}
function onDrop(e) {
  setFile(e.dataTransfer.files[0]);
}
function setFile(file) {
  if (!file) return;
  imageFile.value = file;
  previewSrc.value = URL.createObjectURL(file);
}

async function analyze() {
  error.value = '';
  result.value = '';
  loading.value = true;
  try {
    const url = mode.value === 'url' ? imageUrl.value.trim() : null;
    const data = await analyzeVision(imageFile.value, url, prompt.value || undefined);
    result.value = data.output_text ?? JSON.stringify(data);
    if (url) previewSrc.value = url;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
