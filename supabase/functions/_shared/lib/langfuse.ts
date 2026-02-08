import { startActiveObservation } from "npm:@langfuse/tracing";

// Helper function to create traces with proper error handling
export async function createTrace<T>(
  name: string,
  operation: (span: any) => Promise<T>,
  input?: any
): Promise<T> {
  return await startActiveObservation(name, async (span) => {
    try {
      // Set input if provided
      if (input !== undefined) {
        span.update({
          input: typeof input === 'object' ? JSON.stringify(input) : String(input),
        });
      }

      const result = await operation(span);
      
      // Mark as successful
      span.update({
        output: typeof result === 'object' ? JSON.stringify(result) : String(result),
      });

      return result;
    } catch (error) {
      // Add error information
      span.update({
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
      
      throw error;
    }
  });
}

// Simple trace wrapper for operations
export async function traceOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  input?: any
): Promise<T> {
  return await createTrace(operationName, async () => {
    return await operation();
  }, input);
}
