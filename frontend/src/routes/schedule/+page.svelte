<script lang="ts">
    import { fly, scale, fade } from 'svelte/transition';
    import { onMount } from 'svelte';

    export let data: {
        classes: { id: string; name: string }[];
    };

    interface Lesson {
        id: string;
        classId: string;
        day: number;
        startTime: string;
        endTime: string;
        subject: string;
        teacher: string;
        room: string;
    }

    let selectedClassId: string = '';
    let timetable: Lesson[] = [];
    let loading = false;
    let error = '';

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const timeSlots = ['08:00', '08:50', '09:50', '10:55', '11:50', '12:55', '13:50'];

    // Modal state
    let showModal = false;
    let modalLessons: Lesson[] = [];
    let modalTitle = '';

    async function loadTimetable(classId: string) {
        loading = true;
        error = '';
        try {
            const res = await fetch(`http://localhost:4000/api/schedule?classId=${classId}`);
            if (!res.ok) throw new Error(`Failed to fetch timetable: ${res.statusText}`);
            timetable = await res.json();
        } catch (e: any) {
            timetable = [];
            error = e.message || 'Unknown error';
        } finally {
            loading = false;
        }
    }

    $: if (data.classes.length > 0 && selectedClassId === '') {
        selectedClassId = data.classes[0].id;
        loadTimetable(selectedClassId);
    }

    function onClassChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedClassId = select.value;
        loadTimetable(selectedClassId);
    }

    function getLessons(day: number, time: string) {
        return timetable.filter(lesson => lesson.day === day && lesson.startTime === time);
    }

    function openModal(day: number, time: string, firstSubject: string) {
        modalLessons = timetable.filter(lesson => lesson.day === day && lesson.startTime === time);
        modalTitle = firstSubject || 'Lezioni';
        showModal = true;
    }

    function closeModal() {
        showModal = false;
    }

    // Close modal on ESC key press
    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && showModal) {
            closeModal();
        }
    }

    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    });
</script>

<h1
        class="text-white text-2xl sm:text-3xl sm:mb-6 w-full bg-gray-800 box-border text-center pt-5 rounded-[60px] border border-gray-700 select-none"
>
    Orario della classe:
    <select
            bind:value={selectedClassId}
            on:change={onClassChange}
            class="mb-4 sm:mb-6 p-2 rounded bg-gray-800 text-white w-full sm:w-auto popup-content"
    >
        {#each data.classes as cls}
            <option value={cls.id}>{cls.name}</option>
        {/each}
    </select>
</h1>

{#if loading}
    <p class="text-gray-400">Caricamento orario...</p>
{:else if error}
    <p class="text-red-500">Errore: {error}</p>
{:else if timetable.length === 0}
    <p class="text-gray-400">Nessun orario trovato per questa classe.</p>
{:else}
    <div class="overflow-auto rounded-lg shadow-lg">
        <div class="min-w-[650px] grid grid-cols-6 gap-1 text-white text-xs sm:text-sm md:text-base">
            <div></div>
            {#each days as dayName}
                <div
                        class="text-center font-semibold border border-gray-700 p-2 bg-gray-800 select-none"
                >
                    {dayName}day
                </div>
            {/each}

            {#each timeSlots as time}
                <div
                        class="border border-gray-700 p-2 bg-gray-800 font-mono text-center box-border whitespace-nowrap select-none"
                >
                    {time}
                </div>

                {#each days as _, dayIndex}
                    <div
                            class="border border-gray-700 min-h-[70px] p-3 bg-gray-900 relative cursor-pointer hover:bg-gray-700 select-text rounded box-border"
                            title="Click to see all lessons"
                            on:click={() => openModal(dayIndex, time, getLessons(dayIndex, time)[0]?.subject)}
                    >
                        {#if getLessons(dayIndex, time).length > 0}
                            <div class="text-center font-bold box-border break-words leading-tight" style="hyphens: auto;">{getLessons(dayIndex, time)[0].subject}</div>
                            {#if getLessons(dayIndex, time).length > 1}
                                <div class="more-icon" aria-label="Multiple lessons">&#x22EE;</div>
                            {/if}
                        {/if}
                    </div>
                {/each}
            {/each}
        </div>
    </div>
{/if}

{#if showModal}
    <div
            class="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
            on:click|self={closeModal}
            transition:fade
    >
        <div
                class="bg-gray-800 rounded-lg max-w-md w-full p-6 relative shadow-lg"
                transition:scale={{ duration: 200 }}
                on:click|stopPropagation
        >
            <button
                    class="absolute top-3 right-3 text-gray-400 hover:text-white text-xl font-bold"
                    on:click={closeModal}
                    aria-label="Close modal"
            >
                &times;
            </button>

            <h2 class="text-white text-xl font-semibold mb-4">{modalTitle}</h2>

            <div class="space-y-3 max-h-96 overflow-y-auto popup-content">
                {#each modalLessons as lesson}
                    <div class="bg-gray-700 p-3 rounded shadow-sm">
			<div><strong>Materia:</strong> {lesson.subject}</div>
                        <div><strong>Docente:</strong> {lesson.teacher}</div>
                        <div><strong>Aula:</strong> {lesson.room}</div>
                        <div><strong>Orario:</strong> {lesson.startTime} - {lesson.endTime || 'N/A'}</div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .more-icon {
        position: absolute;
        bottom: 4px;
        right: 6px;
        font-size: 1.25rem;
        color: #9ca3af;
        pointer-events: none;
    }

    .popup-content {
        scrollbar-width: thin;
        scrollbar-color: #2563eb #1f2937; /* Firefox scrollbar thumb and track */
    }

    /* WebKit browsers */
    .popup-content::-webkit-scrollbar {
        width: 12px;
        height: 12px; /* horizontal scrollbar if any */
    }

    .popup-content::-webkit-scrollbar-track {
        background: #1f2937; /* dark background for track */
        border-radius: 6px;
        box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
    }

    .popup-content::-webkit-scrollbar-thumb {
        background: linear-gradient(
                135deg,
                #3b82f6 0%,
                #2563eb 25%,
                #1e40af 50%,
                #2563eb 75%,
                #3b82f6 100%
        );
        border-radius: 6px;
        border: 3px solid #1f2937; /* creates padding around thumb */
        box-shadow:
                inset 0 0 5px rgba(255,255,255,0.15),
                inset 2px 2px 4px rgba(255,255,255,0.2);
        background-size: 200% 200%;
        animation: shimmer 3s ease-in-out infinite;
    }

    .popup-content::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(
                135deg,
                #60a5fa,
                #3b82f6,
                #1e40af,
                #3b82f6,
                #60a5fa
        );
        animation: none;
    }

    @keyframes shimmer {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }
</style>
