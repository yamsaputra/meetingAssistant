import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useFilesStore = defineStore('files', () => {
  /** Files successfully uploaded to the vector store. */
  const uploadedFiles = ref([]);

  function addFile(file) {
    // Avoid duplicates if the same file is uploaded twice
    if (!uploadedFiles.value.some(f => f.file_id === file.file_id)) {
      uploadedFiles.value.push(file);
    }
  }

  function removeFile(fileId) {
    uploadedFiles.value = uploadedFiles.value.filter(f => f.file_id !== fileId);
  }

  return { uploadedFiles, addFile, removeFile };
});
