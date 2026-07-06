import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El campo email no puede estar vacío")
    .email("El email no es válido"),
  password: z.string().min(1, "El campo contraseña no puede estar vacío"),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "El campo email no puede estar vacío")
      .email("El email no es válido"),
    password: z
      .string()
      .min(1, "El campo contraseña no puede estar vacío")
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(
        /[0-9!@#$%^&*(),.?":{}|<>]/,
        "La contraseña debe tener al menos 1 número o símbolo"
      )
      .regex(/[A-Z]/, "La contraseña debe tener al menos 1 mayúscula"),
    confirmPassword: z
      .string()
      .min(1, "El campo confirmar contraseña no puede estar vacío"),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const reportSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "El título es obligatorio")
      .max(120, "El título debe tener 120 caracteres o menos"),
    description: z
      .string()
      .max(2000, "La descripción debe tener 2000 caracteres o menos")
      .optional()
      .or(z.literal("")),
    dateRangeStart: z
      .string()
      .regex(isoDateRegex, "Fecha inválida")
      .optional()
      .or(z.literal("")),
    dateRangeEnd: z
      .string()
      .regex(isoDateRegex, "Fecha inválida")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    data =>
      !data.dateRangeStart ||
      !data.dateRangeEnd ||
      data.dateRangeEnd >= data.dateRangeStart,
    {
      message:
        "La fecha de fin debe ser igual o posterior a la fecha de inicio",
      path: ["dateRangeEnd"],
    }
  );

export type ReportFormData = z.infer<typeof reportSchema>;
