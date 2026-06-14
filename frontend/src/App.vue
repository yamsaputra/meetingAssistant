<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
        </div>
        <h1 class="text-xl font-semibold text-gray-900">Meeting Assistant</h1>
        <span class="ml-auto text-xs text-gray-400 font-mono">localhost:8000</span>
      </div>
    </header>

    <TabNav :tabs="tabs" :active="activeTab" @select="activeTab = $event" />

    <main class="max-w-6xl mx-auto px-4 py-8">
      <!-- KeepAlive preserves each tab's component state (chat history, results, etc.)
           when the user switches between tabs. -->
      <KeepAlive>
        <component :is="currentView" :key="activeTab" />
      </KeepAlive>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import TabNav from './components/TabNav.vue';
import ChatView from './views/ChatView.vue';
import FilesView from './views/FilesView.vue';
import VisionView from './views/VisionView.vue';
import TasksView from './views/TasksView.vue';
import FunctionsView from './views/FunctionsView.vue';
import CodeView from './views/CodeView.vue';
/* import ImagesView from './views/ImagesView.vue'; */ // For future image generation tab, requires a vision model that supports it.

const tabs = [
  { id: 'chat', label: 'Chat', component: ChatView },
  { id: 'files', label: 'Files & Search', component: FilesView },
  { id: 'vision', label: 'Vision', component: VisionView },
  { id: 'tasks', label: 'Tasks', component: TasksView },
  { id: 'functions', label: 'Functions', component: FunctionsView },
  { id: 'code', label: 'Code', component: CodeView },
 /*  { id: 'images', label: 'Images', component: ImagesView }, */
];

const activeTab = ref('chat');
const currentView = computed(() => tabs.find(t => t.id === activeTab.value)?.component);
</script>
