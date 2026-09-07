import { describe, expect, it } from 'vitest';

import { registerSchema } from '../../src/validators/auth/auth.schema.js';

describe('registerSchema', () => {
  it('aceita credenciais validas e normaliza o e-mail', () => {
    const result = registerSchema.safeParse({
      email: '  ANA@EXEMPLO.COM  ',
      password: 'Senha123!',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({
        email: 'ana@exemplo.com',
        password: 'Senha123!',
      });
    }
  });

  it('recusa um e-mail invalido', () => {
    const result = registerSchema.safeParse({
      email: 'nao-e-um-email',
      password: 'Senha123!',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: 'E-mail invalido.',
          }),
        ]),
      );
    }
  });
});
