declare global {
  namespace Express {
    interface Request {
      authenticatedUserId?: string;
    }
  }
}

export {};
