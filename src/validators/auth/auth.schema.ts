import { z } from 'zod';

const credentialsSchema = z.object({
  email: z
    .string({ error: 'E-mail e obrigatorio.' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'E-mail invalido.' })),
  password: z
    .string({ error: 'Senha e obrigatoria.' })
    .min(8, { error: 'Senha deve ter pelo menos 8 caracteres.' })
    .max(30, { error: 'Senha deve ter no maximo 30 caracteres.' }),
});

const registerSchema = credentialsSchema;
const loginSchema = credentialsSchema;

export { loginSchema, registerSchema };
