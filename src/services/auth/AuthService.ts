import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '@/config/prisma.js';
import { AppError } from '@/errors/AppError.js';
import type {
  AuthCredentials,
  AuthResponse,
  RegisterResponse,
} from '@/types/auth/AuthTypes.js';

class AuthService {
  async register({ email, password }: AuthCredentials): Promise<RegisterResponse> {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new AppError(409, 'Este e-mail ja esta em uso.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    return { user: this.toAuthUser(user) };
  }

  async login({ email, password }: AuthCredentials): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, 'E-mail ou senha invalidos.');
    }

    return this.createAuthResponse(user);
  }

  private createAuthResponse(user: { id: string; email: string }): AuthResponse {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET nao foi definida.');
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, secret, {
      expiresIn: '7d',
    });

    return {
      token,
      user: this.toAuthUser(user),
    };
  }

  private toAuthUser(user: { id: string; email: string }) {
    return { id: user.id, email: user.email };
  }
}

export { AuthService };
