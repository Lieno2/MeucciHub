<script lang="ts">
    import '../app.css';
    export let data;

    let user = "";
    const { isAuthenticated } = data;
</script>

<div class="flex min-h-screen bg-gray-900 text-gray-100 ">
    {#if isAuthenticated}
    <!-- Sidebar -->
    <aside class="w-64 bg-[#2A2A40] shadow-lg flex flex-col">
        <div class="fixed">

            <div class="px-6 py-8">
                <h1 class="text-3xl font-extrabold text-indigo-300  tracking-wide select-none">MeucciHub</h1>
                <h3 class="text-lg font-extrabold text-white  tracking-wide select-none">{user}</h3>
            </div>
            <nav class="flex-grow px-6 space-y-2">

                    <a href="/home" class="block py-2 px-3 rounded-md hover:bg-indigo-600 transition">Home</a>
                    <a href="/schedule" class="block py-2 px-3 rounded-md hover:bg-indigo-600 transition">Orario</a>
                    <a href="/circolari" class="block py-2 px-3 rounded-md hover:bg-indigo-600 transition">Circolari</a>
                    <a href="https://discord.meucci.party/" class="block py-2 px-3 rounded-md hover:bg-indigo-600 transition">Discord</a>
                    <a href="/logout" class="block py-2 px-3 rounded-md bg-red-700 transition mt-auto">Logout</a>
            </nav>
        </div>
    </aside>

    {/if}
    <!-- Main content -->
    <div class="flex-1 flex flex-col">
        <!-- Header -->
        {#if isAuthenticated}
            <header class="h-16 bg-[#2A2A40] flex items-center px-8 hidden"></header>
        {/if}
        <!-- Content area -->
        <main class="flex-1 p-8 overflow-auto">
            <slot />
        </main>
    </div>
</div>
