'use client'
import { Search } from 'lucide-react';
import {Input} from "@/app/components/input";
import { Badge } from "../components/badge";
import {SubjectCard} from "@/app/components/SubjectCard";
import { Button } from "../components/button";
import {useState} from "react";
import { getAuth } from "firebase/auth";
import {useRouter} from "next/navigation";

interface SubjectsHubProps {
    onNavigate?: (page: string, data?: any) => void;
}

function SubjectsHub({ onNavigate }: SubjectsHubProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBoard, setSelectedBoard] = useState('All');
    const [selectedTier, setSelectedTier] = useState('All');
    const [selectedType, setSelectedType] = useState('All');
    const [purchasingSubject, setPurchasingSubject] = useState<string | null>(null);
    const router = useRouter();

    const subjects = [
        {
            subject: 'Maths',
            description: 'Master algebra, geometry, statistics, and calculus with AI-predicted questions',
            examBoard: 'AQA',
            tier: 'Higher',
            type: 'Core',
            price: 30,
            packId: 'maths-pack'
        },
        {
            subject: 'English Literature',
            description: 'Ace your essays with model answers, quote analysis, and exam technique',
            examBoard: 'AQA',
            tier: 'All',
            type: 'Core',
            price: 30,
            packId: 'english-literature-pack'
        },
        {
            subject: 'English Language',
            description: 'Perfect your language analysis, creative writing, and reading comprehension',
            examBoard: 'AQA',
            tier: 'All',
            type: 'Core',
            price: 30,
            packId: 'english-language-pack'
        },
        {
            subject: 'Combined Science',
            description: 'Triple your science knowledge with interactive content across biology, chemistry, and physics',
            examBoard: 'AQA',
            tier: 'Higher',
            type: 'Core',
            price: 30,
            packId: 'combined-science-pack'
        },
        {
            subject: 'Biology',
            description: 'From cells to ecosystems - visual learning with diagram practice and case studies',
            examBoard: 'AQA',
            tier: 'Higher',
            type: 'Science',
            price: 30,
            packId: 'biology-pack'
        },
        {
            subject: 'Chemistry',
            description: 'Chemical reactions, equations, and practical skills with step-by-step calculations',
            examBoard: 'AQA',
            tier: 'Higher',
            type: 'Science',
            price: 30,
            packId: 'chemistry-pack'
        },
        {
            subject: 'Physics',
            description: 'Forces, energy, and waves explained clearly with formula practice and applications',
            examBoard: 'AQA',
            tier: 'Higher',
            type: 'Science',
            price: 30,
            packId: 'physics-pack'
        },
        {
            subject: 'History',
            description: 'Timeline mastery with source analysis, essay structure, and key event coverage',
            examBoard: 'AQA',
            tier: 'All',
            type: 'Humanities',
            price: 30,
            packId: 'history-pack'
        },
        {
            subject: 'Geography',
            description: 'Physical and human geography with case studies, map skills, and fieldwork techniques',
            examBoard: 'AQA',
            tier: 'All',
            type: 'Humanities',
            price: 30,
            packId: 'geography-pack'
        },
        {
            subject: 'French',
            description: 'Speaking, listening, reading, and writing skills with vocabulary building and grammar',
            examBoard: 'AQA',
            tier: 'Higher',
            type: 'Languages',
            price: 30,
            packId: 'french-pack'
        },
        {
            subject: 'Spanish',
            description: 'Comprehensive language learning with cultural context and conversation practice',
            examBoard: 'AQA',
            tier: 'Higher',
            type: 'Languages',
            price: 30,
            packId: 'spanish-pack'
        },
        {
            subject: 'Computer Science',
            description: 'Programming, algorithms, and computational thinking with hands-on coding practice',
            examBoard: 'AQA',
            tier: 'All',
            type: 'Technology',
            price: 30,
            packId: 'computer-science-pack'
        }
    ];

    const examBoards = ['All', 'AQA', 'Edexcel', 'OCR', 'WJEC'];
    const tiers = ['All', 'Foundation', 'Higher'];
    const types = ['All', 'Core', 'Science', 'Humanities', 'Languages', 'Technology'];

    const filteredSubjects = subjects.filter(subject => {
        const matchesSearch = subject.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            subject.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBoard = selectedBoard === 'All' || subject.examBoard === selectedBoard;
        const matchesTier = selectedTier === 'All' || subject.tier === selectedTier || subject.tier === 'All';
        const matchesType = selectedType === 'All' || subject.type === selectedType;

        return matchesSearch && matchesBoard && matchesTier && matchesType;
    });

    const handlePurchaseClick = async (subject: any) => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            router.push("auth/login")
            return;
        }

        setPurchasingSubject(subject.subject);

        try {
            // Get ID token for authentication
            const idToken = await user.getIdToken();

            console.log("🛒 Creating checkout for:", {
                userId: user.uid,
                packId: subject.packId,
                subject: subject.subject
            });

            // Create checkout session via API (using your existing endpoint)
            const response = await fetch("/api/checkout-study-pack", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    userId: user.uid,
                    packId: subject.packId,
                    subject: subject.subject,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("❌ API Error:", data);
                throw new Error(data.error || "Failed to create checkout session");
            }

            console.log("✅ Checkout session created:", data);

            // Redirect to Stripe checkout
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL received");
            }
        } catch (error: any) {
            console.error("❌ Error creating checkout:", error);
            alert(`Failed to start checkout: ${error.message}`);
            setPurchasingSubject(null);
        }
    };

    const handleSubjectClick = (subject: string) => {
        onNavigate?.('/subject-pack', { subject });
    };

    return (
        <div className="min-h-screen bg-bg-subtle py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-4">
                        GCSE Subject Packs
                    </h1>
                    <p className="text-xl text-text-muted max-w-3xl">
                        Comprehensive revision materials for every GCSE subject. Pay once, keep forever.
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg border border-border p-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
                            <Input
                                placeholder="Search subjects..."
                                value={searchQuery}
                                onChange={(e: any) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap lg:flex-nowrap gap-4">
                            <div className="min-w-[120px]">
                                <select
                                    value={selectedBoard}
                                    onChange={(e) => setSelectedBoard(e.target.value)}
                                    className="w-full p-3 border border-border rounded-lg bg-white text-text-main"
                                >
                                    {examBoards.map(board => (
                                        <option key={board} value={board}>
                                            {board === 'All' ? 'All Boards' : board}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="min-w-[120px]">
                                <select
                                    value={selectedTier}
                                    onChange={(e) => setSelectedTier(e.target.value)}
                                    className="w-full p-3 border border-border rounded-lg bg-white text-text-main"
                                >
                                    {tiers.map(tier => (
                                        <option key={tier} value={tier}>
                                            {tier === 'All' ? 'All Tiers' : tier}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="min-w-[120px]">
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full p-3 border border-border rounded-lg bg-white text-text-main"
                                >
                                    {types.map(type => (
                                        <option key={type} value={type}>
                                            {type === 'All' ? 'All Types' : type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Active Filters */}
                    {(selectedBoard !== 'All' || selectedTier !== 'All' || selectedType !== 'All' || searchQuery) && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                            <span className="text-sm text-text-muted">Active filters:</span>
                            {searchQuery && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary">
                                    Search: &#34;{searchQuery}&#34;
                                </Badge>
                            )}
                            {selectedBoard !== 'All' && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary">
                                    {selectedBoard}
                                </Badge>
                            )}
                            {selectedTier !== 'All' && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary">
                                    {selectedTier}
                                </Badge>
                            )}
                            {selectedType !== 'All' && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary">
                                    {selectedType}
                                </Badge>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedBoard('All');
                                    setSelectedTier('All');
                                    setSelectedType('All');
                                }}
                                className="text-text-muted hover:text-text-main"
                            >
                                Clear all
                            </Button>
                        </div>
                    )}
                </div>

                {/* Results Count */}
                <div className="mb-6">
                    <p className="text-text-muted">
                        Showing {filteredSubjects.length} of {subjects.length} subjects
                    </p>
                </div>

                {/* Subject Grid */}
                {filteredSubjects.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSubjects.map((subject) => (
                            <SubjectCard
                                key={subject.subject}
                                subject={subject.subject}
                                description={subject.description}
                                examBoard={subject.examBoard}
                                tier={subject.tier}
                                price={subject.price}
                                onPreview={() => handleSubjectClick(subject.subject)}
                                onViewPack={() => handlePurchaseClick(subject)}
                                isPurchasing={purchasingSubject === subject.subject}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-bg-subtle rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-text-muted" />
                        </div>
                        <h3 className="text-xl font-semibold text-text-main mb-2">
                            No subjects found
                        </h3>
                        <p className="text-text-muted mb-4">
                            Try adjusting your search criteria or filters
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedBoard('All');
                                setSelectedTier('All');
                                setSelectedType('All');
                            }}
                        >
                            Clear filters
                        </Button>
                    </div>
                )}

                {/* Bottom CTA */}
                <div className="mt-16 text-center bg-white rounded-lg border border-border p-8">
                    <h2 className="text-2xl font-bold text-text-main mb-4">
                        Can&#39;t find what you&#39;re looking for?
                    </h2>
                    <p className="text-text-muted mb-6">
                        Start with our free planner to get personalized recommendations
                    </p>
                    <Button
                        size="lg"
                        onClick={() => onNavigate?.('/onboarding')}
                        className="bg-primary hover:bg-primary-dark"
                    >
                        Start Free Planner
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default SubjectsHub