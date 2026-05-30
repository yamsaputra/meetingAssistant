<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">Files & Search</h2>
      <p class="text-sm text-gray-500 mt-1">Upload documents to the vector store, then search them with citations.</p>
    </div>

    <!-- Limits info banner -->
    <div v-if="showLimitsBanner" class="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
      <svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <div class="flex-1 space-y-2 text-sm">
        <p class="font-semibold text-amber-800">Search context limit — ~5–10 pages per query</p>
        <p class="text-amber-700">
          Each search retrieves <strong>5 chunks</strong> from your document.
          One chunk ≈ 800 tokens ≈ 600 words ≈ <strong>1–2 pages</strong>.
          That means only the 5 most relevant pages are used to answer each question.
        </p>
        <p class="text-amber-700">
          <strong>For long papers:</strong> ask focused questions ("What methodology was used?")
          rather than broad ones ("Summarize everything") to get better results.
          For a full summary, split a long paper into sections and query each separately.
        </p>
        <div class="pt-1 border-t border-amber-200 text-amber-600 text-xs flex flex-wrap gap-x-4 gap-y-1">
          <span><strong>Max file size:</strong> 512 MB</span>
          <span><strong>Max tokens per file:</strong> 5 000 000 (~3 800 pages)</span>
          <span><strong>Supported formats:</strong> PDF, TXT, DOCX, MD, HTML, CSV, JSON</span>
        </div>
      </div>
      <button @click="showLimitsBanner = false" class="text-amber-400 hover:text-amber-600 shrink-0 self-start">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Upload -->
    <section class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 class="font-medium text-gray-800">Upload File</h3>
      <div
        class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        @click="fileInput.click()"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <p class="text-sm text-gray-500">Drop a file here or <span class="text-blue-600 font-medium">click to browse</span></p>
        <p class="text-xs text-gray-400 mt-1">PDF, TXT, CSV, PNG…</p>
      </div>
      <input ref="fileInput" type="file" class="hidden" @change="onFileChange" />

      <div v-if="uploadLoading"><LoadingSpinner :label="uploadLabel" /></div>
      <div v-if="uploadError"><ErrorAlert :message="uploadError" /></div>

      <!-- Uploaded files from Pinia store (persists across tab switches) -->
      <div v-if="filesStore.uploadedFiles.length" class="space-y-2">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded this session</p>
        <div
          v-for="f in filesStore.uploadedFiles"
          :key="f.file_id"
          class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
        >
          <div class="min-w-0">
            <span class="font-medium text-gray-800 truncate block">{{ f.filename }}</span>
            <span class="text-xs text-gray-400 font-mono">{{ f.file_id }}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-2">
            <button @click="copyFileId(f.file_id)" class="text-xs text-blue-600 hover:underline">Copy ID</button>
            <button @click="filesStore.removeFile(f.file_id)" class="text-xs text-red-400 hover:underline">Remove</button>
          </div>
        </div>
        <p class="text-xs text-gray-400">
          Vector store: <span class="font-mono">{{ vectorStoreId || '—' }}</span>
        </p>
      </div>
    </section>

    <!-- Search -->
    <section class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 class="font-medium text-gray-800">Document Search</h3>
      <div class="flex gap-2">
        <input
          v-model="query"
          type="text"
          placeholder="Ask a question about your documents…"
          class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keydown.enter.prevent="search"
        />
        <button
          @click="search"
          :disabled="searchLoading || !query.trim()"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Search
        </button>
      </div>

      <div v-if="searchLoading"><LoadingSpinner label="Searching…" /></div>
      <div v-if="searchError"><ErrorAlert :message="searchError" /></div>

      <div v-if="searchResult" class="space-y-4">
        <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">
          {{ searchResult.answer }}
        </div>
        <div v-if="searchResult.citations?.length" class="space-y-2">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Citations</p>
          <div
            v-for="(c, i) in searchResult.citations"
            :key="i"
            class="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-gray-700"
          >
            <span class="font-medium text-blue-700">{{ c.filename }}</span>
            <span v-if="c.quote" class="block mt-1 italic text-gray-500">"{{ c.quote }}"</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { uploadFile, searchFiles } from '../api.js';
import { useFilesStore } from '../stores/filesStore.js';
import ErrorAlert from '../components/ErrorAlert.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const filesStore = useFilesStore();
const fileInput = ref(null);
const uploadLoading = ref(false);
const uploadLabel = ref('Uploading…');
const uploadError = ref('');
const vectorStoreId = ref('');
const showLimitsBanner = ref(true);

const query = ref('');
const searchLoading = ref(false);
const searchError = ref('');
const searchResult = ref(null);

function onFileChange(e) {
  const file = e.target.files[0];
  if (file) upload(file);
  e.target.value = ''; // reset so same file can be re-uploaded
}

function onDrop(e) {
  const file = e.dataTransfer.files[0];
  if (file) upload(file);
}

async function upload(file) {
  uploadError.value = '';
  uploadLoading.value = true;
  uploadLabel.value = 'Uploading file…';
  // Switch label after a short delay to reflect that indexing is the long part
  const labelTimer = setTimeout(() => { uploadLabel.value = 'Indexing into vector store… (this can take up to 30 s)'; }, 3_000);
  try {
    const data = await uploadFile(file);
    filesStore.addFile(data);
    vectorStoreId.value = data.vector_store_id;
  } catch (e) {
    uploadError.value = e.message;
  } finally {
    clearTimeout(labelTimer);
    uploadLoading.value = false;
  }
}

async function search() {
  if (!query.value.trim()) return;
  searchError.value = '';
  searchResult.value = null;
  searchLoading.value = true;
  try {
    searchResult.value = await searchFiles(query.value.trim());
  } catch (e) {
    searchError.value = e.message;
  } finally {
    searchLoading.value = false;
  }
}

function copyFileId(id) {
  navigator.clipboard.writeText(id);
}
</script>
