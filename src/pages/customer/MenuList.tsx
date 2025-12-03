import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { useCart } from '../../contexts/CartContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Textarea } from '../../components/ui/textarea';
import { Plus, Minus } from 'lucide-react';
import { MenuService, type MenuReference, type DinnerType } from '../../services';
import { toast } from 'sonner';

// 로컬에서 사용할 MenuItem 인터페이스 (백엔드 DinnerType과 매핑)
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  options: string[];
  components: Array<{
    name: string;
    defaultQuantity: number;
    price: number;
    maxQuantity?: number;
  }>;
}

// 백엔드 DinnerType을 MenuItem으로 변환하는 함수
const convertDinnerTypeToMenuItem = (dinnerType: DinnerType, servingStyles: string[]): MenuItem => {
  return {
    id: dinnerType.code,
    name: dinnerType.description,
    description: dinnerType.description,
    price: dinnerType.price,
    image: dinnerType.imageUrl || '/placeholder-menu-image.jpg',
    category: 'dinner',
    options: servingStyles,
    components: dinnerType.recipe.map(comp => ({
      name: comp.componentName,
      defaultQuantity: comp.quantity,
      price: 0, // 기본 레시피는 추가 요금 없음
      maxQuantity: comp.quantity + 5 // 기본 수량 + 5개까지 추가 가능
    }))
  };
};

export default function MenuList() {
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [request, setRequest] = useState('');
  const [componentQuantities, setComponentQuantities] = useState<Record<string, number>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuReference, setMenuReference] = useState<MenuReference | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  // 메뉴 데이터 로드
  useEffect(() => {
    const loadMenuData = async () => {
      try {
        setLoading(true);
        const menuRef = await MenuService.getMenuReferences();
        setMenuReference(menuRef);

        // 서빙 스타일 옵션 추출
        const servingStyleOptions = menuRef.servingStyles.map(style => style.description);

        // DinnerType을 MenuItem으로 변환
        const convertedMenuItems = menuRef.dinnerTypes.map(dinnerType =>
          convertDinnerTypeToMenuItem(dinnerType, servingStyleOptions)
        );

        setMenuItems(convertedMenuItems);
      } catch (error) {
        console.error('Failed to load menu data:', error);
        toast.error('메뉴 데이터를 불러오는데 실패했습니다.');

        // 실패시 빈 배열로 설정
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadMenuData();
  }, []);

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
    if (!selectedMenu || !menuReference) return 0;

    // 기본 디너 가격
    let total = selectedMenu.price;

    // 서빙 스타일 추가 요금
    if (selectedOptions.length > 0) {
      const selectedServingStyle = selectedOptions[0];
      const servingStylePrice = MenuService.calculateServingStylePrice(
        menuReference.servingStyles.find(s => s.description === selectedServingStyle)?.code || '',
        menuReference
      );
      total += servingStylePrice;
    }

    // 재료 변경 추가 요금
    const modifications: Record<string, number> = {};
    selectedMenu.components.forEach(comp => {
      const currentQty = componentQuantities[comp.name] || comp.defaultQuantity;
      const diff = currentQty - comp.defaultQuantity;
      if (diff !== 0) {
        // 컴포넌트 코드 찾기
        const componentType = menuReference.componentTypes.find(ct => ct.description === comp.name);
        if (componentType) {
          modifications[componentType.code] = diff;
        }
      }
    });

    const modificationPrice = MenuService.calculateComponentModificationPrice(modifications, menuReference);
    total += modificationPrice;

    return total * quantity;
  };

  const handleAddToCart = () => {
    if (selectedMenu && menuReference) {
      // 구성 변경 내용 정리
      const modifications: Record<string, number> = {};
      const changes: string[] = [];

      selectedMenu.components.forEach(comp => {
        const currentQty = componentQuantities[comp.name] || comp.defaultQuantity;
        const diff = currentQty - comp.defaultQuantity;
        if (diff !== 0) {
          const componentType = menuReference.componentTypes.find(ct => ct.description === comp.name);
          if (componentType) {
            modifications[componentType.code] = diff;
          }
          changes.push(`${comp.name}: ${currentQty}개 (기본 ${comp.defaultQuantity}개)`);
        }
      });

      const changesText = changes.length > 0 ? `[구성 변경] ${changes.join(', ')}` : '';
      const fullRequest = [changesText, request].filter(Boolean).join('\n');

      // 서빙 스타일 코드 찾기
      const servingStyleCode = selectedOptions.length > 0 ?
        menuReference.servingStyles.find(s => s.description === selectedOptions[0])?.code || '' :
        menuReference.servingStyles[0]?.code || '';

      addToCart({
        menuId: selectedMenu.id,
        name: selectedMenu.name,
        price: calculateTotalPrice() / quantity,
        quantity,
        options: selectedOptions,
        image: selectedMenu.image,
        request: fullRequest.trim() || undefined,
        // API 연결을 위한 추가 정보
        dinnerType: selectedMenu.id,
        servingStyle: servingStyleCode,
        componentModifications: modifications,
      });

      toast.success('장바구니에 추가되었습니다.');
      setSelectedMenu(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">메뉴</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">메뉴를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">메뉴</h1>

      {menuItems.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">등록된 메뉴가 없습니다.</div>
        </div>
      ) : (
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
      )}

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
