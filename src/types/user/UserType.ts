export type UserType = {
  id: string;
  email: string;
};

export type UserListItem = UserType & {
  createdAt: Date;
  updatedAt: Date;
};

export type UserListPagination = {
  page: number;
  perPage: number;
};

export type UserListResponse = {
  users: UserListItem[];
  pagination: UserListPagination & {
    total: number;
    totalPages: number;
  };
};
