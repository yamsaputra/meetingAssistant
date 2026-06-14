<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">Chat</h2>
      <p class="text-sm text-gray-500 mt-1">Send a message and get a plain response from the model.</p>
    </div>

    <div v-if="messages.length" class="space-y-3">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="[
          'rounded-lg px-4 py-3 text-sm',
          msg.role === 'user'
            ? 'bg-blue-600 text-white ml-auto max-w-[80%] w-fit'
            : 'bg-white border border-gray-200 text-gray-800 max-w-[80%]',
        ]"
      >
        <div v-if="msg.role === 'user'" class="whitespace-pre-wrap">{{ msg.content }}</div>
        <div v-else class="markdown-content" v-html="parseMarkdown(msg.content)"></div>
      </div>
    </div>

    <div v-if="error"><ErrorAlert :message="error" /></div>
    <div v-if="loading"><LoadingSpinner label="Waiting for response…" /></div>

    <form @submit.prevent="send" class="flex gap-2 items-end">
      <textarea
        v-model="input"
        rows="3"
        placeholder="Type a message…"
        class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        @keydown.enter.meta.prevent="send"
        @keydown.ctrl.enter.prevent="send"
      />
      <button
        type="submit"
        :disabled="loading || !input.trim()"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
    <p class="text-xs text-gray-400">Ctrl+Enter or Cmd+Enter to send</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { postChat } from '../api.js';
import { useTasksStore } from '../stores/tasksStore.js';
import { useFilesStore } from '../stores/filesStore.js';
import { parseMarkdown } from '../utils/markdown.js';
import ErrorAlert from '../components/ErrorAlert.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const tasksStore = useTasksStore();
const filesStore = useFilesStore();
const input = ref('');
const loading = ref(false);
const error = ref('');
const messages = ref([]);

async function send() {
  const text = input.value.trim();
  if (!text) return;
  messages.value.push({ role: 'user', content: text });
  input.value = '';
  error.value = '';
  loading.value = true;
  try {
    const context = {
      tasks: tasksStore.tasks,
      uploadedFiles: filesStore.uploadedFiles,
    };
    console.log('[ChatView] Sending context:', context);
    const data = await postChat(text, context);
    const reply = data.output_text ?? data.answer ?? data.response ?? JSON.stringify(data);
    messages.value.push({ role: 'assistant', content: reply });
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
