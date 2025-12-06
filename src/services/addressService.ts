import { apiClient } from './api';
import type { UserAddress, AddressRequest, UpdateAddressRequest } from './types';

class AddressService {
  static async getAddresses(): Promise<UserAddress[]> {
    return apiClient.get<UserAddress[]>('/users/addresses');
  }

  static async addAddress(data: AddressRequest): Promise<void> {
    await apiClient.post<void>('/users/addresses', data);
  }

  static async deleteAddress(addressId: number): Promise<void> {
    await apiClient.delete<void>(`/users/addresses/${addressId}`);
  }

  static async updateAddress(addressId: number, data: UpdateAddressRequest): Promise<void> {
    await apiClient.put<void>(`/users/addresses/${addressId}`, data);
  }

  static async setDefaultAddress(addressId: number): Promise<void> {
    await apiClient.put<void>(`/users/addresses/${addressId}/default`);
  }
}

export default AddressService;
