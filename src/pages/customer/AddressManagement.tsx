import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Trash2, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { useAuth } from '../../contexts/AuthContext';
import { AddressService, type UserAddress } from '../../services';
import { toast } from 'sonner';

const initialFormState = {
  name: '',
  address: '',
  setAsDefault: false,
};

export default function AddressManagement() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionTarget, setActionTarget] = useState<number | null>(null);
  const [newAddress, setNewAddress] = useState(initialFormState);
  const resetForm = () => setNewAddress(initialFormState);

  const loadAddresses = useCallback(async () => {
    try {
      const data = await AddressService.getAddresses();
      setAddresses(data);
      return data;
    } catch (error) {
      console.error('배송지 조회 실패:', error);
      toast.error('배송지를 불러오는데 실패했습니다.');
      return [];
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    loadAddresses()
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadAddresses]);

  const handleSetDefault = async (address: UserAddress) => {
    try {
      setActionTarget(address.id);
      await AddressService.setDefaultAddress(address.id);
      toast.success('기본 배송지가 변경되었습니다.');
      const updated = await loadAddresses();
      const currentDefault = updated.find(addr => addr.isDefault);
      if (currentDefault) {
        await updateProfile({ address: currentDefault.address });
      }
    } catch (error) {
      console.error('기본 배송지 설정 실패:', error);
      toast.error('기본 배송지 설정에 실패했습니다.');
    } finally {
      setActionTarget(null);
    }
  };

  const handleDelete = async (address: UserAddress) => {
    if (address.isDefault) {
      toast.error('기본 배송지는 삭제할 수 없습니다.');
      return;
    }
    try {
      setActionTarget(address.id);
      await AddressService.deleteAddress(address.id);
      toast.success('배송지가 삭제되었습니다.');
      await loadAddresses();
    } catch (error) {
      console.error('배송지 삭제 실패:', error);
      toast.error('배송지 삭제에 실패했습니다.');
    } finally {
      setActionTarget(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAddress.name.trim() || !newAddress.address.trim()) {
      toast.error('배송지 이름과 주소를 입력해주세요.');
      return;
    }

    const isEditingDefault = editingAddress?.isDefault ?? false;
    const shouldSetDefault = !isEditingDefault && (
      newAddress.setAsDefault ||
      (!editingAddress && addresses.length === 0)
    );

    try {
      setSubmitting(true);
      if (editingAddress) {
        await AddressService.updateAddress(editingAddress.id, {
          addressName: newAddress.name.trim(),
          address: newAddress.address.trim(),
        });
        if (shouldSetDefault) {
          await AddressService.setDefaultAddress(editingAddress.id);
        }
        toast.success('배송지가 수정되었습니다.');
      } else {
        await AddressService.addAddress({
          addressName: newAddress.name.trim(),
          address: newAddress.address.trim(),
          isDefault: shouldSetDefault,
        });
        toast.success('배송지가 추가되었습니다.');
      }

      const updated = await loadAddresses();
      if (shouldSetDefault) {
        const currentDefault = updated.find(addr => addr.isDefault);
        if (currentDefault) {
          await updateProfile({ address: currentDefault.address });
        }
      }
      handleCancelForm();
    } catch (error) {
      console.error('배송지 저장 실패:', error);
      toast.error('배송지 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const defaultAddress = addresses.find(a => a.isDefault) || null;
  const otherAddresses = addresses.filter(a => !a.isDefault);

  const handleCancelForm = () => {
    resetForm();
    setIsAdding(false);
    setEditingAddress(null);
  };

  const openEditForm = (address: UserAddress) => {
    setEditingAddress(address);
    setIsAdding(false);
    setNewAddress({
      name: address.addressName,
      address: address.address,
      setAsDefault: false,
    });
  };

  const openAddForm = () => {
    setEditingAddress(null);
    resetForm();
    setIsAdding(true);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl mb-4">배송지 관리</h1>
        <p className="text-gray-600">배송지를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-3xl font-bold">배송지 관리</h1>
      </div>

      {!(isAdding || editingAddress) ? (
        <div className="space-y-8">
          {/* Default Address Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">기본 배송지</h2>
            {defaultAddress ? (
              <Card className="p-6 border-red-200 bg-red-50">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg">{defaultAddress.addressName}</span>
                      <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">기본</span>
                    </div>
                    <p className="text-gray-800">{defaultAddress.address}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditForm(defaultAddress)}
                      className="text-sm"
                    >
                      수정
                    </Button>
                  </div>
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
              <Button onClick={openAddForm} className="flex items-center gap-2">
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
                        <div className="font-bold text-lg mb-2">{addr.addressName}</div>
                        <p className="text-gray-800 mb-4">{addr.address}</p>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditForm(addr)}
                            className="text-sm"
                          >
                            수정
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSetDefault(addr)}
                            className="text-sm"
                            disabled={actionTarget === addr.id}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            기본 배송지로 설정
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(addr)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            disabled={actionTarget === addr.id}
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
          <h2 className="text-2xl font-bold mb-6">{editingAddress ? '배송지 수정' : '새 배송지 추가'}</h2>
          <form onSubmit={handleFormSubmit} className="space-y-6">
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
            
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                required
                value={newAddress.address}
                onChange={e => setNewAddress({...newAddress, address: e.target.value})}
                placeholder="주소를 입력하세요"
              />
            </div>

            {(!(editingAddress && editingAddress.isDefault)) && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="setAsDefault"
                  checked={newAddress.setAsDefault}
                  onCheckedChange={checked => setNewAddress({
                    ...newAddress,
                    setAsDefault: checked === true,
                  })}
                />
                <Label htmlFor="setAsDefault" className="text-sm text-gray-600 cursor-pointer">
                  이 주소를 기본 배송지로 설정
                </Label>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCancelForm}
              >
                취소
              </Button>
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700" disabled={submitting}>
                {submitting ? '저장 중...' : (editingAddress ? '수정 완료' : '저장하기')}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
