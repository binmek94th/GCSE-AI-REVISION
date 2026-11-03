'use client';

import SavedMaterialsList from '@/app/dashboard/generated_material/SavedMaterialsList';

// The list itself lives in SavedMaterialsList.tsx so the dashboard's My Materials tab can also show
// it inside the tab with a couple of options. (A route's page component can't take props, which
// is why it can't just be this file.) This is the standalone page at /dashboard/generated_material.
export default function GeneratedMaterialsListPage() {
    return <SavedMaterialsList />;
}
