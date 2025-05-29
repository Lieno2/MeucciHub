// +page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch('http://localhost:4000/api/circolari');
    const circolari = await res.json();

    return { circolari };
};