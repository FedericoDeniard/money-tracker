import { useAuth } from "../hooks/useAuth";

export function Home() {
  const { user, signOut } = useAuth();

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--error)] rounded-md hover:bg-[var(--error)]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--error)]"
          >
            Sign Out
          </button>
        </div>
        
        <div className="border-t border-[var(--text-secondary)]/30 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Welcome!</h2>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              <span className="font-medium">User ID:</span> {user?.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
