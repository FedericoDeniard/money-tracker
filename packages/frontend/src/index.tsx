import { serve } from "bun";
import index from "./index.html";

// Log environment variables on startup
console.log('Environment variables loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓' : '✗');
console.log('Using direct Supabase Edge Functions (no backend dependency)');

const server = serve({
  port: process.env.PORT || 3000,
  hostname: '0.0.0.0', // Listen on all network interfaces for Railway
  
  routes: {
    // Serve index.html for all routes (SPA)
    "/*": index,
  },

  // Remove /api/config route - no backend dependency
  // Configuration is now handled directly in config.ts

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
