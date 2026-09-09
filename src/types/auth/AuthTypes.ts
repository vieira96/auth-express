export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
};

export type RegisterResponse = {
  user: AuthUser;
};

export type AuthenticatedUser = AuthUser & {
  roles: RoleType[];
};

export type AuthResponse = {
  token: string;
  user: AuthenticatedUser;
};
import type { RoleType } from '@/types/role/RoleType.js';
