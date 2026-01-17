import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSupabase } from '../../lib/supabase';
import { loginSchema, registerSchema } from '../../lib/forms/schemas';
import type { LoginFormData, RegisterFormData } from '../../lib/forms/schemas';
import { Mail, Lock, AlertCircle, CheckCircle2, Banknote, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';

interface AuthFormProps {
  initialIsSignUp?: boolean;
}

export function AuthForm({ initialIsSignUp = false }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    getValues
  } = useForm<LoginFormData | RegisterFormData>({
    resolver: zodResolver(isSignUp ? registerSchema : loginSchema),
    mode: 'onBlur'
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const handleEmailAuth = async (data: LoginFormData | RegisterFormData) => {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = await getSupabase();
      
      if (isSignUp) {
        const registerData = data as RegisterFormData;
        const { data: authData, error } = await supabase.auth.signUp({
          email: registerData.email,
          password: registerData.password,
        });
        if (error) throw error;
        
        if (authData.user && !authData.user.confirmed_at) {
          setMessage({
            type: 'success',
            text: '¡Registro exitoso! Por favor verifica tu email para confirmar tu cuenta.'
          });
          setIsSignUp(false);
        }
      } else {
        const loginData = data as LoginFormData;
        const { error } = await supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.error_description || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabase();
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.error_description || error.message
      });
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-12 flex items-center gap-2 text-[var(--text-primary)]">
         <Banknote className="h-6 w-6" />
         <span className="text-sm font-bold tracking-wider uppercase">Money Tracker</span>
      </div>

      <div>
        <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight">
          {isSignUp ? '¡CREA TU CUENTA!' : '¡BIENVENIDO DE NUEVO!'}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)] font-medium">
          {isSignUp ? 'Ingresa tus datos para registrarte.' : 'Inicia sesión en tu cuenta.'}
        </p>
      </div>

      {message && (
        <div className={`mt-4 rounded-lg p-4 flex items-start gap-3 ${
          message.type === 'success' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--error)]/10 text-[var(--error)]'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-6">
           <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--text-secondary)]/30" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[var(--bg-primary)] text-[var(--text-secondary)]">or</span>
            </div>
          </div>
          
          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              fullWidth
              size="md"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
              iconPosition="left"
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              Continuar con Google
            </Button>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(handleEmailAuth)}>
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-secondary)]">
                    <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  {...register('email')}
                  className="block w-full pl-11 pr-3 py-3 border-0 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--primary-focus)] sm:text-sm font-medium transition-colors"
                />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Contraseña</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-secondary)]">
                    <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="Contraseña"
                  {...register('password')}
                  className="block w-full pl-11 pr-12 py-3 border-0 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--primary-focus)] sm:text-sm font-medium transition-colors"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirmar Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-secondary)]">
                    <Lock className="h-5 w-5" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Confirmar Contraseña"
                  {...register('confirmPassword')}
                  className="block w-full pl-11 pr-12 py-3 border-0 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--primary-focus)] sm:text-sm font-medium transition-colors"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {!isSignUp && (
            <div className="flex items-center justify-end">
              <button type="button" className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {/* Form Errors */}
          {Object.keys(errors).length > 0 && (
            <div className="space-y-2">
              {Object.entries(errors).map(([fieldName, error]) => (
                <div key={fieldName} className="rounded-lg p-3 flex items-start gap-2 bg-[var(--error)]/10 text-[var(--error)]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error.message}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="md"
            >
              {loading ? 'Procesando...' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {isSignUp ? '¿Ya tienes una cuenta? ' : '¿No tienes una cuenta? '}
            <a href={isSignUp ? '/login' : '/register'} className="text-[var(--primary)] font-bold hover:text-[var(--primary-hover)]">
              {isSignUp ? 'Inicia sesión' : 'Regístrate'}
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
