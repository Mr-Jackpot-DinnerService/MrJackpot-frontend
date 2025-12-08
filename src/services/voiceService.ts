import { apiClient } from './api';

// 음성 주문 요청 타입
export interface VoiceOrderRequest {
  sessionId?: string | null;
  audioData?: string;
  text?: string;
}

// 주문 요약 정보
export interface OrderSummary {
  occasionDate?: string;
  occasionTime?: string;
  occasionType?: string;
  dinnerType?: string;
  servingStyle?: string;
  components?: Record<string, number>;
  confirmed?: boolean;
}

// 액션 정보
export interface ActionDto {
  type: string;
  payload?: Record<string, any>;
}

// 음성 주문 응답 타입
export interface VoiceOrderResponse {
  sessionId: string;
  reply: string;
  orderSummary?: OrderSummary;
  actions?: ActionDto[];
}

export const VoiceService = {
  /**
   * 음성 주문 처리
   */
  processVoiceOrder: async (
    userId: number,
    request: VoiceOrderRequest
  ): Promise<VoiceOrderResponse> => {
    const response = await apiClient.post<VoiceOrderResponse>(
      `/voice/order?userId=${userId}`,
      request
    );
    return response;
  },

  /**
   * 세션 종료
   */
  endSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/voice/session/${sessionId}`);
  },

  /**
   * 헬스 체크
   */
  healthCheck: async (): Promise<string> => {
    const response = await apiClient.get<string>('/voice/health');
    return response;
  },
};
