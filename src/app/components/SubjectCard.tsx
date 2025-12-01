import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calculator, BookOpen, Microscope, Globe, Languages, Code, Clock, Trophy, Loader2 } from 'lucide-react';

interface SubjectCardProps {
    subject: string;
    description: string;
    examBoard?: string;
    tier?: string;
    price?: number;
    isPurchased?: boolean;
    isPurchasing?: boolean;
    onPreview?: () => void;
    onViewPack?: () => void;
}

const subjectIcons: Record<string, React.ComponentType<any>> = {
    'Maths': Calculator,
    'Mathematics': Calculator,
    'English Literature': BookOpen,
    'English Language': BookOpen,
    'Combined Science': Microscope,
    'Biology': Microscope,
    'Chemistry': Microscope,
    'Physics': Microscope,
    'History': Clock,
    'Geography': Globe,
    'French': Languages,
    'Spanish': Languages,
    'Computer Science': Code,
    'CS': Code
};

export function SubjectCard({
                                subject,
                                description,
                                examBoard,
                                tier,
                                price = 30,
                                isPurchased = false,
                                isPurchasing = false,
                                onPreview,
                                onViewPack
                            }: SubjectCardProps) {
    const IconComponent = subjectIcons[subject] || BookOpen;

    return (
        <Card className="group relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-border bg-white rounded-2xl hover:scale-[1.02] cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <CardContent className="p-8 relative">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shrink-0 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                        <IconComponent className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className="font-bold text-xl text-text-main group-hover:text-primary transition-colors duration-300">{subject}</h3>
                            {isPurchased && (
                                <Badge className="bg-gradient-to-r from-accent-success to-primary text-white border-0">
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Owned
                                </Badge>
                            )}
                        </div>
                        <p className="text-text-muted mb-4 leading-relaxed">{description}</p>

                        <div className="flex flex-wrap gap-2">
                            {examBoard && (
                                <Badge variant="outline" className="text-xs border-primary/20 text-primary bg-primary/5">
                                    {examBoard}
                                </Badge>
                            )}
                            {tier && (
                                <Badge variant="outline" className="text-xs border-accent-success/20 text-accent-success bg-accent-success/5">
                                    {tier}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-text-muted">
                        {isPurchased ? (
                            <span className="text-accent-success font-semibold">Access your content</span>
                        ) : (
                            <div>
                                <span className="text-2xl font-bold text-text-main">£{price}</span>
                                <span className="text-sm ml-2">Pay once, keep forever</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {!isPurchased && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    onPreview?.();
                                }}
                                disabled={isPurchasing}
                                className="text-primary hover:text-primary-dark hover:bg-primary/10 rounded-xl"
                            >
                                Preview
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={(e: any) => {
                                e.stopPropagation();
                                onViewPack?.();
                            }}
                            disabled={isPurchasing}
                            className={`bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary rounded-xl px-6 ${
                                isPurchasing ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {isPurchasing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : isPurchased ? (
                                'Open Pack'
                            ) : (
                                'Buy Pack'
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}