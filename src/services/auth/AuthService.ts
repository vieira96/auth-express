import { loginSchema, registerSchema } from '@/validators/auth/auth.schema.js';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '@/config/prisma.js';
import { AppError } from '@/errors/AppError.js';
import { LoginAttemptService } from '@/services/auth/LoginAttemptService.js';
import type {
  AuthenticatedUser,
  AuthCredentials,
  AuthResponse,
  RegisterResponse,
} from '@/types/auth/AuthTypes.js';

import type { RoleType } from '@/types/role/RoleType.js';
import type { UserType } from '@/types/user/UserType.js';
  
class AuthService {
  private readonly loginAttemptService = new LoginAttemptService();

  async register(input: AuthCredentials): Promise<RegisterResponse> {
    const payload = registerSchema.parse(input);

    const existingUser = await prisma.user.findUnique({ where: { email: payload.email } });

    if (existingUser) {
      throw new AppError(409, 'Este e-mail ja esta em uso.');
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
        roles: {
          create: {
            role: {
              connect: { name: 'user' },
            },
          },
        },
      },
    });

    return { user: this.toAuthUser(user) };
  }

  async login(input: AuthCredentials, ip: string): Promise<AuthResponse> {
    const payload = loginSchema.parse(input);

    await this.loginAttemptService.ensureAllowed(ip);

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || !(await bcrypt.compare(payload.password, user.passwordHash))) {
      await this.loginAttemptService.registerFailure(ip);
      throw new AppError(401, 'E-mail e/ou senha invalidos.');
    }

    await this.loginAttemptService.clear(ip);

    return this.createAuthResponse(user);
  }

  private createAuthResponse(user: { id: string; email: string; roles: { role: RoleType }[] }): AuthResponse {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET nao foi definida.');
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, secret, {
      expiresIn: '7d',
    });

    return {
      token,
      user: this.toAuthenticatedUser(user),
    };
  }

  private toAuthUser(user: UserType) {
    return { id: user.id, email: user.email };
  }

  private toAuthenticatedUser(user: { id: string; email: string; roles: { role: RoleType }[] }): AuthenticatedUser {
    return {
      ...this.toAuthUser(user),
      roles: user.roles.map(({ role }) => role),
    };
  }
}

export { AuthService };
