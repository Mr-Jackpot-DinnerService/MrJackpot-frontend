import { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { useCart } from '../../contexts/CartContext';
import { useStock } from '../../contexts/StockContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Plus, Minus } from 'lucide-react';
import { MenuService, type MenuReference, type DinnerType } from '../../services';
import { toast } from 'sonner';
import { extractShortageInfoFromError } from '../../utils/stockUtils';
import { getDinnerImageSrc } from '../../utils/menuImages';

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
const convertDinnerTypeToMenuItem = (
  dinnerType: DinnerType,
  servingStyles: string[],
  menuReference: MenuReference | null
): MenuItem => {
  // 샴페인 축제 디너는 Simple 스타일 제외
  let availableStyles = servingStyles;
  if (dinnerType.description === '샴페인 축제 디너') {
    availableStyles = servingStyles.filter(style => style !== '심플');
  }

  const imageSrc = getDinnerImageSrc(dinnerType.code, dinnerType.imageUrl || '/placeholder-menu-image.jpg');

  return {
    id: dinnerType.code,
    name: dinnerType.description,
    description: dinnerType.description,
    price: dinnerType.price,
    image: imageSrc,
    category: 'dinner',
    options: availableStyles,
    components: dinnerType.recipe.map(comp => {
      // menuReference에서 해당 컴포넌트의 실제 가격 찾기
      const componentType = menuReference?.componentTypes.find(ct => ct.code === comp.componentCode);
      const componentPrice = componentType?.price || 0;

      return {
        name: comp.componentName,
        defaultQuantity: comp.quantity,
        price: componentPrice, // 실제 컴포넌트 가격 사용
        maxQuantity: comp.quantity + 5 // 기본 수량 + 5개까지 추가 가능
      };
    })
  };
};

export default function MenuList() {
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [componentQuantities, setComponentQuantities] = useState<Record<string, number>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuReference, setMenuReference] = useState<MenuReference | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const { addToCart } = useCart();
  const { unavailableComponents, registerShortage } = useStock();

  const componentNameToCode = useMemo(() => {
    if (!menuReference) {
      return {};
    }
    return menuReference.componentTypes.reduce<Record<string, string>>((acc, component) => {
      acc[component.description] = component.code;
      return acc;
    }, {});
  }, [menuReference]);

  const componentCodeToStock = useMemo(() => {
    if (!menuReference) {
      return {};
    }
    return menuReference.componentTypes.reduce<Record<string, number>>((acc, component) => {
      acc[component.code] = component.stock;
      return acc;
    }, {});
  }, [menuReference]);

  const selectedMenuShortageMessage = useMemo(() => {
    if (!selectedMenu) {
      return null;
    }

    // 1) 실제 재고 기반 검사
    for (const comp of selectedMenu.components) {
      const code = componentNameToCode[comp.name];
      if (!code) {
        continue;
      }
      const stockLimit = componentCodeToStock[code];
      if (typeof stockLimit === 'number') {
        const perMenuQty = componentQuantities[comp.name] ?? comp.defaultQuantity;
        const totalNeeded = perMenuQty * quantity;
        if (totalNeeded > stockLimit) {
          if (stockLimit <= 0) {
            return `${comp.name} 재고가 부족합니다. (잔여: 0개)`;
          }
          return `${comp.name}은(는) 총 ${stockLimit}개까지만 주문할 수 있습니다.`;
        }
      }
    }

    // 2) 에러 기반 (백엔드 응답) 검사 - 추가 안전장치
    for (const comp of selectedMenu.components) {
      const code = componentNameToCode[comp.name];
      if (!code) {
        continue;
      }
      const shortage = unavailableComponents[code];
      if (!shortage) {
        continue;
      }
      const currentQty = componentQuantities[comp.name] ?? comp.defaultQuantity;
      const availableQty = typeof shortage.available === 'number' ? shortage.available : null;
      if (availableQty === null) {
        continue;
      }
      const totalNeeded = currentQty * quantity;
      if (totalNeeded > availableQty) {
        if (availableQty <= 0) {
          return shortage.label || `${shortage.displayName}의 재고가 부족합니다.`;
        }
        return `${shortage.displayName}은(는) 최대 ${availableQty}개까지 선택할 수 있습니다.`;
      }
    }

    return null;
  }, [selectedMenu, componentNameToCode, componentCodeToStock, componentQuantities, quantity, unavailableComponents]);

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
          convertDinnerTypeToMenuItem(dinnerType, servingStyleOptions, menuRef)
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
    // 샴페인 축제 디너의 경우 그랜드를 기본으로, 그 외에는 첫 번째 옵션을 기본으로
    let defaultOption = menu.options[0];
    if (menu.name === '샴페인 축제 디너' && menu.options.includes('그랜드')) {
      defaultOption = '그랜드';
    }
    setSelectedOptions(menu.options.length > 0 ? [defaultOption] : []);
    setQuantity(1);
  };

  const handleQuantityChange = (componentName: string, change: number) => {
    setComponentQuantities(prev => {
      const current = prev[componentName] || 0;
      const newValue = Math.max(0, current + change);
      return { ...prev, [componentName]: newValue };
    });
  };

  // 모든 구성이 0인지 확인하는 함수
  const isAllComponentsZero = () => {
    if (!selectedMenu) return false;
    return selectedMenu.components.every(comp => {
      const currentQty = componentQuantities[comp.name] !== undefined ? componentQuantities[comp.name] : comp.defaultQuantity;
      return currentQty === 0;
    });
  };

  const calculateTotalPrice = () => {
    if (!selectedMenu || !menuReference) return 0;

    // 모든 구성이 0이면 0 반환
    if (isAllComponentsZero()) return 0;

    // 기본 디너 가격
    let total = selectedMenu.price;

    // 서빙 스타일 추가 요금
    if (selectedOptions.length > 0) {
      const selectedServingStyle = selectedOptions[0];
      const servingStylePrice = MenuService.calculateServingStylePrice(
        menuReference.servingStyles.find(s => s.description === selectedServingStyle)?.code || '',
        menuReference,
        selectedMenu.name
      );
      total += servingStylePrice;
    }

    // 재료 변경 추가 요금
    const modifications: Record<string, number> = {};
    selectedMenu.components.forEach(comp => {
      const currentQty = componentQuantities[comp.name] !== undefined ? componentQuantities[comp.name] : comp.defaultQuantity;
      const diff = currentQty - comp.defaultQuantity;
      if (diff !== 0) {
        // 컴포넌트 코드 찾기 - 여기서는 여전히 차이값 사용 (가격 계산용)
        const componentType = menuReference.componentTypes.find(ct => ct.description === comp.name);
        if (componentType) {
          modifications[componentType.code] = diff;
        }
      }
    });

    const modificationPrice = MenuService.calculateComponentModificationPrice(modifications, menuReference, selectedMenu.price);
    total += modificationPrice;

    // 음수 방지 - 최소 0원
    const finalPrice = Math.max(0, total * quantity);

    // 100원 단위로 반올림
    return Math.round(finalPrice / 100) * 100;
  };

  const handleAddToCart = async () => {
    if (selectedMenu && menuReference && !addingToCart) {
      setAddingToCart(true);
      // 구성 변경 내용 정리
      const modifications: Record<string, number> = {};

      selectedMenu.components.forEach(comp => {
        const currentQty = componentQuantities[comp.name] !== undefined ? componentQuantities[comp.name] : comp.defaultQuantity;
        const componentType = menuReference.componentTypes.find(ct => ct.description === comp.name);
        if (componentType) {
          // 절대 수량을 전송 (차이값이 아닌)
          console.log(`컴포넌트: ${comp.name} -> 코드: ${componentType.code}, 현재 수량: ${currentQty} (기본: ${comp.defaultQuantity})`);
          modifications[componentType.code] = currentQty;
        }
      });

      // 서빙 스타일 코드 찾기
      const servingStyleCode = selectedOptions.length > 0 ?
        menuReference.servingStyles.find(s => s.description === selectedOptions[0])?.code || '' :
        menuReference.servingStyles[0]?.code || '';

      // 반올림된 총 가격 계산
      const roundedTotalPrice = calculateTotalPrice();
      const unitPrice = Math.round(roundedTotalPrice / quantity / 100) * 100; // 단위 가격도 100원 단위로 반올림

      try {
        await addToCart({
          menuId: selectedMenu.id,
          name: selectedMenu.name,
          price: unitPrice,
          quantity,
          options: selectedOptions,
          image: selectedMenu.image,
          // API 연결을 위한 추가 정보
          dinnerType: selectedMenu.id,
          servingStyle: servingStyleCode,
          componentModifications: modifications,
        });

        toast.success('장바구니에 추가되었습니다.');
        setSelectedMenu(null);
      } catch (error) {
        console.error('장바구니 추가 중 오류:', error);
        let message = '장바구니 추가에 실패했습니다.';
        if (typeof error?.response === 'string' && error.response) {
          try {
            const parsed = JSON.parse(error.response);
            message = parsed?.message || error.response;
          } catch {
            message = error.response;
          }
        } else if (error?.message) {
          message = error.message;
        }
        const shortageInfo = extractShortageInfoFromError(error) || extractShortageInfoFromError({ response: message });
        if (shortageInfo) {
          message = shortageInfo.label;
          registerShortage(shortageInfo);
        }
        toast.error(message);
      } finally {
        setAddingToCart(false);
      }
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
                      {selectedMenu.options.map(option => {
                        // 샴페인 축제 디너에서 심플 옵션 숨기기
                        if (selectedMenu.name === '샴페인 축제 디너' && option === '심플') {
                          return null;
                        }

                        return (
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
                        );
                      })}
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
                  합계: {isAllComponentsZero() ? '-원' : `${calculateTotalPrice().toLocaleString()}원`}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedMenu(null)}>
                  취소
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleAddToCart}
                  disabled={isAllComponentsZero() || addingToCart || !!selectedMenuShortageMessage}
                >
                  {selectedMenuShortageMessage || (addingToCart ? '추가 중...' : '장바구니에 추가')}
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
