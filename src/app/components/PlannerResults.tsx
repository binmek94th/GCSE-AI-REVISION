import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Progress } from './progress';
import {
    TrendingUp,
    Calendar,
    AlertTriangle,
    CheckCircle,
    ArrowRight,
    Share,
    Star,
    Clock,
    Target
} from 'lucide-react';

interface PlannerResultsProps {
    onNavigate?: (page: string) => void;
    onBuyPack?: (subject: string) => void;
}

export function PlannerResults({ onNavigate, onBuyPack }: PlannerResultsProps) {
    const readinessScore = 72;
    const weakTopics = [
        { subject: 'Maths', topic: 'Quadratic Equations', score: 45 },
        { subject: 'Maths', topic: 'Trigonometry', score: 52 },
        { subject: 'English Literature', topic: 'Poetry Analysis', score: 38 }
    ];

    const schedulePreview = [
        {
            date: 'Today',
            tasks: [
                { subject: 'Maths', topic: 'Quadratic Equations - Basics', type: 'Notes', duration: '20 min' },
                { subject: 'English Literature', topic: 'Macbeth - Key Quotes', type: 'Practice', duration: '30 min' }
            ]
        },
        {
            date: 'Tomorrow',
            tasks: [
                { subject: 'Maths', topic: 'Quadratic Formula Practice', type: 'Quiz', duration: '25 min' },
                { subject: 'English Literature', topic: 'Poetry Techniques', type: 'Video', duration: '15 min' }
            ]
        },
        {
            date: 'Wednesday',
            tasks: [
                { subject: 'Maths', topic: 'Past Paper Questions', type: 'Practice', duration: '45 min' },
                { subject: 'English Literature', topic: 'Essay Planning', type: 'Notes', duration: '20 min' }
            ]
        }
    ];

    const upsellPacks = [
        {
            subject: 'Maths',
            reason: 'Your weakest area',
            benefit: 'Past papers, predicted 2026 questions, and step-by-step solutions',
            price: 30
        },
        {
            subject: 'English Literature',
            reason: 'Poetry analysis needs work',
            benefit: 'Model essays, annotation guides, and exam technique videos',
            price: 30
        }
    ];

    return (
        <div className="min-h-screen bg-bg-subtle py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-2">
                        Your Personalised Revision Plan
                    </h1>
                    <p className="text-text-muted">
                        Based on your assessment, here&#39;s your AI-generated study schedule
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Readiness Score */}
                        <Card className="border-border bg-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-6 h-6 text-primary" />
                                    Your GCSE Readiness Score
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-6 mb-6">
                                    <div className="relative w-32 h-32">
                                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                stroke="#E2E8F0"
                                                strokeWidth="8"
                                                fill="none"
                                            />
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                stroke="#0EA5E9"
                                                strokeWidth="8"
                                                fill="none"
                                                strokeDasharray={`${readinessScore * 2.51} 251`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-3xl font-bold text-primary">{readinessScore}%</span>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-text-main mb-2">Good Foundation</h3>
                                        <p className="text-text-muted mb-4">
                                            You have a solid understanding of most topics, but there are key areas where focused practice could boost your grade significantly.
                                        </p>
                                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                                            Target: Grade 7 → Grade 8-9 achievable
                                        </Badge>
                                    </div>
                                </div>

                                <div className="border-t border-border pt-6">
                                    <h4 className="font-semibold text-text-main mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-warning" />
                                        Focus on these weak areas first
                                    </h4>
                                    <div className="space-y-3">
                                        {weakTopics.map((topic, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg">
                                                <div>
                                                    <span className="font-medium text-text-main">{topic.topic}</span>
                                                    <span className="text-sm text-text-muted ml-2">({topic.subject})</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Progress value={topic.score} className="w-20 h-2" />
                                                    <span className="text-sm font-medium text-text-muted w-8">{topic.score}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Schedule Preview */}
                        <Card className="border-border bg-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-6 h-6 text-primary" />
                                    Your Schedule (Next 3 Days)
                                </CardTitle>
                                <p className="text-text-muted">
                                    Optimized based on your weak areas and available study time
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {schedulePreview.map((day, index) => (
                                        <div key={index}>
                                            <h4 className="font-semibold text-text-main mb-3">{day.date}</h4>
                                            <div className="space-y-3">
                                                {day.tasks.map((task, taskIndex) => (
                                                    <div key={taskIndex} className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                                            <div>
                                                                <p className="font-medium text-text-main">{task.topic}</p>
                                                                <p className="text-sm text-text-muted">{task.subject} • {task.type}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-text-muted" />
                                                            <span className="text-sm text-text-muted">{task.duration}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 p-4 bg-bg-subtle rounded-lg text-center">
                                    <p className="text-sm text-text-muted mb-3">
                                        Want to see your full schedule and track progress?
                                    </p>
                                    <Button onClick={() => onNavigate?.('/dashboard')} variant="outline">
                                        View Full Dashboard
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Upsell Cards */}
                        {upsellPacks.map((pack, index) => (
                            <Card key={index} className="border-primary/50 bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] border-t-primary"></div>
                                <div className="absolute top-1 right-1">
                                    <Star className="w-4 h-4 text-white" />
                                </div>

                                <CardHeader>
                                    <Badge variant="secondary" className="bg-warning/10 text-warning w-fit">
                                        {pack.reason}
                                    </Badge>
                                    <CardTitle className="text-lg">
                                        Unlock {pack.subject} Pack
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-text-muted mb-4">
                                        {pack.benefit}
                                    </p>

                                    <div className="space-y-3">
                                        <div className="text-lg font-bold text-primary">
                                            £{pack.price} • Pay once, keep forever
                                        </div>

                                        <Button
                                            className="w-full bg-primary hover:bg-primary-dark"
                                            onClick={() => onBuyPack?.(pack.subject)}
                                        >
                                            Get {pack.subject} Pack
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-primary hover:text-primary-dark"
                                        >
                                            Preview a free topic
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Parent Share */}
                        <Card className="border-border bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Share className="w-5 h-5 text-primary" />
                                    Share with Parents
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-text-muted mb-4">
                                    Let your parents see your progress and upcoming tasks
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => onNavigate?.('/parent')}
                                >
                                    Create Parent View
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Study Tips */}
                        <Card className="border-border bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Target className="w-5 h-5 text-primary" />
                                    Quick Tips
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-text-muted">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-accent-success mt-0.5 shrink-0" />
                                        Start with your weakest topics for maximum impact
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-accent-success mt-0.5 shrink-0" />
                                        Follow the schedule but adjust if you need more time
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-accent-success mt-0.5 shrink-0" />
                                        Practice past papers regularly, especially closer to exams
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}