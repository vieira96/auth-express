import type { PaginationMetadata } from '@/types/global/PaginationType.js';
import type { RoleType } from '@/types/role/RoleType.js';

export type UserType = {
  id: string;
  email: string;
};

export type UserListItem = UserType & {
  createdAt: Date;
  updatedAt: Date;
  roles: RoleType[];
};

export type UserListResponse = {
  users: UserListItem[];
  pagination: PaginationMetadata;
};
