import { useState, useEffect } from 'react';

export interface SubjectProgress {
    subjectId: string;
    subjectName: string;
    totalMaterials: number;
    finishedMaterials: number;
    progress: number;
    grade: string;
    finishedMaterialIds: string[];
}

export interface ProgressData {
    userId: string;
    subjects: SubjectProgress[];
    overallProgress: number;
    totalMaterials: number;
    totalFinished: number;
}

export function useProgress(idToken: string | null) {
    const [data, setData] = useState<ProgressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!idToken) {
            setLoading(false);
            console.log("No ID token available");
            return;
        }

        const fetchProgress = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/progress', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch progress');
                }

                const progressData = await response.json();
                setData(progressData);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProgress();
    }, [idToken]);

    return { data, loading, error, refetch: () => setLoading(true) };
}

