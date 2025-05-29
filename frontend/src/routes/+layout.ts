import { redirect } from '@sveltejs/kit';

// @ts-ignore
export const load = async ({ url, fetch }) => {
    const pathname = url.pathname;

    // Add http:// protocol here!
    const res = await fetch('http://localhost:4000/api/me', {
        credentials: 'include'
    });

    const isAuthenticated = res.ok;

    if (!isAuthenticated && pathname !== '/login') {
        throw redirect(307, '/login');
    }

    if (isAuthenticated && pathname === '/login') {
        throw redirect(307, '/home');
    }

    return {isAuthenticated};
};
