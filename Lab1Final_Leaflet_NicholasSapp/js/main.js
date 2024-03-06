// Defines global variables
var map;
var minValues; // Holds minimum values for population and crime for scaling symbols

// Initializes the map and adds base layers and controls
function createMap() {
    // Create a map instance with a center point and zoom level
    map = L.map('map').setView([37.8, -96], 3);

    // Adds OpenStreetMap tiles as the base layer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    // Custom Control for Map Title
    var mapTitle = new L.Control({position: 'topright'});
    mapTitle.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'map-title');
        div.innerHTML = '<h2>Violent Crimes per 100,000 People</h2>';
        return div;
    };
    mapTitle.addTo(map);

    // Fetches and processes data to be visualized
    getData();
}

// Calculates the minimum values for population and crime from the dataset
function calcMinValue(data) {
    var popValues = [];
    var crimeValues = [];
    data.features.forEach(feature => {
        Object.keys(feature.properties).forEach(attr => {
            if (attr.startsWith("Pop")) popValues.push(feature.properties[attr]);
            else if (attr.startsWith("Crime")) crimeValues.push(feature.properties[attr]);
        });
    });
    minValues = {
        popMin: Math.min(...popValues),
        crimeMin: Math.min(...crimeValues)
    };
}

// Calculates the radius of the symbols based on attribute values
function calcPropRadius(attValue, minValue) {
    var minRadius = 5; // Minimum radius size
    // Calculates radius size using a scaling factor and root transformation
    return 1.0083 * Math.pow(attValue / minValue, 0.5715) * minRadius;
}

// Generates a circle marker for each data point
function pointToLayer(feature, latlng, attribute) {
    // Determine fill color based on the attribute type (population or crime)
    var attributeType = attribute.split("_")[0];
    var options = {
        fillColor: attributeType.startsWith("Pop") ? "#ff7800" : "#ff0000",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
        radius: calcPropRadius(Number(feature.properties[attribute]), minValues[attributeType === "Pop" ? "popMin" : "crimeMin"])
    };

    var layer = L.circleMarker(latlng, options);
    var popupContent = `<p><b>City:</b> ${feature.properties.City}</p>
                        <p><b>${attributeType} in ${attribute.split("_")[1]}:</b> ${feature.properties[attribute]}</p>`;
    layer.bindPopup(popupContent);
    return layer;
}

// Creates proportional symbols for each attribute
function createPropSymbols(data, attributes) {
    calcMinValue(data);
    attributes.forEach(attribute => {
        L.geoJson(data, {
            pointToLayer: function(feature, latlng) {
                return pointToLayer(feature, latlng, attribute);
            }
        }).addTo(map);
    });
}

// Updates the map symbols based on user interaction (e.g., slider input)
function updatePropSymbols(attribute, type) {
    map.eachLayer(layer => {
        if (layer.feature && layer.feature.properties[attribute]) {
            var props = layer.feature.properties;
            var attributeType = type;
            var minValue = minValues[attributeType === "Population" ? "popMin" : "crimeMin"];
            var radius = calcPropRadius(props[attribute], minValue);
            layer.setRadius(radius);

            var fillColor = attributeType === "Population" ? "#ff7800" : "#ff0000";
            layer.setStyle({ fillColor: fillColor });

            var popupContent = `<p><b>City:</b> ${props.City}</p>
                                <p><b>${attributeType} in ${attribute.split("_")[1]}:</b> ${props[attribute]}</p>`;
            layer.getPopup().setContent(popupContent);
        }
    });
}

// Processes data to extract relevant attributes for visualization
function processData(data) {
    var attributes = Object.keys(data.features[0].properties).filter(attr => attr.startsWith("Pop") || attr.startsWith("Crime")).sort();
    return attributes;
}

// Creates sequence controls for user interaction
function createSequenceControls(attributes) {
    var popAttributes = attributes.filter(attr => attr.startsWith("Pop"));
    var crimeAttributes = attributes.filter(attr => attr.startsWith("Crime"));

    // Initialize slider controls for population and crime attributes
    createSliderWithStepButtons(popAttributes, 'population', 'Population');
    createSliderWithStepButtons(crimeAttributes, 'crime', 'Crime');
}

