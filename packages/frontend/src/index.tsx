import { serve } from "bun";
import index from "./index.html";

// Log environment variables on startup
console.log('Environment variables loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓' : '✗');

const server = serve({
  routes: {
    // API endpoint to expose public config
    "/api/config": () => {
      const config = {
        supabase: {
          url: process.env.SUPABASE_URL,
          anonKey: process.env.SUPABASE_ANON_KEY,
        },
      };
      
      if (!config.supabase.url || !config.supabase.anonKey) {
        console.error('Missing environment variables!');
        return new Response('Server configuration error', { status: 500 });
      }
      
      return Response.json(config);
    },
    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
