import { request } from '#shared/utils/request';

interface AppAuthResponse {
  authenticated: boolean;
  username: string | null;
}

interface LoginPayload {
  username: string;
  password: string;
}

interface UpdateCredentialsPayload {
  currentPassword: string;
  username: string;
  password: string;
}

interface AppAuthState {
  authenticated: boolean;
  username: string | null;
  checked: boolean;
}

export default () => {
  const authState = useState<AppAuthState>('app-auth-state', () => ({
    authenticated: false,
    username: null,
    checked: false,
  }));

  function applyState(payload: AppAuthResponse) {
    authState.value = {
      authenticated: payload.authenticated,
      username: payload.username,
      checked: true,
    };
  }

  async function refreshSession(force = false): Promise<AppAuthState> {
    if (!force && authState.value.checked) {
      return authState.value;
    }

    try {
      const payload = await request<AppAuthResponse>('/api/app/auth/session');
      applyState(payload);
    } catch (error) {
      authState.value = {
        authenticated: false,
        username: null,
        checked: true,
      };
    }

    return authState.value;
  }

  async function login(payload: LoginPayload): Promise<AppAuthState> {
    const resp = await request<AppAuthResponse>('/api/app/auth/login', {
      method: 'POST',
      body: payload,
    });

    applyState(resp);
    return authState.value;
  }

  async function logout(): Promise<AppAuthState> {
    try {
      const resp = await request<AppAuthResponse>('/api/app/auth/logout', {
        method: 'POST',
      });

      applyState(resp);
    } catch (error) {
      authState.value = {
        authenticated: false,
        username: null,
        checked: true,
      };
    }

    return authState.value;
  }

  async function updateCredentials(payload: UpdateCredentialsPayload): Promise<AppAuthState> {
    const resp = await request<AppAuthResponse>('/api/app/auth/update', {
      method: 'POST',
      body: payload,
    });

    applyState(resp);
    return authState.value;
  }

  return {
    authState,
    refreshSession,
    login,
    logout,
    updateCredentials,
  };
};
