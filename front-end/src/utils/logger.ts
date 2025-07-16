// Frontend logging utility for Orthodox Metrics
// This utility sends logs to the backend logging system

interface LogEntry {
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    component: string;
    message: string;
    details?: any;
    userAction?: string;
    timestamp?: string;
}

class FrontendLogger {
    private static instance: FrontendLogger;
    private userId: string | null = null;
    private sessionId: string = this.generateSessionId();

    private constructor() {
        this.setupGlobalErrorHandlers();
    }

    private setupGlobalErrorHandlers() {
        // Capture uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.error('Frontend', 'Uncaught JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                url: window.location.pathname
            }, 'javascript_error');
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Frontend', 'Unhandled Promise Rejection', {
                reason: event.reason,
                stack: event.reason?.stack,
                url: window.location.pathname
            }, 'promise_rejection');
        });

        // Capture console errors (optional - might be noisy)
        const originalConsoleError = console.error;
        console.error = (...args) => {
            // Call original console.error
            originalConsoleError.apply(console, args);
            
            // Log to our system if it looks like an error
            if (args.length > 0 && (typeof args[0] === 'string' || args[0] instanceof Error)) {
                this.warn('Frontend', 'Console Error', {
                    arguments: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)),
                    url: window.location.pathname
                }, 'console_error');
            }
        };
    }

    static getInstance(): FrontendLogger {
        if (!FrontendLogger.instance) {
            FrontendLogger.instance = new FrontendLogger();
        }
        return FrontendLogger.instance;
    }

    private generateSessionId(): string {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    setUserId(userId: string) {
        this.userId = userId;
    }

    private async sendLog(entry: LogEntry) {
        try {
            const logData = {
                ...entry,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId,
                userId: this.userId,
                userAgent: navigator.userAgent,
                url: window.location.pathname
            };

            // Send to backend logging endpoint
            await fetch('/api/logs/frontend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(logData),
            });
        } catch (error) {
            // Fallback to console logging if backend is unavailable
            console.log(`[${entry.level.toUpperCase()}] ${entry.component}: ${entry.message}`, entry.details);
        }
    }

    debug(component: string, message: string, details?: any, userAction?: string) {
        this.sendLog({ level: 'debug', component, message, details, userAction });
    }

    info(component: string, message: string, details?: any, userAction?: string) {
        this.sendLog({ level: 'info', component, message, details, userAction });
    }

    warn(component: string, message: string, details?: any, userAction?: string) {
        this.sendLog({ level: 'warn', component, message, details, userAction });
    }

    error(component: string, message: string, details?: any, userAction?: string) {
        this.sendLog({ level: 'error', component, message, details, userAction });
    }

    fatal(component: string, message: string, details?: any, userAction?: string) {
        this.sendLog({ level: 'fatal', component, message, details, userAction });
    }

    // Convenience methods for specific actions
    userAction(component: string, action: string, details?: any) {
        this.info(component, `User action: ${action}`, details, action);
    }

    pageView(component: string, path: string) {
        this.info(component, `Page viewed: ${path}`, { path, sessionId: this.sessionId });
    }

    apiCall(component: string, endpoint: string, method: string, status?: number, duration?: number) {
        const level = status && status >= 400 ? 'error' : 'info';
        this.sendLog({
            level,
            component,
            message: `API call: ${method} ${endpoint}`,
            details: { endpoint, method, status, duration },
            userAction: `api_${method.toLowerCase()}`
        });
    }

    performanceMetric(component: string, metric: string, value: number, unit: string = 'ms') {
        this.debug(component, `Performance: ${metric}`, { metric, value, unit });
    }

    componentMount(component: string) {
        this.debug(component, 'Component mounted', { sessionId: this.sessionId });
    }

    componentUnmount(component: string) {
        this.debug(component, 'Component unmounted', { sessionId: this.sessionId });
    }

    formSubmission(component: string, formName: string, success: boolean, errors?: any) {
        const level = success ? 'info' : 'warn';
        this.sendLog({
            level,
            component,
            message: `Form ${success ? 'submitted successfully' : 'submission failed'}: ${formName}`,
            details: { formName, success, errors },
            userAction: 'form_submit'
        });
    }

    fileOperation(component: string, operation: string, filename: string, success: boolean, error?: any) {
        const level = success ? 'info' : 'error';
        this.sendLog({
            level,
            component,
            message: `File ${operation} ${success ? 'successful' : 'failed'}: ${filename}`,
            details: { operation, filename, success, error },
            userAction: `file_${operation}`
        });
    }

    dataOperation(component: string, operation: string, entity: string, count?: number, success: boolean = true) {
        this.info(component, `Data ${operation}: ${entity}`, {
            operation,
            entity,
            count,
            success
        }, `data_${operation}`);
    }

    navigationEvent(component: string, from: string, to: string) {
        this.info(component, `Navigation: ${from} → ${to}`, { from, to }, 'navigate');
    }

    searchAction(component: string, query: string, resultCount?: number) {
        this.info(component, `Search performed: "${query}"`, {
            query,
            resultCount
        }, 'search');
    }

    exportAction(component: string, format: string, entity: string, count?: number) {
        this.info(component, `Export ${format}: ${entity}`, {
            format,
            entity,
            count
        }, 'export');
    }

    importAction(component: string, format: string, filename: string, recordCount?: number, success: boolean = true) {
        const level = success ? 'info' : 'error';
        this.sendLog({
            level,
            component,
            message: `Import ${format} ${success ? 'successful' : 'failed'}: ${filename}`,
            details: { format, filename, recordCount, success },
            userAction: 'import'
        });
    }

    validationError(component: string, field: string, error: string, value?: any) {
        this.warn(component, `Validation error: ${field}`, { field, error, value }, 'validation_error');
    }

    securityEvent(component: string, event: string, details?: any) {
        this.warn(component, `Security event: ${event}`, details, 'security_event');
    }

    // Enhanced error logging methods for UI-specific scenarios
    formValidationError(component: string, formName: string, field: string, error: string, value?: any) {
        this.warn(component, `Form validation error: ${formName}.${field}`, {
            form: formName,
            field,
            error,
            value: value ? String(value) : undefined,
            url: window.location.pathname
        }, 'form_validation_error');
    }

    apiError(component: string, endpoint: string, method: string, status: number, error: any) {
        this.error(component, `API Error: ${method} ${endpoint}`, {
            endpoint,
            method,
            status,
            error: error?.message || String(error),
            stack: error?.stack,
            url: window.location.pathname
        }, 'api_error');
    }

    uiInteractionError(component: string, action: string, element: string, error: any) {
        this.error(component, `UI Interaction Error: ${action} on ${element}`, {
            action,
            element,
            error: error?.message || String(error),
            stack: error?.stack,
            url: window.location.pathname
        }, 'ui_interaction_error');
    }

    routingError(component: string, fromPath: string, toPath: string, error: any) {
        this.error(component, `Navigation Error: ${fromPath} -> ${toPath}`, {
            fromPath,
            toPath,
            error: error?.message || String(error),
            stack: error?.stack
        }, 'routing_error');
    }

    resourceLoadError(component: string, resourceType: string, resourceUrl: string, error: any) {
        this.error(component, `Resource Load Error: ${resourceType}`, {
            resourceType,
            resourceUrl,
            error: error?.message || String(error),
            url: window.location.pathname
        }, 'resource_load_error');
    }
}

// Export singleton instance
export const logger = FrontendLogger.getInstance();
export default logger;
