import { useState, useEffect } from 'react';
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
import { StaffService, type StockResponse } from '../../services';
import { toast } from 'sonner';

export default function InventoryList() {
  const [inventory, setInventory] = useState<StockResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<StockResponse | null>(null);
  const [editQuantity, setEditQuantity] = useState('');

  // 재고 목록 로드
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoading(true);
        const stockData = await StaffService.getAllStocks();
        setInventory(stockData);
        console.log('Staff 재고 목록:', stockData);
      } catch (error) {
        console.error('재고 목록 로드 실패:', error);
        toast.error('재고 목록을 불러오는데 실패했습니다.');
        // 에러 발생시 빈 배열로 설정
        setInventory([]);
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, []);

  const handleEdit = (item: StockResponse) => {
    setEditingItem(item);
    setEditQuantity(item.quantity.toString());
  };

  const handleSave = async () => {
    if (editingItem && editQuantity.trim()) {
      try {
        const newQuantity = parseInt(editQuantity);
        await StaffService.updateStock(editingItem.componentCode, newQuantity);

        // 로컬 상태 업데이트
        setInventory(prev =>
          prev.map(item =>
            item.componentCode === editingItem.componentCode
              ? { ...item, quantity: newQuantity }
              : item
          )
        );

        setEditingItem(null);
        toast.success('재고가 업데이트되었습니다.');
      } catch (error) {
        console.error('재고 업데이트 실패:', error);
        toast.error('재고 업데이트에 실패했습니다.');
      }
    }
  };

  const lowStockItems = StaffService.getLowStockItems(inventory, 10);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl mb-8">재고 관리</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">재고 목록을 불러오는 중...</div>
        </div>
      </div>
    );
  }

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
              <Badge key={item.componentCode} variant="outline" className="bg-white">
                {item.componentName} ({item.quantity}개)
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {inventory.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">재고 데이터가 없습니다.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map(item => {
            const isLowStock = StaffService.getStockStatus(item.quantity, 10) === 'low';

            return (
              <Card
                key={item.componentCode}
                className={`p-6 ${isLowStock ? 'border-red-300 border-2' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="mb-1">{item.componentName}</h3>
                    <Badge variant="outline" className="text-xs">
                      {item.componentCode}
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
                      {item.quantity} 개
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">최소 재고</span>
                    <span className="text-sm">10 개</span>
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
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          {editingItem && (
            <>
              <DialogHeader>
                <DialogTitle>{editingItem.componentName} 재고 수정</DialogTitle>
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
                    <span>개</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">현재 재고</p>
                  <p className="text-xl">
                    {editingItem.quantity} 개
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">최소 재고</p>
                  <p className="text-xl">10 개</p>
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
