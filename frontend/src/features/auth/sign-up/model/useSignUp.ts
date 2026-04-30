import { useCallback } from 'react';
import type { RegisterUserPayload } from '@entities/user/model';
import { registerUser } from '@entities/user/api/user-api';
import { useAsyncAction } from '@shared/lib/useAsyncAction';

export function useSignUp() {
  const signUpAction = useCallback((userData: RegisterUserPayload) => registerUser(userData), []);

  const { execute, loading, error, success } = useAsyncAction(signUpAction, {
    defaultErrorMessage: 'Failed to register user',
  });

  return { register: execute, loading, error, success };
}
