import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Trash2, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

interface Address {
  id: string;
  name: string;
  recipient: string;
  phone: string;
  address: string;
  detailAddress: string;
  isDefault: boolean;
}

const MOCK_ADDRESSES: Address[] = [
  {
    id: '1',
    name: '우리집',
    recipient: '김대박',
    phone: '010-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    detailAddress: '대박아파트 101동 101호',
    isDefault: true,
  },
  {
    id: '2',
    name: '회사',
    recipient: '김대박',
    phone: '010-1234-5678',
    address: '서울시 서초구 서초대로 456',
    detailAddress: '대박빌딩 5층',
    isDefault: false,
  },
];

export default function AddressManagement() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [isAdding, setIsAdding] = useState(false);
  
  // New address form state
  const [newAddress, setNewAddress] = useState({
    name: '',
    recipient: '',
    phone: '',
    address: '',
    detailAddress: '',
  });

  const handleSetDefault = (id: string) => {
    setAddresses(addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    })));
    toast.success('기본 배송지가 변경되었습니다.');
  };

  const handleDelete = (id: string) => {
    const addrToDelete = addresses.find(a => a.id === id);
    if (addrToDelete?.isDefault) {
      toast.error('기본 배송지는 삭제할 수 없습니다.');
      return;
    }
    setAddresses(addresses.filter(addr => addr.id !== id));
    toast.success('배송지가 삭제되었습니다.');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newAddr: Address = {
      id: Date.now().toString(),
      ...newAddress,
      isDefault: addresses.length === 0, // If it's the first address, make it default
    };

    setAddresses([...addresses, newAddr]);
    setIsAdding(false);
    setNewAddress({
      name: '',
      recipient: '',
      phone: '',
      address: '',
      detailAddress: '',
    });
    toast.success('배송지가 추가되었습니다.');
  };

  const defaultAddress = addresses.find(a => a.isDefault);
  const otherAddresses = addresses.filter(a => !a.isDefault);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-3xl font-bold">배송지 관리</h1>
      </div>

      {!isAdding ? (
        <div className="space-y-8">
          {/* Default Address Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">기본 배송지</h2>
            {defaultAddress ? (
              <Card className="p-6 border-red-200 bg-red-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg">{defaultAddress.name}</span>
                      <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">기본</span>
                    </div>
                    <p className="text-gray-600 mb-1">{defaultAddress.recipient} / {defaultAddress.phone}</p>
                    <p className="text-gray-800">{defaultAddress.address} {defaultAddress.detailAddress}</p>
                  </div>
                  <MapPin className="text-red-600 w-6 h-6" />
                </div>
              </Card>
            ) : (
              <Card className="p-6 flex items-center justify-center text-gray-500">
                등록된 기본 배송지가 없습니다.
              </Card>
            )}
          </section>

          {/* Other Addresses Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">다른 배송지</h2>
              <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                배송지 추가
              </Button>
            </div>
            
            <div className="grid gap-4">
              {otherAddresses.length > 0 ? (
                otherAddresses.map(addr => (
                  <Card key={addr.id} className="p-6 hover:border-red-200 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg mb-2">{addr.name}</div>
                        <p className="text-gray-600 mb-1">{addr.recipient} / {addr.phone}</p>
                        <p className="text-gray-800 mb-4">{addr.address} {addr.detailAddress}</p>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSetDefault(addr.id)}
                            className="text-sm"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            기본 배송지로 설정
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(addr.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  추가된 배송지가 없습니다.
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* Add Address Form */
        <Card className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">새 배송지 추가</h2>
          <form onSubmit={handleAddSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">배송지 이름 (예: 회사, 본가)</Label>
              <Input
                id="name"
                required
                value={newAddress.name}
                onChange={e => setNewAddress({...newAddress, name: e.target.value})}
                placeholder="배송지 별칭을 입력하세요"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">받는 분</Label>
                <Input
                  id="recipient"
                  required
                  value={newAddress.recipient}
                  onChange={e => setNewAddress({...newAddress, recipient: e.target.value})}
                  placeholder="이름"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <Input
                  id="phone"
                  required
                  value={newAddress.phone}
                  onChange={e => setNewAddress({...newAddress, phone: e.target.value})}
                  placeholder="010-0000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                required
                value={newAddress.address}
                onChange={e => setNewAddress({...newAddress, address: e.target.value})}
                placeholder="주소를 입력하세요"
                className="mb-2"
              />
              <Input
                id="detailAddress"
                required
                value={newAddress.detailAddress}
                onChange={e => setNewAddress({...newAddress, detailAddress: e.target.value})}
                placeholder="상세 주소를 입력하세요"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAdding(false)}>
                취소
              </Button>
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
                저장하기
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
