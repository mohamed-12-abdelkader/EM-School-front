import { apiFetch } from '@/api/client';
import type { LoginResponse, StudentLoginResponse } from '@/types/auth';

export async function loginRequest(email: string, password: string) {
  return apiFetch<LoginResponse>('/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export async function loginStudentRequest(login_code: string) {
  return apiFetch<StudentLoginResponse>('/login/student', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ login_code }),
  });
}
