import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { DecorativeSquare } from '../components/ui/DecorativeSquare';
import { Button } from '../components/ui/Button';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <DecorativeSquare size={128} className="absolute inset-0" />
            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <span className="text-5xl font-bold text-[var(--primary)]">404</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Página no encontrada
          </h1>
          <p className="text-[var(--text-secondary)] mb-8">
            La página que estás buscando no existe o ha sido movida.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <Button
            variant="secondary"
            icon={<ArrowLeft size={20} />}
            iconPosition="left"
            onClick={() => navigate(-1)}
          >
            Volver atrás
          </Button>
          
          <Button
            icon={<Home size={20} />}
            iconPosition="left"
            onClick={() => navigate('/')}
          >
            Ir al Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
