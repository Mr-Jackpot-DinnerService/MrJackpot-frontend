import { apiClient } from './api';
import type { UpdateUserProfileRequest, UserProfile, ChangePasswordRequest } from './types';

export class UserService {
  static async updateProfile(data: UpdateUserProfileRequest): Promise<UserProfile> {
    return apiClient.put<UserProfile>('/users/me', data);
  }

  static async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post<void>('/users/me/password', data);
  }
}

export default UserService;
