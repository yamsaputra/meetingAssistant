import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useFilesStore = defineStore('files', () => {
  /** Files successfully uploaded to the vector store. */
  const uploadedFiles = ref([]);

  function addFile(file) {
    // Avoid duplicates if the same file is uploaded twice
    if (!uploadedFiles.value.some(f => f.file_id === file.file_id)) {
      console.log(`Adding file with ID ${file.file_id} to uploaded files list.`);
      uploadedFiles.value.push(file);
    } else {
      console.warn(`File with ID ${file.file_id} is already in the uploaded files list.`);
    }
  }

  function removeFile(fileId) {
    console.log(`Removing file with ID ${fileId} from uploaded files list.`);   
    uploadedFiles.value = uploadedFiles.value.filter(f => f.file_id !== fileId);
  }

  return { uploadedFiles, addFile, removeFile };
});
