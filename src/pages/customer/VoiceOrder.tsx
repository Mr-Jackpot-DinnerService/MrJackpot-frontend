import { useState, useRef, useEffect, useMemo } from 'react';
import { Mic, MicOff, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { VoiceService, type VoiceOrderResponse, CartService, MenuService, type MenuReference } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getComponentDisplayName } from '../../utils/componentNames';
import { getDinnerImageSrc } from '../../utils/menuImages';

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

const dinnerTypeLabels: Record<string, string> = {
  VALENTINE_DINNER: '발렌타인 디너',
  FRENCH_DINNER: '프랑스식 디너',
  ENGLISH_DINNER: '영국식 디너',
  CHAMP_FEAST_DINNER: '샴페인 축제 디너'
};

const servingStyleLabels: Record<string, string> = {
  SIMPLE: '심플',
  GRAND: '그랜드',
  DELUXE: '디럭스'
};

const getDinnerTypeLabel = (code?: string) => {
  if (!code) {
    return '';
  }
  return dinnerTypeLabels[code] || code;
};

const getServingStyleLabel = (code?: string) => {
  if (!code) {
    return '';
  }
  return servingStyleLabels[code] || code;
};

export default function VoiceOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<string[]>([]);
  const [orderSummary, setOrderSummary] = useState<VoiceOrderResponse['orderSummary'] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderAddedToCart, setOrderAddedToCart] = useState(false);
  const [menuReference, setMenuReference] = useState<MenuReference | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const aiMessagesContainerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const loadMenuReference = async () => {
      try {
        const menuRef = await MenuService.getMenuReferences();
        setMenuReference(menuRef);
      } catch (error) {
        console.error('메뉴 참조 데이터 로드 실패:', error);
      }
    };
    loadMenuReference();
  }, []);

  const menuBoardItems = useMemo<MenuItem[]>(() => {
    if (!menuReference) {
      return [];
    }
    const servingOptions = menuReference.servingStyles.map(style => style.description);
    return menuReference.dinnerTypes.map(dinner => ({
      id: dinner.code,
      name: dinner.description,
      description: dinner.description,
      price: dinner.price,
      image: getDinnerImageSrc(dinner.code, dinner.imageUrl),
      category: 'dinner',
      options: servingOptions,
      components: dinner.recipe.map(component => ({
        name: component.componentName,
        defaultQuantity: component.quantity,
        price: 0,
      })),
    }));
  }, [menuReference]);

  useEffect(() => {
    if (aiMessagesContainerRef.current) {
      aiMessagesContainerRef.current.scrollTop = aiMessagesContainerRef.current.scrollHeight;
    }
  }, [aiMessages]);

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
      if (!response.orderSummary.confirmed) {
        setOrderAddedToCart(false);
      }
    }

    // 액션 처리
    if (response.actions && response.actions.length > 0) {
      response.actions.forEach(action => {
        if (action.type === 'PLACE_ORDER' && response.orderSummary?.confirmed) {
          toast.success('주문이 확인되었습니다! 아래 "장바구니 추가" 버튼을 눌러주세요.');
          setOrderAddedToCart(false);
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
    setOrderAddedToCart(false);
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

    if (!menuReference) {
      toast.error('메뉴 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      // dinnerType 찾기
      const dinner = menuReference.dinnerTypes.find(d => d.code === orderSummary.dinnerType);
      const serving = menuReference.servingStyles.find(s => s.code === orderSummary.servingStyle);

      if (!dinner || !serving) {
        toast.error('메뉴 정보를 찾을 수 없습니다.');
        return;
      }

      // 기본 레시피를 기준으로 컴포넌트 수량 구성
      const defaultComponents = dinner.recipe.reduce<Record<string, number>>((acc, recipeItem) => {
        acc[recipeItem.componentCode] = recipeItem.quantity;
        return acc;
      }, {});
      const componentQuantities = { ...defaultComponents };

      // 요청된 구성(설명 기반)을 코드로 변환하여 덮어쓰기
      if (orderSummary.components) {
        Object.entries(orderSummary.components).forEach(([name, quantity]) => {
          const component = menuReference.componentTypes.find(c => c.description === name);
          if (component) {
            componentQuantities[component.code] = quantity;
          }
        });
      }

      const modificationDiffs = Object.keys({
        ...defaultComponents,
        ...componentQuantities
      }).reduce<Record<string, number>>((acc, code) => {
        const actual = componentQuantities[code] ?? 0;
        const base = defaultComponents[code] ?? 0;
        const diff = actual - base;
        if (diff !== 0) {
          acc[code] = diff;
        }
        return acc;
      }, {});

      const calculatedPrice = MenuService.calculateTotalPrice(
        orderSummary.dinnerType,
        orderSummary.servingStyle,
        1,
        modificationDiffs,
        menuReference
      );

      // 장바구니에 추가
      await CartService.addToCart({
        dinnerType: orderSummary.dinnerType,
        servingStyle: orderSummary.servingStyle,
        quantity: 1,
        componentModifications: componentQuantities,
        calculatedPrice
      });

      toast.success('장바구니에 추가되었습니다!');
      setOrderAddedToCart(true);
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
            <div
              ref={aiMessagesContainerRef}
              className="mt-6 bg-white rounded-lg p-4 border border-gray-200 shadow-sm max-h-64 overflow-y-auto"
            >
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
                  <p>🍽️ 메뉴: {getDinnerTypeLabel(orderSummary.dinnerType)}</p>
                )}
                {orderSummary.servingStyle && (
                  <p>✨ 스타일: {getServingStyleLabel(orderSummary.servingStyle)}</p>
                )}
                {orderSummary.components && Object.keys(orderSummary.components).length > 0 && (
                  <div>
                    <p className="font-semibold mt-2">구성:</p>
                    <ul className="ml-4">
                      {Object.entries(orderSummary.components).map(([item, qty]) => (
                        <li key={item}>
                          • {getComponentDisplayName(item)}: {qty}개
                        </li>
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
                  orderAddedToCart ? (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => navigate('/customer/cart')}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      장바구니 가기
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleAddToCartAndNavigate}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      장바구니 추가
                    </Button>
                  )
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
          {menuBoardItems.map(item => (
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
