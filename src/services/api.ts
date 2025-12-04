const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// API 응답 타입 정의
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// 에러 타입 정의
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// JWT 토큰 관리
class TokenManager {
  private static readonly TOKEN_KEY = 'jwt_token';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}

// HTTP 클라이언트 클래스
class HttpClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = TokenManager.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log(`API 요청 [${options.method || 'GET'}] ${endpoint} - 토큰 있음`);
    } else {
      console.log(`API 요청 [${options.method || 'GET'}] ${endpoint} - 토큰 없음`);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.text();

        // 401 Unauthorized 에러 시 (토큰 만료 등) 자동 로그아웃
        if (response.status === 401) {
          console.warn('인증 실패 (401) - 자동 로그아웃 처리');
          TokenManager.removeToken();
          // 사용자 정보도 제거
          localStorage.removeItem('user');

          // 로그인 페이지로 리다이렉트 (현재 페이지가 로그인 페이지가 아닌 경우에만)
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }

        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      // 응답이 비어있는 경우 (204 No Content 등)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error occurred', 0, error);
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// API 클라이언트 인스턴스
export const apiClient = new HttpClient(API_BASE_URL);
export { TokenManager };