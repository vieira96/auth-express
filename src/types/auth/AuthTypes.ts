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

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
