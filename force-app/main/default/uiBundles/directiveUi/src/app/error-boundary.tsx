import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary. Renders a friendly fallback (ui/card + button)
 * instead of a blank screen when a render throws, and offers a reload.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // A real deployment would forward this to a logging sink.
    console.error("Directive UI crashed:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-critical/12 text-critical">
              <AlertTriangle className="size-5" aria-hidden />
            </div>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              Directive hit an unexpected error while rendering this view. Your
              work is safe - try reloading.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="max-h-40 overflow-auto rounded-md border border-border bg-surface-hover/50 p-3 text-2xs text-foreground-muted">
              {error.message}
            </pre>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>
                Reload app
              </Button>
              <Button variant="secondary" onClick={this.handleReset}>
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
