import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);

  function show(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const toast: Toast = {
      id,
      message,
      type,
      duration,
    };

    toasts.value.push(toast);

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }

    return id;
  }

  function remove(id: string) {
    const index = toasts.value.findIndex(toast => toast.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  }

  function clear() {
    toasts.value = [];
  }

  // Convenience methods
  const success = (message: string, duration = 3000) => show(message, 'success', duration);
  const error = (message: string, duration = 5000) => show(message, 'error', duration);
  const warning = (message: string, duration = 4000) => show(message, 'warning', duration);
  const info = (message: string, duration = 3000) => show(message, 'info', duration);

  return {
    toasts,
    show,
    remove,
    clear,
    success,
    error,
    warning,
    info,
  };
});
