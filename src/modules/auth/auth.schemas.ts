import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(4, 'Senha deve ter pelo menos 4 caracteres'),
  teamSlug: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  teamSlug: z.string().optional(),
})

export const googleLoginSchema = z.object({
  idToken: z.string().min(1),
  teamSlug: z.string().optional(),
})
