import { apiClient, TokenManager } from './api';
import type { LoginRequest, SignUpRequest, AuthResponse } from './types';

export class AuthService {
  // 회원가입
  static async signup(request: SignUpRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<any>('/auth/signup', request);

      console.log('백엔드 회원가입 응답:', response);

      // 백엔드 응답을 프론트엔드 형식으로 변환
      const authResponse: AuthResponse = {
        token: response.token,
        user: {
          id: response.userId,
          username: response.username,
          name: response.name,
          email: response.email,
          phone: response.phone,
          address: response.address,
          role: response.role
        }
      };

      // 회원가입 성공 시 토큰 저장
      if (authResponse.token) {
        TokenManager.setToken(authResponse.token);
      }

      return authResponse;
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }

  // 로그인
  static async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<any>('/auth/login', request);

      console.log('백엔드 로그인 응답:', response);

      // 백엔드 응답을 프론트엔드 형식으로 변환
      const authResponse: AuthResponse = {
        token: response.token,
        user: {
          id: response.userId,
          username: response.username,
          name: response.name,
          email: response.email,
          phone: response.phone,
          address: response.address,
          role: response.role
        }
      };

      // 로그인 성공 시 토큰 저장
      if (authResponse.token) {
        TokenManager.setToken(authResponse.token);
      }

      return authResponse;
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