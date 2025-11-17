import { Badge } from '@/app/components/badge';
import { Crown, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionBadgeProps {
    showText?: boolean;
    className?: string;
}

export function SubscriptionBadge({ showText = true, className = '' }: SubscriptionBadgeProps) {
    const { isActive, isLoading, hasSubscription } = useSubscription();

    if (isLoading) {
        return (
            <Badge variant="outline" className={className}>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {showText && 'Loading...'}
            </Badge>
        );
    }

    if (!hasSubscription || !isActive) {
        return null; // Don't show badge if no active subscription
    }

    return (
        <Badge className={`bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0 ${className}`}>
            <Crown className="w-3 h-3 mr-1" />
            {showText && 'Premium'}
        </Badge>
    );
}

// Alternative compact version
export function SubscriptionIcon() {
    const { isActive, hasSubscription } = useSubscription();

    if (!hasSubscription || !isActive) {
        return null;
    }

    return (
        <div className="relative">
            <Crown className="w-5 h-5 text-yellow-500" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
        </div>
    );
}