// Creates sliders with step buttons for attribute navigation
function createSliderWithStepButtons(attributes, idPrefix, type) {
    var container = document.getElementById(idPrefix + '-slider');
    var slider = document.createElement("input");
    slider.type = "range";
    slider.className = "range-slider";
    slider.id = idPrefix + "Slider";
    slider.min = 0;
    slider.max = attributes.length - 1;
    slider.value = 0;
    slider.step = 1;

    var decreaseButton = document.createElement("button");
    decreaseButton.textContent = "<";
    decreaseButton.className = "step-button";
    decreaseButton.onclick = function() {
        if (slider.value > 0) {
            slider.value--;
            updatePropSymbols(attributes[slider.value], type);
        }
    };

    var increaseButton = document.createElement("button");
    increaseButton.textContent = ">";
    increaseButton.className = "step-button";
    increaseButton.onclick = function() {
        if (slider.value < attributes.length - 1) {
            slider.value++;
            updatePropSymbols(attributes[slider.value], type);
        }
    };

    // Add elements to the UI
    container.appendChild(decreaseButton);
    container.appendChild(slider);
    container.appendChild(increaseButton);

    // Update map symbols based on slider input
    slider.addEventListener('input', function() {
        updatePropSymbols(attributes[this.value], type);
    });
}

// Creates a map legend to explain symbol colors and sizes
function createLegend() {
    var legend = L.control({position: 'bottomright'});

    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend');
        var labels = ['<strong>Legend</strong>'];
        var categories = ['Population', 'Crime'];
        var colors = ['#ff7800', '#ff0000']; 
        var sizes = [20, 15]; 
        
        categories.forEach(function (category, index) {
            labels.push('<i class="circle" style="background:' + colors[index] + '; width: ' + sizes[index] + 'px; height: ' + sizes[index] + 'px; border-radius: 50%; display: inline-block;"></i> ' + category);
        });

        div.innerHTML = labels.join('<br>');
        return div;
    };

    legend.addTo(map);
}

// Creates a dropdown menu for selecting cities
function createCityDropdown(data) {
    var selector = document.getElementById('city-selector');
    var select = document.createElement('select');
    select.id = 'citySelect';
    select.innerHTML = data.features.map(feature => `<option value="${feature.properties.City}">${feature.properties.City}</option>`).join('');
    selector.appendChild(select);

    var defaultOption = document.createElement('option');
    defaultOption.selected = true;
    defaultOption.disabled = true;
    defaultOption.textContent = 'Select a city...';
    select.prepend(defaultOption);

    select.addEventListener('change', function() {
        var selectedCity = this.value;
        var selectedFeature = data.features.find(feature => feature.properties.City === selectedCity);
        if (selectedFeature) {
            map.setView([selectedFeature.geometry.coordinates[1], selectedFeature.geometry.coordinates[0]], 10); // Center map on selected city
        }
    });
}

// Fetches data and initializes map visualization
function getData() {
    fetch("data/crime.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            var attributes = processData(json);
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
            createLegend();
            createCityDropdown(json);
            createDataSourceTextBox();
        });
}

// Defines the function to create the data source text box
function createDataSourceTextBox() {
    var infoContainer = document.getElementById('map'); 
    var textBox = document.createElement("div");
    textBox.style.position = "absolute";
    textBox.style.right = "10px"; 
    textBox.style.bottom = "200px"; 
    textBox.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
    textBox.style.padding = "10px";
    textBox.style.borderRadius = "5px";
    textBox.style.maxWidth = "275px";
    textBox.style.zIndex = 500;
    textBox.classname = 'data-source-textbook';
    textBox.innerHTML = "All population and crime data was found at <a href='https://www.disastercenter.com/crime/mocrimn.htm' target='_blank'>https://www.disastercenter.com/crime/mocrimn.htm</a>. The 20 cities were taken from <a href='https://sports.yahoo.com/20-cities-united-states-highest-160029176.html' target='_blank'>https://sports.yahoo.com/20-cities-united-states-highest-160029176.html</a>. I could not find crime stats for Anchorage so I replaced it with Madison.";
    infoContainer.appendChild(textBox);
}

// Initializes the map after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', createMap);
