import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'El campo email no puede estar vacío').email('El email no es válido'),
  password: z.string().min(1, 'El campo contraseña no puede estar vacío')
});

export const registerSchema = z.object({
  email: z.string().min(1, 'El campo email no puede estar vacío').email('El email no es válido'),
  password: z.string()
    .min(1, 'El campo contraseña no puede estar vacío')
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[0-9!@#$%^&*(),.?":{}|<>]/, 'La contraseña debe tener al menos 1 número o símbolo')
    .regex(/[A-Z]/, 'La contraseña debe tener al menos 1 mayúscula'),
  confirmPassword: z.string().min(1, 'El campo confirmar contraseña no puede estar vacío')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
