import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Building, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

interface PaymentCard {
  id: string;
  name: string;
  number: string;
  expiry: string;
  isDefault: boolean;
}

const MOCK_CARDS: PaymentCard[] = [
  {
    id: '1',
    name: '현대카드 ZERO',
    number: '**** **** **** 1234',
    expiry: '12/28',
    isDefault: true,
  },
  {
    id: '2',
    name: '신한카드 Deep Dream',
    number: '**** **** **** 5678',
    expiry: '09/27',
    isDefault: false,
  },
];

export default function PaymentManagement() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<PaymentCard[]>(MOCK_CARDS);
  const [isAdding, setIsAdding] = useState(false);
  
  // New card form state
  const [newCard, setNewCard] = useState({
    name: '',
    number: '',
    expiry: '',
    cvc: '',
  });

  const handleSetDefault = (id: string) => {
    setCards(cards.map(card => ({
      ...card,
      isDefault: card.id === id
    })));
    toast.success('기본 결제 카드가 변경되었습니다.');
  };

  const handleDelete = (id: string) => {
    setCards(cards.filter(card => card.id !== id));
    toast.success('카드가 삭제되었습니다.');
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const card: PaymentCard = {
      id: Date.now().toString(),
      name: newCard.name,
      number: `**** **** **** ${newCard.number.slice(-4)}`,
      expiry: newCard.expiry,
      isDefault: cards.length === 0,
    };
    setCards([...cards, card]);
    setIsAdding(false);
    setNewCard({ name: '', number: '', expiry: '', cvc: '' });
    toast.success('새로운 카드가 등록되었습니다.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-3xl font-bold">결제 수단 관리</h1>
      </div>

      <Tabs defaultValue="card" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-auto bg-gray-100 p-1">
          <TabsTrigger 
            value="card" 
            className="text-lg py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            카드 관리
          </TabsTrigger>
          <TabsTrigger 
            value="bank" 
            className="text-lg py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Building className="w-5 h-5 mr-2" />
            무통장 입금
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card">
          {!isAdding ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">등록된 카드</h2>
                <Button onClick={() => setIsAdding(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  카드 추가
                </Button>
              </div>

              <div className="grid gap-4">
                {cards.map(card => (
                  <Card key={card.id} className={`p-6 transition-all ${card.isDefault ? 'border-red-500 bg-red-50' : 'hover:border-gray-300'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-8 rounded bg-gradient-to-br ${card.isDefault ? 'from-red-500 to-red-600' : 'from-gray-600 to-gray-800'} text-white flex items-center justify-center text-xs font-bold shadow-sm`}>
                          CARD
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{card.name}</h3>
                            {card.isDefault && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">기본</span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm">{card.number} | {card.expiry}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!card.isDefault && (
                          <Button variant="outline" size="sm" onClick={() => handleSetDefault(card.id)}>
                            기본으로 설정
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => handleDelete(card.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="max-w-xl mx-auto p-6">
              <h2 className="text-2xl font-bold mb-6">카드 등록</h2>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="space-y-2">
                  <Label>카드 별칭</Label>
                  <Input 
                    placeholder="예: 급여카드"
                    value={newCard.name}
                    onChange={e => setNewCard({...newCard, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>카드 번호</Label>
                  <Input 
                    placeholder="0000-0000-0000-0000"
                    value={newCard.number}
                    onChange={e => setNewCard({...newCard, number: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>유효기간 (MM/YY)</Label>
                    <Input 
                      placeholder="MM/YY"
                      value={newCard.expiry}
                      onChange={e => setNewCard({...newCard, expiry: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CVC</Label>
                    <Input 
                      type="password"
                      placeholder="000"
                      maxLength={3}
                      value={newCard.cvc}
                      onChange={e => setNewCard({...newCard, cvc: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAdding(false)}>취소</Button>
                  <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">등록 완료</Button>
                </div>
              </form>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bank">
          <Card className="p-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">무통장 입금 전용 계좌</h2>
              <p className="text-gray-600">고객님만을 위한 전용 가상계좌입니다.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <span className="text-gray-600">은행명</span>
                <span className="font-bold">대박은행</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <span className="text-gray-600">계좌번호</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">123-456-789012</span>
                  <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => toast.success('계좌번호가 복사되었습니다.')}>
                    복사
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">예금주</span>
                <span className="font-bold">미스터 대박 (Mr. DaeBak)</span>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-500 space-y-1">
              <p>• 주문 시 발급된 가상계좌로 입금하시면 입금 확인 후 주문이 접수됩니다.</p>
              <p>• 입금 기한 내 미입금 시 주문이 자동 취소될 수 있습니다.</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
