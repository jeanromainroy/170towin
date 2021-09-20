<script>

    // properties
    export let lang;
    export let districts_geojson;
    export let parties;
    export let results;
    export let title;

    // d3 lib
    import * as d3 from 'd3';

    // leaflet
    import * as L from 'leaflet';

    // import svelte components
    import Map from '../dataviz/Map/Map.svelte';
    import Table from '../components/Table.svelte';
    import Button from '../components/Button.svelte';

    // import ui libs
    import { onMount } from 'svelte';

    // is mobile
    import { isMobile } from '../libs/system';
    const _isMobile = isMobile();

    // constants
    const opacity_clicked = 0.7;
    const TT = ['YT', 'NT', 'NU']

    // variables
    let g, map, svg, tooltip, projection;
    let paths;
    let wasDragged = false;

    // create a color scale using the parties
    const color = d3.scaleOrdinal(parties.map(p => p['color'])).domain(parties.map(p => p['key']));

    // create a dict of all provinces (change territories to TT)
    const provinces = [...new Set(districts_geojson.features.map(f => f['properties']['CODEPROV']))].filter(p => !TT.includes(p)).sort()
    provinces.push('TT');

    // create mapping of the parties
    const parties_map = {}
    parties.forEach(party => parties_map[party['key']] = party)

    // create a mapping of the results
    const results_map = {}
    results.forEach(r => results_map[+r['Electoral District Number/Numéro de circonscription']] = r)
    Object.keys(results_map).forEach(k => {
        const elected = results_map[k]['Elected Candidate/Candidat élu']
        if (elected.includes('Conservative')){
            results_map[k]['party'] = 'CPC'
        }else if (elected.includes('Liberal')){
            results_map[k]['party'] = 'LPC'
        }else if (elected.includes('Bloc Québécois')){
            results_map[k]['party'] = 'BQ'
        }else if (elected.includes('NDP')){
            results_map[k]['party'] = 'NDP'
        }else if (elected.includes('Green Party')){
            results_map[k]['party'] = 'GPC'
        }else{
            results_map[k]['party'] = null
        }
    })

    // init seat count
    let seats = {}
    let seats_tabular = null;
    let nbr_districts = 0;
    let nbr_districts_selected = 0;


    function getToolTipText (d) {
        const { NOMSEN, NOMSFR, CODEPROV } = d['properties']
        return `${lang === 'eng' ? NOMSEN : NOMSFR}<br><p style='font-size: 12px;'>${CODEPROV}</p>`
    }

    function reset(){
        reset_count();
        reset_map();
        setResults();
        update_count();
        update_title();
        update_table();
    }

    function reset_map(){
        g.selectAll('path')
            .each(function(){
                // reset
                d3.select(this)
                    .attr('data-party-index', -1)
                    .attr('data-party', undefined)
                    .style('fill', '#333333')
                    .style('fill-opacity', 0.0);
            })
    }

    function reset_count(){
        parties.forEach(p => {
            seats[p['key']] = {}
            provinces.forEach(pro => {
                seats[p['key']][pro] = 0
            })
            seats[p['key']]['TT'] = 0
            seats[p['key']]['total'] = 0
        })
    }

    function get_districs_data_from_map(){

        // get all the electoral districts
        const _districts = d3.selectAll('path').nodes().map(n => {

            // get data
            const { UID, province, party } = n.dataset;

            return {
                'party': party,
                'UID': UID,
                'province': province
            }
        });

        // keep unique
        const districts = {}
        _districts.forEach(d => {
            if (d['UID'] === undefined) return;
            districts[d['UID']] = d
        })

        // convert to arr
        return Object.keys(districts).map(k => districts[k]);
    }

    function update_title(){

        // group seats by parties
        const counts = Object.keys(seats).map(party => {
            return [party, +seats[party]['total']]
        })

        // sort in descending order
        counts.sort((a, b) => b[1] - a[1])

        // set title
        if (counts[0][1] === counts[0][2]){
            title = 'Hung parliament'
        }else if(counts[0][1] >= 170){
            title = `${counts[0][0]} majority`
        }else if(counts[0][1] < 170){
            title = `${counts[0][0]} minority`
        }
    }

    function update_count(){

        // get data from map districts
        const districts = get_districs_data_from_map();

        // reset to 0
        reset_count();

        // set topline metrics
        nbr_districts = districts.length;
        nbr_districts_selected = districts.filter(d => d['party'] !== undefined && d['party'] !== null).length;

        // grab data from map
        Object.keys(districts).forEach(UID => {
            const district = districts[UID]
            const party = district['party'] === undefined || district['party'] === null ? null : district['party']
            const province = TT.includes(district['province']) ? 'TT' : district['province'];
            if (party === null) return;
            seats[district['party']][province] += 1
            seats[district['party']]['total'] += 1
        })
    }

    function update_table(){

        // create headers
        const headers = provinces.map(p => p)
        headers.unshift('Canada')
        headers.unshift('')

        // create values
        const values = parties.map(party => {
            const row = provinces.map(province => {
                return seats[party['key']][province]
            })
            row.unshift(seats[party['key']]['total'])
            row.unshift(party['short_name'][lang])
            return row
        })

        // set
        seats_tabular = [headers, ...values];
    }

    function drawMask(){

        L.Mask = L.Polygon.extend({
            options: {
                outerBounds: new L.LatLngBounds([-90, -360], [90, 360])
            },
            initialize: function (latLngs, options) {
                var outerBoundsLatLngs = [
                    this.options.outerBounds.getSouthWest(),
                    this.options.outerBounds.getNorthWest(),
                    this.options.outerBounds.getNorthEast(),
                    this.options.outerBounds.getSouthEast()
                ];
                L.Polygon.prototype.initialize.call(this, [outerBoundsLatLngs, latLngs], options);
            }
        });

        L.mask = function (latLngs, options) {
            return new L.Mask(latLngs, options);
        };

        let latlngs = [];
        const polygons = districts_geojson.features.map(f => f.geometry).filter(d => d !== null && d !== undefined).map(d => d.coordinates);
        polygons.forEach(_polygons => {
            _polygons.forEach(polygon => {
                if (polygon[0].length > 2) {
                    polygon.forEach(_polygon => {
                        const _latlngs = _polygon.map(p => {
                            return new L.LatLng(p[1], p[0])
                        });
                        latlngs.push(_latlngs);
                    })
                }else{
                    const _latlngs = polygon.map(p => {
                        return new L.LatLng(p[1], p[0])
                    });
                    latlngs.push(_latlngs);
                }
            })
        });

        L.mask(latlngs).addTo(map);

        // style
        const layer = document.getElementsByClassName('leaflet-interactive');
        layer[0].style.fillOpacity = 1.0
        layer[0].style.fill = "#fff"
        layer[0].style.cursor = "default"
    }

    function drawPaths(){

        // prevent click on drag
        map.on('dragend', function(e){
            wasDragged = true;
            setTimeout(() => {
                wasDragged = false;
            }, 200);
        });

        // draw boundaries
        g.selectAll('path')
            .data(districts_geojson.features)
            .enter()
            .append('path')
            .each(function(d){
                d3.select(this).attr('data-party-index', -1)
                d3.select(this).attr('data-UID', d['properties']['NUMCF'])
                d3.select(this).attr('data-province', TT.includes(d['properties']['CODEPROV']) ? 'TT' : d['properties']['CODEPROV'])
            })
            .attr('d', projection)
            .attr("style", "pointer-events: auto") // pointer event is disabled by default
            .on('mouseover', function(_, d){
                if (_isMobile) return;
                const html = getToolTipText(d);
                if(html === null) return;
                tooltip.show();
                tooltip.html(html);
            })
            .on('mousemove', (event) => {
                if (_isMobile) return;
                tooltip.move(event)
            })
            .on('mouseout', function(){
                if (_isMobile) return;
                tooltip.hide();
            })
            .on('click', function(){
                if(wasDragged) return;

                // get data
                const UID = d3.select(this).attr('data-UID')
                const partyIndex = d3.select(this).attr('data-party-index')

                // increment index
                let index = (+partyIndex + 1) % parties.length;

                // new party
                const new_party = parties[index]['key']

                // new color
                const new_color = color(new_party)

                // get all paths with this UID
                const paths = d3.selectAll('path').filter(function(){
                    const _UID = +d3.select(this).attr('data-UID');
                    return +_UID === +UID
                })

                paths
                    .attr('data-party-index', index)
                    .attr('data-party', new_party)
                    .style('fill', new_color)
                    .style('fill-opacity', opacity_clicked);

                // update the count of each party
                update_count();

                // update table
                update_table();

                // update title
                update_title();
            })
    }

    function setResults(){
        g.selectAll('path')
            .each(function(){
                const NUMCF = +d3.select(this).data()[0]['properties']['NUMCF'];
                const less_than_5 = results_map[NUMCF]['Less than 5 %'].length > 0
                const key = results_map[NUMCF]['party']
                if (key === null || less_than_5) return;

                d3.select(this)
                    .attr('data-party', key)
                    .style('fill', parties_map[key]['color'])
                    .style('fill-opacity', opacity_clicked);
            })
    }

    onMount(() => {

        // draw paths
        drawPaths();

        // draw mask
        drawMask();

        // reset
        reset();
    })

    const cell_func = function(cell, val, row_id, col_id){
        if(+col_id > 0) return;
        cell.style.fontWeight = '700'
        cell.style.color = parties[+row_id]['color'];
    }

</script>


<!-- The Map -->
<div id="mapcontainer">
    <Map bind:projection={projection} bind:map={map} bind:paths={paths} bind:svg={svg} bind:g={g} bind:tooltip={tooltip}/>
</div>
<p>{nbr_districts_selected}/{nbr_districts}</p>

<br><br>


<!-- The seats count -->
<Table data={seats_tabular} download_button={false} cell_func={cell_func}/>

<Button onclick={() => { reset(); }} string_key='reset' bind:lang={lang}/>
<br>

<style>

    #mapcontainer{
        position: relative;
        width: 65vw;
        height: 65vh;
        margin: auto;
        background-color: white;
    }

</style>