"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-[50vh] items-center justify-center p-6">
                    <Card className="max-w-md w-full border-destructive/20">
                        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                                <AlertTriangle className="h-7 w-7 text-destructive" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Quelque chose s&apos;est mal passé. Veuillez réessayer.
                                </p>
                            </div>
                            {process.env.NODE_ENV === "development" && this.state.error && (
                                <pre className="w-full overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
                                    {this.state.error.message}
                                </pre>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={this.handleReset} variant="outline" className="gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Réessayer
                                </Button>
                                <Button onClick={() => window.location.reload()}>
                                    Rafraîchir la page
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
