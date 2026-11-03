'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import UploadTab from '@/app/dashboard/upload/UploadTab';
import SavedMaterialsList from '@/app/dashboard/generated_material/SavedMaterialsList';
import { GatedFeature } from '@/app/components/GatedFeature';

interface Props {
    /**
     * Counts up each time something asks to jump to the saved materials (an old ?tab=my-materials
     * link, or ?view=saved). Every change scrolls the page down to that section.
     */
    focusSaved?: number;
}

/**
 * One page for the student's own material: generate it from notes or a file at the top, and
 * everything they've saved right underneath — no switching between views.
 *
 * (These used to be two dashboard tabs, "Upload" and "My Materials".)
 *  - One access check around the whole page. (Two would each show their own free-trial banner and
 *    their own upgrade card, stacked on one page.)
 *  - The moment a material is saved, the list below updates in place.
 *  - "Saved materials" in the upload card scrolls down to the list.
 */
export default function MaterialsTab({ focusSaved = 0 }: Props) {
    const savedRef = useRef<HTMLElement>(null);
    // Bumped whenever a material is saved, so the list below loads again right away.
    const [refreshKey, setRefreshKey] = useState(0);

    const scrollToSaved = useCallback(() => {
        savedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    useEffect(() => {
        if (focusSaved > 0) scrollToSaved();
    }, [focusSaved, scrollToSaved]);

    return (
        <GatedFeature featureName="My Materials">
            <div className="space-y-10">
                <UploadTab onOpenSaved={scrollToSaved} onSaved={() => setRefreshKey((k) => k + 1)} />

                <section id="saved-materials" ref={savedRef} className="scroll-mt-24">
                    <SavedMaterialsList embedded refreshKey={refreshKey} />
                </section>
            </div>
        </GatedFeature>
    );
}
