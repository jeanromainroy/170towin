<script>

    // properties
    export let lang;
    export let districts_geojson;
    export let parties;

    // d3 lib
    import * as d3 from 'd3';

    // leaflet
    import * as L from 'leaflet';

    // import svelte components
    import Map from '../dataviz/Map/Map.svelte';
    import Table from '../components/Table.svelte';

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

    // init seat count
    let seats = {}
    let seats_tabular = null;

    function getToolTipText (d) {
        const { NOMSEN, NOMSFR, CODEPROV } = d['properties']
        return `${lang === 'eng' ? NOMSEN : NOMSFR}<br><p style='font-size: 12px;'>${CODEPROV}</p>`
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

    function update_count(){

        // reset to 0
        reset_count();

        // grab data from map
        Object.keys(seats).forEach(key => {
            const _provinces = d3.selectAll('path').filter(function(){
                const _key = d3.select(this).attr('data-party');
                return key == _key;
            }).nodes().map(n => n.dataset.province);
            _provinces.forEach(p => {
                seats[key][p] += 1
                if (TT.includes(p)) {
                    seats[key]['TT'] += 1
                }
            })
            seats[key]['total'] = _provinces.length
        })
    }

    function update_table(){

        // create headers
        const headers = provinces.map(p => p)
        headers.unshift('Total')
        headers.unshift('')

        // create values
        const values = parties.map(party => {
            const row = provinces.map(province => {
                return seats[party['key']][province]
            })
            row.unshift(seats[party['key']]['total'])
            row.unshift(party['key'])
            return row
        })

        // set
        seats_tabular = [headers, ...values];
    }

    function update_table_old(){

        // create headers
        const headers = parties.map(p => p['key'])
        headers.unshift('Provinces')

        // create values
        const values = provinces.map(province => {
            const row = parties.map(party => {
                return seats[party['key']][province]
            })
            row.unshift(province)
            return row
        })
        const totals = parties.map(party => {
            return seats[party['key']]['total']
        })
        totals.unshift('Total')

        // set
        seats_tabular = [headers, totals, ...values];
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

                // increment index
                let index = +d3.select(this).attr('data-party-index')
                index = (index + 1) % parties.length;

                // new party
                const new_party = parties[index]['key']

                // new color
                const new_color = color(new_party)

                // set
                d3.select(this)
                    .attr('data-party-index', index)
                    .attr('data-party', new_party)
                    .style('fill', new_color)
                    .style('fill-opacity', opacity_clicked);

                // update the count of each party
                update_count();

                // update table
                update_table();
            })
    }

    onMount(() => {

        // draw paths
        drawPaths();

        // draw mask
        drawMask();

        // update count
        update_count();

        // update table
        update_table();
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
<br><br>

<!-- The seats count -->
<Table data={seats_tabular} download_button={false} cell_func={cell_func}/>

<br>

<style>

    #mapcontainer{
        position: relative;
        width: 80vw;
        height: 65vh;
        margin: auto;
        background-color: white;
    }

</style>