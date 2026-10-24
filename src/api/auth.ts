import { apiFetch } from '@/api/client';
import type {
  LoginResponse,
  ParentLoginResponse,
  StudentLoginResponse,
} from '@/types/auth';

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

export async function loginParentRequest(login_code: string) {
  return apiFetch<ParentLoginResponse>('/login/parent', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ login_code: login_code.trim() }),
  });
}
