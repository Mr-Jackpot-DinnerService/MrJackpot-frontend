import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

interface MenuComponent {
  name: string;
  defaultQuantity: number;
  price: number;
  maxQuantity?: number;
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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState('');

  const handleStartListening = () => {
    setIsListening(true);
    setTranscript('');
    setResult('');
    
    // Mock voice recognition
    setTimeout(() => {
      setTranscript('발렌타인 디너 하나랑 와인 추가해주세요');
      setTimeout(() => {
        setResult('✓ 발렌타인 디너 1개 (심플 스타일)\n✓ 와인 추가 1개\n\n총 금액: 110,000원');
        setIsListening(false);
      }, 1000);
    }, 2000);
  };

  const handleStopListening = () => {
    setIsListening(false);
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
                  ? 'bg-red-600 hover:bg-red-700 scale-110 ring-4 ring-red-200' 
                  : 'bg-red-600 hover:bg-red-700 hover:scale-105'
              }`}
              onClick={isListening ? handleStopListening : handleStartListening}
            >
              {isListening ? (
                <div className="flex flex-col items-center gap-2">
                  <Mic className="w-16 h-16 animate-pulse" />
                  <span className="text-lg">듣고 있어요...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <MicOff className="w-16 h-16" />
                  <span className="text-lg">눌러서 말하기</span>
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
            </ul>
          </div>

          {transcript && (
            <div className="mt-6 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">인식된 내용</p>
              <p className="text-lg font-medium text-gray-900">{transcript}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <p className="text-sm text-green-800 font-semibold mb-2">주문 확인</p>
              <pre className="text-base whitespace-pre-line text-green-900 font-sans">{result}</pre>
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setTranscript(''); setResult(''); }}>다시하기</Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">장바구니 담기</Button>
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
