import { useCallback, useState } from 'react';

interface UseAsyncActionOptions {
  defaultErrorMessage: string;
}

export interface AsyncActionState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function useAsyncAction<TPayload, TResult>(
  action: (payload: TPayload) => Promise<TResult>,
  options: UseAsyncActionOptions,
) {
  const [state, setState] = useState<AsyncActionState>({
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(
    async (payload: TPayload) => {
      setState({ loading: true, error: null, success: false });

      try {
        const result = await action(payload);
        setState({ loading: false, error: null, success: true });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : options.defaultErrorMessage;
        setState({ loading: false, error: message, success: false });
        throw err;
      }
    },
    [action, options.defaultErrorMessage],
  );

  return {
    execute,
    ...state,
  };
}
