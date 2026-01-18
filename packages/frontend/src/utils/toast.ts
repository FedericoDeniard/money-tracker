import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
    });
  },

  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
    });
  },

  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
    });
  },

  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },

  custom: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    sonnerToast(message, options);
  },
};
