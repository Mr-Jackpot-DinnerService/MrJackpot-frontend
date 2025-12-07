import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { VoiceService, type VoiceOrderResponse, CartService, MenuService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface MenuComponent {
  name: string;
  defaultQuantity: number;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  options: string[];
  components: MenuComponent[];
}

const menuItems: MenuItem[] = [
  {
    id: '1',
    name: '발렌타인 디너',
    description: '하트 모양과 큐피드 장식 접시에 와인과 스테이크 제공',
    price: 80000,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
    category: 'dinner',
    options: ['심플 스타일', '그랜드 스타일', '디럭스 스타일'],
    components: [
      { name: '와인', defaultQuantity: 1, price: 15000 },
      { name: '스테이크', defaultQuantity: 1, price: 35000 }
    ]
  },
  {
    id: '2',
    name: '프렌치 디너',
    description: '커피, 와인, 샐러드, 스테이크 제공',
    price: 70000,
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop',
    category: 'dinner',
    options: ['심플 스타일', '그랜드 스타일', '디럭스 스타일'],
    components: [
      { name: '커피', defaultQuantity: 1, price: 5000 },
      { name: '와인', defaultQuantity: 1, price: 15000 },
      { name: '샐러드', defaultQuantity: 1, price: 10000 },
      { name: '스테이크', defaultQuantity: 1, price: 35000 }
    ]
  },
  {
    id: '3',
    name: '잉글리시 디너',
    description: '에그 스크램블, 베이컨, 빵, 스테이크 제공',
    price: 60000,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    category: 'dinner',
    options: ['심플 스타일', '그랜드 스타일', '디럭스 스타일'],
    components: [
      { name: '에그 스크램블', defaultQuantity: 1, price: 8000 },
      { name: '베이컨', defaultQuantity: 1, price: 7000 },
      { name: '빵', defaultQuantity: 1, price: 5000 },
      { name: '스테이크', defaultQuantity: 1, price: 35000 }
    ]
  },
  {
    id: '4',
    name: '샴페인 축제 디너',
    description: '2인 식사, 샴페인 1병, 바게트빵 4개, 커피 포트, 와인, 스테이크 제공',
    price: 120000,
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop',
    category: 'dinner',
    options: ['그랜드 스타일', '디럭스 스타일'],
    components: [
      { name: '샴페인', defaultQuantity: 1, price: 40000 },
      { name: '바게트빵', defaultQuantity: 4, price: 3000 },
      { name: '커피 포트', defaultQuantity: 1, price: 10000 },
      { name: '와인', defaultQuantity: 1, price: 15000 },
      { name: '스테이크', defaultQuantity: 2, price: 35000 }
    ]
  },
];

export default function VoiceOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<string[]>([]);
  const [orderSummary, setOrderSummary] = useState<VoiceOrderResponse['orderSummary'] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // 컴포넌트 언마운트 시 세션 종료 및 녹음 정리
    return () => {
      if (sessionId) {
        VoiceService.endSession(sessionId).catch(console.error);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);

        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsListening(true);

      // 5초 후 자동으로 녹음 중지
      silenceTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 5000);
    } catch (error) {
      console.error('마이크 접근 오류:', error);
      toast.error('마이크에 접근할 수 없습니다. 브라우저 권한을 확인해주세요.');
    }
  };

  const stopRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    setIsProcessing(true);

    try {
      // Blob을 base64로 변환
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        try {
          const response = await VoiceService.processVoiceOrder(user.id, {
            sessionId: sessionId,
            audioData: base64Audio,
          });

          handleVoiceResponse(response);
        } catch (error: any) {
          console.error('음성 주문 처리 실패:', error);
          toast.error('음성 주문 처리에 실패했습니다. 다시 시도해주세요.');
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (error) {
      console.error('오디오 처리 오류:', error);
      toast.error('음성 처리 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  const handleTextInput = async (text: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!text.trim()) return;

    setIsProcessing(true);

    try {
      const response = await VoiceService.processVoiceOrder(user.id, {
        sessionId: sessionId,
        text: text,
      });

      handleVoiceResponse(response);
    } catch (error) {
      console.error('텍스트 주문 처리 실패:', error);
      toast.error('주문 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceResponse = (response: VoiceOrderResponse) => {
    // 세션 ID 저장
    if (response.sessionId) {
      setSessionId(response.sessionId);
    }

    // AI 응답 추가
    if (response.reply) {
      setAiMessages(prev => [...prev, response.reply]);
    }

    // 주문 요약 정보 저장
    if (response.orderSummary) {
      setOrderSummary(response.orderSummary);
    }

    // 액션 처리
    if (response.actions && response.actions.length > 0) {
      response.actions.forEach(action => {
        if (action.type === 'PLACE_ORDER' && response.orderSummary?.confirmed) {
          toast.success('주문이 확인되었습니다! 아래 "장바구니 가기" 버튼을 눌러주세요.');
        }
      });
    }
  };

  const handleStartListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleReset = () => {
    setAiMessages([]);
    setOrderSummary(null);
    if (sessionId) {
      VoiceService.endSession(sessionId).catch(console.error);
      setSessionId(null);
    }
  };

  const handleAddToCartAndNavigate = async () => {
    if (!orderSummary || !orderSummary.dinnerType || !orderSummary.servingStyle) {
      toast.error('주문 정보가 완전하지 않습니다.');
      return;
    }

    try {
      // 메뉴 참조 정보 가져오기
      const menuRef = await MenuService.getMenuReferences();

      // dinnerType 찾기
      const dinner = menuRef.dinnerTypes.find(d => d.code === orderSummary.dinnerType);
      const serving = menuRef.servingStyles.find(s => s.code === orderSummary.servingStyle);

      if (!dinner || !serving) {
        toast.error('메뉴 정보를 찾을 수 없습니다.');
        return;
      }

      // 가격 계산
      const basePrice = dinner.price + serving.extraPrice;

      // 컴포넌트 수정사항 변환
      const componentModifications: Record<string, number> = {};
      if (orderSummary.components) {
        Object.entries(orderSummary.components).forEach(([name, quantity]) => {
          // 이름으로 컴포넌트 코드 찾기
          const component = menuRef.componentTypes.find(c => c.description === name);
          if (component) {
            componentModifications[component.code] = quantity;
          }
        });
      }

      // 장바구니에 추가
      await CartService.addToCart({
        dinnerType: orderSummary.dinnerType,
        servingStyle: orderSummary.servingStyle,
        quantity: 1,
        componentModifications: Object.keys(componentModifications).length > 0 ? componentModifications : undefined,
        calculatedPrice: basePrice
      });

      toast.success('장바구니에 추가되었습니다!');
      navigate('/customer/cart');
    } catch (error) {
      console.error('장바구니 추가 실패:', error);
      toast.error('장바구니에 추가하는 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8 text-center">음성으로 주문하기</h1>

      {/* Voice Interaction Area */}
      <div className="flex justify-center mb-12">
        <Card className="p-8 text-center max-w-xl w-full bg-gradient-to-b from-white to-gray-50">
          <div className="mb-8 flex justify-center">
            <Button
              size="lg"
              className={`w-48 h-48 rounded-full shadow-xl transition-all duration-300 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 scale-110 ring-4 ring-red-200 animate-pulse'
                  : 'bg-red-600 hover:bg-red-700 hover:scale-105'
              }`}
              onClick={handleStartListening}
              disabled={isProcessing}
            >
              {isListening ? (
                <div className="flex flex-col items-center gap-2">
                  <Mic className="w-16 h-16" />
                  <span className="text-lg">듣고 있어요...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <MicOff className="w-16 h-16" />
                  <span className="text-lg">{isProcessing ? '처리 중...' : '눌러서 말하기'}</span>
                </div>
              )}
            </Button>
          </div>

          <p className="text-xl mb-4 font-medium text-gray-700">
            {isListening ? '원하시는 메뉴를 말씀해주세요' : '위 버튼을 누르고 메뉴를 말씀해주세요'}
          </p>

          <div className="text-sm text-gray-500 bg-white p-4 rounded-lg border inline-block text-left">
            <p className="font-semibold mb-2">이렇게 말해보세요:</p>
            <ul className="space-y-1">
              <li>"발렌타인 디너 하나 주세요"</li>
              <li>"프렌치 디너에 와인 추가해줘"</li>
              <li>"샴페인 축제 디너 디럭스로 주세요"</li>
            </ul>
          </div>

          {/* AI 응답 내역 */}
          {aiMessages.length > 0 && (
            <div className="mt-6 bg-white rounded-lg p-4 border border-gray-200 shadow-sm max-h-64 overflow-y-auto">
              <p className="text-sm font-semibold text-gray-700 mb-3">AI 응답</p>
              <div className="space-y-2">
                {aiMessages.map((message, index) => (
                  <div key={index} className="text-left">
                    <div className="inline-block rounded-lg px-4 py-2 bg-green-100 text-green-900">
                      <p className="text-sm">{message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 주문 요약 */}
          {orderSummary && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-800 font-semibold">주문 요약</p>
                {orderSummary.confirmed && (
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">확인됨</span>
                )}
              </div>

              <div className="text-sm text-green-900 space-y-1">
                {orderSummary.occasionDate && (
                  <p>📅 날짜: {orderSummary.occasionDate}</p>
                )}
                {orderSummary.occasionType && (
                  <p>🎉 기념일: {orderSummary.occasionType}</p>
                )}
                {orderSummary.dinnerType && (
                  <p>🍽️ 메뉴: {orderSummary.dinnerType}</p>
                )}
                {orderSummary.servingStyle && (
                  <p>✨ 스타일: {orderSummary.servingStyle}</p>
                )}
                {orderSummary.components && Object.keys(orderSummary.components).length > 0 && (
                  <div>
                    <p className="font-semibold mt-2">구성:</p>
                    <ul className="ml-4">
                      {Object.entries(orderSummary.components).map(([item, qty]) => (
                        <li key={item}>• {item}: {qty}개</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  다시하기
                </Button>
                {orderSummary.confirmed && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleAddToCartAndNavigate}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    장바구니 추가
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Menu Board */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Mr. DaeBak 메뉴</h2>
          <p className="text-gray-600">아래 메뉴를 보고 말씀해주세요</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {menuItems.map(item => (
            <div key={item.id} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <ImageWithFallback
                src={item.image}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-bold mb-1">{item.name}</h3>
                <p className="text-red-600 font-bold mb-2">{item.price.toLocaleString()}원</p>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">구성</div>
                  <div className="flex flex-wrap gap-1">
                    {item.components.map(comp => (
                      <span key={comp.name} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {comp.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
