import { useSignIn, useSession } from '@features/auth';
import type { LoginCredentials, LoginResponse } from '@entities/session/model/types';

export type { LoginCredentials, LoginResponse };

export function useLogin() {
  const signInState = useSignIn();
  const session = useSession();

  return {
    ...signInState,
    ...session,
  };
}
