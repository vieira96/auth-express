export type Pagination = {
  page: number;
  perPage: number;
};

export type PaginationMetadata = Pagination & {
  total: number;
  totalPages: number;
};
