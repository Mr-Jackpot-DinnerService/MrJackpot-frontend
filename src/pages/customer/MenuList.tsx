import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { useCart } from '../../contexts/CartContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Textarea } from '../../components/ui/textarea';
import { Plus, Minus } from 'lucide-react';

interface MenuComponent {
  name: string;
  defaultQuantity: number;
  price: number; // 0 if included in base price, positive for extra cost
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

export default function MenuList() {
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [request, setRequest] = useState('');
  const [componentQuantities, setComponentQuantities] = useState<Record<string, number>>({});
  const { addToCart } = useCart();

  useEffect(() => {
    if (selectedMenu) {
      const initialQuantities: Record<string, number> = {};
      selectedMenu.components.forEach(comp => {
        initialQuantities[comp.name] = comp.defaultQuantity;
      });
      setComponentQuantities(initialQuantities);
    }
  }, [selectedMenu]);

  const handleMenuClick = (menu: MenuItem) => {
    setSelectedMenu(menu);
    setSelectedOptions(menu.options.length > 0 ? [menu.options[0]] : []);
    setQuantity(1);
    setRequest('');
  };

  const handleQuantityChange = (componentName: string, change: number) => {
    setComponentQuantities(prev => {
      const current = prev[componentName] || 0;
      const newValue = Math.max(0, current + change);
      return { ...prev, [componentName]: newValue };
    });
  };

  const calculateTotalPrice = () => {
    if (!selectedMenu) return 0;
    
    let total = selectedMenu.price;
    
    selectedMenu.components.forEach(comp => {
      const currentQty = componentQuantities[comp.name] || 0;
      const diff = currentQty - comp.defaultQuantity;
      if (diff > 0) {
        total += diff * comp.price;
      }
      // Optional: Subtract price if removing items (if business logic allows)
      // Currently only adding cost for extra items
    });

    return total * quantity;
  };

  const handleAddToCart = () => {
    if (selectedMenu) {
      // Construct detailed request string from component changes
      const changes: string[] = [];
      selectedMenu.components.forEach(comp => {
        const currentQty = componentQuantities[comp.name] || 0;
        if (currentQty !== comp.defaultQuantity) {
          changes.push(`${comp.name}: ${currentQty}개 (기본 ${comp.defaultQuantity}개)`);
        }
      });

      const changesText = changes.length > 0 ? `[구성 변경] ${changes.join(', ')}` : '';
      const fullRequest = [changesText, request].filter(Boolean).join('\n');

      addToCart({
        menuId: selectedMenu.id,
        name: selectedMenu.name,
        price: calculateTotalPrice() / quantity, // Unit price with adjustments
        quantity,
        options: selectedOptions,
        image: selectedMenu.image,
        request: fullRequest.trim() || undefined,
      });
      setSelectedMenu(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">메뉴</h1>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl mb-4">디너 세트</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <MenuCard key={item.id} item={item} onClick={() => handleMenuClick(item)} />
            ))}
          </div>
        </div>
      </div>

      {/* Menu Detail Dialog */}
      <Dialog open={!!selectedMenu} onOpenChange={() => setSelectedMenu(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedMenu && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMenu.name}</DialogTitle>
                <DialogDescription className="text-gray-600">
                  {selectedMenu.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <ImageWithFallback
                  src={selectedMenu.image}
                  alt={selectedMenu.name}
                  className="w-full h-64 object-cover rounded-lg"
                />

                {selectedMenu.options.length > 0 && (
                  <div>
                    <Label className="mb-2 block font-semibold">서빙 스타일</Label>
                    <div className="space-y-2">
                      {selectedMenu.options.map(option => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={option}
                            checked={selectedOptions.includes(option)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOptions([option]);
                              }
                            }}
                          />
                          <label htmlFor={option} className="cursor-pointer">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="mb-2 block font-semibold">구성 변경 옵션</Label>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    {selectedMenu.components.map(comp => (
                      <div key={comp.name} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{comp.name}</span>
                          <div className="text-xs text-gray-500">
                            기본 {comp.defaultQuantity}개 / 추가 시 +{comp.price.toLocaleString()}원
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(comp.name, -1)}
                            disabled={(componentQuantities[comp.name] || 0) <= 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {componentQuantities[comp.name] || 0}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(comp.name, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block font-semibold">요청사항</Label>
                  <Textarea 
                    placeholder="예: 알러지가 있으니 주의해주세요"
                    value={request}
                    onChange={(e) => setRequest(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-4 pt-4 border-t">
                  <Label className="font-semibold">총 수량</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="text-2xl font-bold text-right text-red-600">
                  합계: {calculateTotalPrice().toLocaleString()}원
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedMenu(null)}>
                  취소
                </Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={handleAddToCart}>
                  장바구니에 추가
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuCard({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <div
      className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <ImageWithFallback
        src={item.image}
        alt={item.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="mb-2">{item.name}</h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
        <p className="text-red-600">{item.price.toLocaleString()}원</p>
      </div>
    </div>
  );
}
