interface ValidationRule {
  required?: boolean;
  minLength?: number;
  pattern?: RegExp;
  custom?: (
    value: string,
    formData?: { [key: string]: string }
  ) => string | null;
}

interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

interface ValidationResult {
  isValid: boolean;
  errors: { [fieldName: string]: string };
}

export class FormValidator {
  private rules: ValidationRules;

  constructor(rules: ValidationRules) {
    this.rules = rules;
  }

  validate(formData: { [key: string]: string }): ValidationResult {
    const errors: { [fieldName: string]: string } = {};

    for (const [fieldName, value] of Object.entries(formData)) {
      const fieldRules = this.rules[fieldName];
      if (!fieldRules) continue;

      // Check if required and empty
      if (fieldRules.required && !value.trim()) {
        errors[fieldName] =
          `El campo ${this.getFieldDisplayName(fieldName)} no puede estar vacío`;
        continue;
      }

      // Skip other validations if field is empty (unless required)
      if (!value.trim()) continue;

      // Check minimum length
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        errors[fieldName] =
          `El campo ${this.getFieldDisplayName(fieldName)} debe tener al menos ${fieldRules.minLength} caracteres`;
        continue;
      }

      // Check pattern
      if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
        const patternMessage = this.getPatternMessage(
          fieldName,
          fieldRules.pattern
        );
        errors[fieldName] = patternMessage;
        continue;
      }

      // Custom validation
      if (fieldRules.custom) {
        const customError = fieldRules.custom(value, formData);
        if (customError) {
          errors[fieldName] = customError;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      email: "email",
      password: "contraseña",
      confirmPassword: "confirmar contraseña",
      firstName: "nombre",
      lastName: "apellido",
      phone: "teléfono",
      address: "dirección",
    };

    return displayNames[fieldName] || fieldName;
  }

  private getPatternMessage(fieldName: string, pattern: RegExp): string {
    const field = this.getFieldDisplayName(fieldName);

    // Email pattern
    if (pattern.toString() === /^[^\s@]+@[^\s@]+\.[^\s@]+$/.toString()) {
      return `El ${field} no es válido`;
    }

    if (fieldName === "password") {
      return `La ${field} debe tener: mínimo 8 caracteres, 1 número o símbolo, 1 mayúscula`;
    }

    return `El campo ${field} no cumple el formato requerido`;
  }

  // Predefined validation rule sets
  static getAuthRules(isSignUp: boolean = false): ValidationRules {
    const baseRules: ValidationRules = {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      password: {
        required: true,
        custom: (value: string) => {
          if (!isSignUp) return null; // Skip validation for login

          const minLength = value.length >= 8;
          const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(value);
          const hasUpperCase = /[A-Z]/.test(value);

          if (!minLength || !hasNumberOrSymbol || !hasUpperCase) {
            return "La contraseña debe tener: mínimo 8 caracteres, 1 número o símbolo, 1 mayúscula";
          }

          return null;
        },
      },
    };

    if (isSignUp) {
      baseRules.confirmPassword = {
        required: true,
        custom: (value: string, formData?: { [key: string]: string }) => {
          if (formData?.password !== value) {
            return "Las contraseñas no coinciden";
          }
          return null;
        },
      };
    }

    return baseRules;
  }
}
