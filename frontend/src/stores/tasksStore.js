import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref([]);

  function setTasks(newTasks) {
    tasks.value = newTasks;
    console.log('[TasksStore] setTasks:', newTasks);
    newTasks.forEach((task, idx) => {
      console.log(`  [${idx}]`, task);
    });
  }

  function addTask(task) {
    tasks.value.push(task);
    console.log('[TasksStore] addTask:', task);
  }

  function clearTasks() {
    console.log('[TasksStore] clearTasks - removed', tasks.value.length, 'tasks');
    tasks.value = [];
  }

  return { tasks, setTasks, addTask, clearTasks };
});
