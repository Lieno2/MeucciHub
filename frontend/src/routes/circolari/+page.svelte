<script lang="ts">
    export let data: { circolari: { id: string; title: string; url: string; date: string }[] };
</script>

<div class="p-6 text-white">
    <h1 class="text-2xl font-bold text-blue-400 mb-4">Circolari</h1>
    <ul class="space-y-6">
        {#each data.circolari as c}
            <li
                    class="bg-zinc-800 p-5 rounded-lg hover:bg-zinc-700 transition-colors duration-300"
                    role="listitem"
            >
                <!-- Title -->
                <h2 class="text-white font-semibold text-lg mb-1">{c.title}</h2>

                <!-- Link -->
                <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block text-blue-300 hover:text-blue-500 underline mb-2 break-words"
                >
                    {c.url}
                </a>

                <!-- Date and ID in a row -->
                <div class="flex justify-between text-white text-xs select-none">
                    <span>📅 {c.date}</span>
                    <span>id: {c.id}</span>
                </div>
            </li>
        {/each}
    </ul>
</div>
