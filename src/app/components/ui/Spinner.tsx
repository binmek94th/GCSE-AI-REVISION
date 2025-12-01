export default function Spinner({ size = 'md', className = '' }) {
    const sizeClasses: Record<string, string> = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-2',
        lg: 'w-12 h-12 border-3',
        xl: 'w-16 h-16 border-4'
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <div
                    className={`${sizeClasses[size]} border-border border-t-primary rounded-full animate-spin mx-auto ${className}`}
                />
                <p className="text-muted-foreground mt-4">Loading...</p>
            </div>
        </div>
    );
}