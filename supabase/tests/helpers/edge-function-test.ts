// Helper to test Edge Functions that use Deno.serve

export async function testEdgeFunction(functionPath: string, request: Request): Promise<Response> {
  // Import the Edge Function module
  const module = await import(functionPath)
  
  // The Edge Function should have a Deno.serve call
  // We need to extract the handler function
  let handler: (req: Request) => Promise<Response>
  
  // Try to find the handler function in the module
  for (const [key, value] of Object.entries(module)) {
    if (typeof value === 'function' && key !== 'default') {
      // This might be our handler
      handler = value
      break
    }
  }
  
  if (!handler) {
    throw new Error(`No handler function found in ${functionPath}`)
  }
  
  // Call the handler with the test request
  return await handler(request)
}

// Helper to create a mock Deno environment for testing
export function createMockDenoEnv() {
  const originalEnv = globalThis.Deno?.env
  const originalServe = globalThis.Deno?.serve
  
  return {
    originalEnv,
    originalServe,
    restore: () => {
      if (originalEnv) globalThis.Deno.env = originalEnv
      if (originalServe) globalThis.Deno.serve = originalServe
    }
  }
}
