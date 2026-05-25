import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<ErrorBoundaryProps>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorInfo: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      let displayMessage = "Что-то пошло не так. Пожалуйста, перезагрузите страницу.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          displayMessage = "Ошибка доступа к данным. Пожалуйста, убедитесь, что вы авторизованы.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="apple-card p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white mb-2">Произошла ошибка</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{displayMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="apple-button w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500 text-white"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
