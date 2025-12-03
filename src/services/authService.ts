import { apiClient, TokenManager } from './api';
import type { LoginRequest, SignUpRequest, AuthResponse } from './types';

export class AuthService {
  // 회원가입
  static async signup(request: SignUpRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/signup', request);

      // 회원가입 성공 시 토큰 저장
      if (response.token) {
        TokenManager.setToken(response.token);
      }

      return response;
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }

  // 로그인
  static async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', request);

      // 로그인 성공 시 토큰 저장
      if (response.token) {
        TokenManager.setToken(response.token);
      }

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // 로그아웃
  static logout(): void {
    TokenManager.removeToken();
  }

  // 현재 로그인 상태 확인
  static isLoggedIn(): boolean {
    return TokenManager.getToken() !== null;
  }

  // 현재 토큰 반환
  static getCurrentToken(): string | null {
    return TokenManager.getToken();
  }
}

export default AuthService;