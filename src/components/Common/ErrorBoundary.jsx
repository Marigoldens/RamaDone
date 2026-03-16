import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * @fileoverview Catch-all React Error Boundary to prevent the entire app 
 * from crashing due to unexpected JS errors.
 * 
 * DESIGN:
 * - Premium gradient background
 * - Clear error message
 * - "Reload App" recovery action
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught exception:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-surface flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-xl font-bold text-text mb-3">Something Went Wrong</h1>
            <p className="text-sm text-text-muted mb-8 leading-relaxed">
              An unexpected error occurred. Don't worry, your data is likely safe in our offline storage. 
              Try reloading the app to fix it.
            </p>

            <button
              onClick={this.handleReload}
              className="w-full py-4 rounded-2xl bg-accent text-surface font-bold uppercase tracking-widest
                         shadow-lg shadow-accent/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Ramadan Rhythm
            </button>

            <pre className="mt-8 p-3 rounded-lg bg-red-500/5 text-red-500/50 text-[10px] text-left overflow-hidden opacity-50">
              {this.state.error?.toString()}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
