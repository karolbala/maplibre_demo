import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [19.92, 50.065],
      zoom: 13,
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('error', (e) => {
      console.error('Map error:', e);
    });

    map.on("load", async () => {
      console.log('Map loaded');


      map.addSource('terrainSource', {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        ],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14
      });


      map.setTerrain({
        source: 'terrainSource',
        exaggeration: 1.5
      });
      console.log('Terrain set');

      // Load markers
      const response = await fetch('/markers.geojson');
      const markersData = await response.json();
      console.log('Markers loaded:', markersData);

      // Add source with clustering enabled
      map.addSource("points", {
        type: "geojson",
        data: markersData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Add cluster circles layer
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "points",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#51bbd6",
            10,
            "#f1f075",
            30,
            "#f28cb1",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            10,
            30,
            30,
            40,
          ],
        },
      });


      
      // Add cluster count labels
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "points",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Add unclustered point layer
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 8,
          "circle-color": "#ff0000",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      
      

    
map.on("click", "unclustered-point", (e) => {
  const feature = e.features?.[0];
  if (!feature) return;

  const coords = (feature.geometry as any).coordinates as [number, number];
  const props = feature.properties || {};

  const popupContent = `
    <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 150px;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
        ${props.name || 'Unnamed Location'}
      </h3>
      ${props.description ? `<p style="margin: 0; font-size: 14px; color: #666; line-height: 1.4;">${props.description}</p>` : ''}
    </div>
  `;

  new maplibregl.Popup({
    offset: 25,
    closeButton: true,
    closeOnClick: true
  })
    .setLngLat(coords)
    .setHTML(popupContent)
    .addTo(map);

  // Save default camera view
  const defaultView = {
    center: [19.92, 50.065],
    zoom: 13,
    pitch: 0,
    bearing: 0
  };

  // Fly to selected point
  map.flyTo({
    center: coords,
    zoom: 18,
    pitch: 60,
    bearing: map.getBearing(),
    duration: 2100,
    essential: true
  });

  // After 3 seconds, return to default
    setTimeout(() => {
    map.flyTo({
      ...defaultView,
      duration: 2000,
      essential: true
      });
  }, 3000);
    });


      map.on("mouseenter", "unclustered-point", () => {
  map.getCanvas().style.cursor = "pointer";
});


    });

    return () => map.remove();
  }, []);

  return (
    <div 
      ref={mapContainer} 
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '100%'
      }}
    />
  );
}

export default App;