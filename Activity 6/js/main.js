// declares map variable globally so all functions have access
var map;

// function to instantiate the Leaflet map
function createMap() {
    // create the map with a center and zoom level that showcases Wisconsin
    // central location in Wisconsin
    map = L.map('map').setView([44.500000, -89.500000], 6); 
    
    // adds OpenStreetMap base tile layer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    // calls the getData function to load and displays GeoJSON data
    getData();
}

// function that retrieves the data and places it on the map
function getData() {
    // loads the GeoJSON file
    fetch('data/map.geojson') 
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        var geojsonMarkerOptions = {
            radius: 8,
            fillColor: "#ff7800",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        };

        // creates a Leaflet GeoJSON layer and adds it to the map
        L.geoJson(data, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, geojsonMarkerOptions);
            },
            onEachFeature: function (feature, layer) {
                // dynamically creates a popup for each feature
                var popupContent = "<b>" + feature.properties.City + "</b><br>1980: " +
                feature.properties.Pop_1980 + "<br>1990: " + feature.properties.Pop_1990 +
                "<br>2000: " + feature.properties.Pop_2000 + "<br>2010: " +
                feature.properties.Pop_2010;

                // binds the popup to the layer and shows it on mouseover
                layer.bindPopup(popupContent);
                layer.on('mouseover', function (e) {
                    this.openPopup();
                });
                layer.on('mouseout', function (e) {
                    this.closePopup();
                });
            }
        }).addTo(map);
    });
}

// ensures the DOM is fully loaded before creating the map
document.addEventListener('DOMContentLoaded', createMap);