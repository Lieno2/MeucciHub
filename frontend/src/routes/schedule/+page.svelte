<script lang="ts">

    import { onMount} from "svelte";

    export let data: {
        classes:
            { id: string; name: string}[]
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

    async function loadTimetable(classId: string) {
        loading = true;
        error = '';
        try {
            const res = await fetch(`http://localhost:4000/api/schedule?classId=${classId}`);
            if (!res.ok) throw new Error(`Failed to fetch timetable: ${res.statusText}`);
            timetable = await res.json();
        } catch (e) {
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


</script>


<h1 class="text-white text-2xl sm:text-3xl sm:mb-6 w-full bg-gray-800 box-border text-center pt-5 rounded-[60px] border border-gray-700">
    Orario della classe:
    <select
            bind:value={selectedClassId}
            on:change={onClassChange}
            class="mb-4 sm:mb-6 p-2 rounded bg-gray-800 text-white w-full sm:w-auto"
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
    <div class="overflow-auto">
        <div
                class="min-w-[600px] grid grid-cols-6 gap-1 text-white text-xs sm:text-sm md:text-base"
        >
            <div></div>
            {#each days as dayName}
                <div class="text-center font-semibold border border-gray-700 p-2 bg-gray-800">
                    {dayName}day
                </div>
            {/each}

            {#each timeSlots as time}
                <div
                        class="border border-gray-700 p-1 sm:p-2 bg-gray-800 font-mono text-center whitespace-nowrap"
                >
                    {time}
                </div>

                {#each days as _, dayIndex}
                    <div class="border border-gray-700 p-1 sm:p-2 min-h-[60px] bg-gray-900">
                        {#each getLessons(dayIndex, time) as lesson}
                            <div class="mb-1 rounded p-1 transition">
                                <div class="font-bold truncate">{lesson.subject}</div>
                                <div class="text-xs truncate">{lesson.teacher}</div>
                                <div class="text-xs italic truncate">{lesson.room}</div>
                            </div>
                        {/each}
                    </div>
                {/each}
            {/each}
        </div>
    </div>
{/if}
