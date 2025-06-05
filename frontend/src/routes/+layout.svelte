<script lang="ts">
    import '../app.css';
    export let data;

    let user = "";
    const { isAuthenticated } = data;
    let isSidebarOpen = false;

    const toggleSidebar = () => {
        isSidebarOpen = !isSidebarOpen;
    };
</script>

<div class="flex bg-gray-900 text-gray-100 min-h-screen">
    {#if isAuthenticated}
        <!-- Sidebar -->
        <aside class={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2A2A40] shadow-lg transform transition-transform duration-200 ease-in-out
			${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0`}>
            <div class="px-6 py-8 flex flex-col h-full">
                <h1 class="text-3xl font-extrabold text-indigo-300 tracking-wide select-none">MeucciHub</h1>
                <h3 class="text-lg font-extrabold text-white tracking-wide select-none">{user}</h3>

                <nav class="flex-grow mt-8 space-y-2">
                    <a href="/home" class="block py-2 px-3 rounded-md hover:bg-indigo-600 transition">Home</a>
                    <a href="/schedule" class="block py-2 px-3 rounded-md hover:bg-indigo-600 transition">Orario</a>
                    <a href="/circolari" class="block py-2 px-3 rounded-md hover:bg-indigo-600 transition">Circolari</a>
                    <a href="https://discord.meucci.party/" class="block py-2 px-3 rounded-md hover:bg-indigo-600 transition">Discord</a>
                </nav>

                <a href="/logout" class="block py-2 px-3 rounded-md bg-red-700 transition mt-auto">Logout</a>
            </div>
        </aside>
    {/if}

    <!-- Main content -->
    <div class="flex-1 flex flex-col pl-0 sm:pl-64">
        <!-- Header -->
        {#if isAuthenticated}             <!-- Toggle button for mobile -->
                <button class="sm:hidden text-gray-200 hover:text-white focus:outline-none" on:click={toggleSidebar}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                         stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
        {/if}

        <!-- Page content -->
        <main class="flex-1 p-4 sm:p-8 overflow-auto">
            <slot />
        </main>
    </div>
</div>
