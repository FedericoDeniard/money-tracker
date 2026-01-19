/**
 * LangSmith Configuration
 * Configures the LangSmith client for tracing AI operations
 */

// Set environment variables for LangSmith
if (process.env.LANGSMITH_TRACING) {
    // These environment variables will be automatically picked up by the LangSmith SDK
    process.env.LANGCHAIN_TRACING_V2 = process.env.LANGSMITH_TRACING;
    process.env.LANGCHAIN_ENDPOINT = process.env.LANGSMITH_ENDPOINT;
    process.env.LANGCHAIN_API_KEY = process.env.LANGSMITH_API_KEY;
    // Remove quotes from project name if present
    const projectName = process.env.LANGSMITH_PROJECT?.replace(/['"]/g, '') || 'My First App';
    process.env.LANGCHAIN_PROJECT = projectName;
    process.env.LANGSMITH_PROJECT = projectName; // Also set the normalized version

    // Silence LangSmith warnings and errors (rate limits, etc)
    process.env.LANGCHAIN_CALLBACKS_BACKGROUND = 'true';
    process.env.LANGSMITH_HIDE_INPUTS = 'false';
    process.env.LANGSMITH_HIDE_OUTPUTS = 'false';

    console.log('[LangSmith] Tracing enabled for project:', projectName);
    console.log('[LangSmith] Workspace ID:', process.env.LANGSMITH_WORKSPACE_ID);
    console.log('[LangSmith] Errors and warnings silenced');
}

export const langsmithConfig = {
    tracingEnabled: process.env.LANGSMITH_TRACING === 'true',
    endpoint: process.env.LANGSMITH_ENDPOINT,
    apiKey: process.env.LANGSMITH_API_KEY,
    project: process.env.LANGSMITH_PROJECT?.replace(/['"]/g, '') || 'My First App',
    workspaceId: process.env.LANGSMITH_WORKSPACE_ID
};
