<script>

    // properties
    export let lang;
    export let title;

    // import components
    import Loader from '../components/Loader.svelte';

    // import pages
    import MapContainer from './MapContainer.svelte';

    // import ui lib
    import { onMount } from 'svelte';

    // locale lib
    import { getString } from '../libs/locale';

    // http lib
    import { getRequestWrapper } from '../libs/http.js';

    // data
    let districts_geojson;
    let parties;
    let results;

    // ui logic
    let ready = false;
    let init_successful = false;

    async function load_data(){
        districts_geojson = await getRequestWrapper('assets/data/electoral-districts.geojson', 'eng')
        parties = await getRequestWrapper('assets/data/parties.json', 'eng')
        results = await getRequestWrapper('assets/data/results_2019.json', 'eng')

        return districts_geojson !== null && parties !== null && results !== null;
    }

    onMount(async () => {

        // load data
        init_successful = await load_data();

        // set ready flag
        ready = true;
    })

</script>


<!-- Where the pages go -->
{#if ready}
    {#if init_successful}
        <main>
            <p class="title" style="text-align: center; margin-bottom: 32px;">{getString(lang, 'title')}</p>
            <div class="description">
                {@html getString(lang, 'description')}
            </div>
            <MapContainer bind:lang={lang} bind:title={title} parties={parties} districts_geojson={districts_geojson} results={results}/>
        </main>
    {/if}
{:else}
    <Loader/>
{/if}


<style>

    main {
        text-align: center;
        padding: 1em;
        margin: 32px auto 0px;
    }

    .description {
        margin: auto;
        max-width: var(--max-width-large);
        padding-bottom: 48px;
        text-align: justify;
    }

</style>