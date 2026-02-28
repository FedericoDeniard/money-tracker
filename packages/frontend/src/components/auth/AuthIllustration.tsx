import logo from '../../logo.svg';
import { DecorativeSquare } from '../ui/DecorativeSquare';

export function AuthIllustration() {
  return (
    <div className="hidden lg:block relative w-0 flex-1 bg-[var(--primary)]">
      <div className="absolute inset-0 flex items-center justify-center p-20">
           <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
              {/* Decorative background shape - Rotated square */}
              <DecorativeSquare size={400} className="absolute inset-0 m-auto" />
               
               {/* Logo Content */}
               <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                  <img 
                      src={logo}
                      alt="Money Tracker Logo" 
                      className="w-3/5 h-3/5 drop-shadow-2xl opacity-90 object-contain"
                  />
               </div>
           </div>
      </div>
    </div>
  );
}
