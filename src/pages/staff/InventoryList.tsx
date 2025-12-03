import { useState } from 'react';
import { Edit, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  lastUpdated: string;
}

const mockInventory: InventoryItem[] = [
  { id: 'test-inv-001', name: '[테스트] 가상 재료 A', category: '테스트', quantity: 999, unit: '개', minQuantity: 100, lastUpdated: '9999-99-99 99:99' },
  { id: 'test-inv-002', name: '[테스트] 가상 재료 B', category: '테스트', quantity: 10, unit: 'kg', minQuantity: 50, lastUpdated: '9999-99-99 99:99' },
  { id: 'test-inv-003', name: '[테스트] 가상 재료 C', category: '테스트', quantity: 5, unit: '병', minQuantity: 20, lastUpdated: '9999-99-99 99:99' },
];

export default function InventoryList() {
  const [inventory, setInventory] = useState(mockInventory);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editQuantity, setEditQuantity] = useState('');

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditQuantity(item.quantity.toString());
  };

  const handleSave = () => {
    if (editingItem) {
      setInventory(prev =>
        prev.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                quantity: parseInt(editQuantity),
                lastUpdated: new Date().toLocaleString('ko-KR'),
              }
            : item
        )
      );
      setEditingItem(null);
    }
  };

  const lowStockItems = inventory.filter(item => item.quantity < item.minQuantity);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl">재고 관리</h1>
        {lowStockItems.length > 0 && (
          <Badge className="bg-red-100 text-red-800 px-4 py-2">
            <AlertTriangle className="h-4 w-4 mr-2" />
            부족한 재고: {lowStockItems.length}개
          </Badge>
        )}
      </div>

      {lowStockItems.length > 0 && (
        <Card className="p-4 mb-6 border-red-200 bg-red-50">
          <p className="text-sm mb-2">⚠️ 재고가 부족한 항목</p>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(item => (
              <Badge key={item.id} variant="outline" className="bg-white">
                {item.name} ({item.quantity}{item.unit})
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map(item => {
          const isLowStock = item.quantity < item.minQuantity;

          return (
            <Card
              key={item.id}
              className={`p-6 ${isLowStock ? 'border-red-300 border-2' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="mb-1">{item.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(item)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">현재 재고</span>
                  <span className={`text-xl ${isLowStock ? 'text-red-600' : ''}`}>
                    {item.quantity} {item.unit}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">최소 재고</span>
                  <span className="text-sm">
                    {item.minQuantity} {item.unit}
                  </span>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    마지막 업데이트: {item.lastUpdated}
                  </p>
                </div>

                {isLowStock && (
                  <div className="bg-red-50 text-red-800 text-sm p-2 rounded">
                    ⚠️ 재고 부족
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          {editingItem && (
            <>
              <DialogHeader>
                <DialogTitle>{editingItem.name} 재고 수정</DialogTitle>
                <DialogDescription>
                  현재 재고 수량을 수정합니다.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="quantity">재고 수량</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="quantity"
                      type="number"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      className="flex-1"
                    />
                    <span>{editingItem.unit}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">현재 재고</p>
                  <p className="text-xl">
                    {editingItem.quantity} {editingItem.unit}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">최소 재고</p>
                  <p className="text-xl">
                    {editingItem.minQuantity} {editingItem.unit}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  취소
                </Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={handleSave}>
                  저장
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
