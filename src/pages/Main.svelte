<script>

    // properties
    export let lang;

    // import components
    import Loader from '../components/Loader.svelte';

    // import pages
    import MapContainer from './MapContainer.svelte';

    // import ui lib
    import { onMount } from 'svelte';

    // http lib
    import { getRequestWrapper } from '../libs/http.js';

    // data
    let districts_geojson;
    let parties;

    // ui logic
    let ready = false;
    let init_successful = false;

    async function load_data(){
        districts_geojson = await getRequestWrapper('assets/data/electoral-districts.geojson', 'eng')
        parties = await getRequestWrapper('assets/data/parties.json', 'eng')
        return districts_geojson !== null && parties !== null;
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
            <MapContainer bind:lang={lang} parties={parties} districts_geojson={districts_geojson}/>
        </main>
    {/if}
{:else}
    <Loader/>
{/if}


<style>

    main {
        text-align: center;
        padding: 1em;
        margin: 64px auto 0px;
    }

</style>