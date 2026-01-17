import logo from '../../logo.svg';
import { DecorativeSquare } from '../ui/DecorativeSquare';

export function AuthIllustration() {
  return (
    <div className="hidden lg:block relative w-0 flex-1 bg-[var(--primary)]">
      <div className="absolute inset-0 flex items-center justify-center p-20">
           <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
              {/* Decorative background shape - Rotated square */}
              <DecorativeSquare size={100} className="absolute" />
               
               {/* Logo Content */}
               <div className="relative z-10 flex flex-col items-center justify-center">
                  <img 
                      src={logo}
                      alt="Money Tracker Logo" 
                      className="w-64 h-64 drop-shadow-2xl opacity-90"
                  />
               </div>
           </div>
      </div>
    </div>
  );
}
