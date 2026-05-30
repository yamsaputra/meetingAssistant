<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">Image Generation</h2>
      <p class="text-sm text-gray-500 mt-1">Generate images using DALL-E via the Responses API image_generation tool.</p>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
        <textarea
          v-model="prompt"
          rows="3"
          placeholder="e.g. Cartoon mascot for our project team, friendly, with a laptop."
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Size</label>
          <select
            v-model="size"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1024x1024">1024 × 1024 (square)</option>
            <option value="1792x1024">1792 × 1024 (landscape)</option>
            <option value="1024x1792">1024 × 1792 (portrait)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Quality</label>
          <select
            v-model="quality"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <button
        @click="generate"
        :disabled="loading || !prompt.trim()"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Generate
      </button>

      <div v-if="loading"><LoadingSpinner label="Generating image…" /></div>
      <div v-if="error"><ErrorAlert :message="error" /></div>
    </div>

    <div v-if="result" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <img
        :src="`data:image/png;base64,${result.image_base64}`"
        alt="Generated image"
        class="w-full"
      />
      <div v-if="result.revised_prompt" class="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <p class="text-xs text-gray-500"><span class="font-medium">Revised prompt:</span> {{ result.revised_prompt }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { generateImage } from '../api.js';
import ErrorAlert from '../components/ErrorAlert.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const prompt = ref('');
const size = ref('1024x1024');
const quality = ref('high');
const loading = ref(false);
const error = ref('');
const result = ref(null);

async function generate() {
  error.value = '';
  result.value = null;
  loading.value = true;
  try {
    result.value = await generateImage(prompt.value.trim(), size.value, quality.value);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
