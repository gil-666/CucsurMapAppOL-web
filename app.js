//VALUES
import { DatabaseHelper } from './DatabaseHelper.js'; // Update the path if necessary
import { sharedProperty } from './sharedProperty.js'; // Update the path if necessary
import { WebAppInterface } from './WebAppInterface.js'; // Ensure this path is correct

const db = new DatabaseHelper('cucsur_data.db');
const sharedPropertya = new sharedProperty(); // Initialize with default values
export const inter = new WebAppInterface(db, sharedPropertya);

(async function () {
    window.App = inter;
})();
let isEdificiosLoaded = false;
var initialZoom = 17;
var roomTriggerZoom = 19;
var roomVectorSource = null;
var roomLayer = null;
var rooms = [];
var edificios = [];
var arrowControlSource = new ol.source.Vector();
var arrowLayer = new ol.layer.Vector({
    source: arrowControlSource
});

var currentHiddenFeature = null;
var edificioVerticeLayer = null;

var currentClickedFeature = [];

//SHAPES GO HERE

var selectedFloor = 1 //SELECTED FLOOR VALUE

var bounds = ol.proj.transformExtent(
    [-104.35944, 19.772676, -104.357180, 19.77638],  // [minx, miny, maxx, maxy] EPSG:4326 
    'EPSG:4326',           // source PROJECTIONS
    'EPSG:3857'            // destination
);

var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([-104.35848, 19.77473]),
        zoom: initialZoom,
        extent: bounds
    })
});

//TODO: CLEAN UP THIS SHIT
const geolocation = new ol.Geolocation({
    trackingOptions: {
        enableHighAccuracy: true,
    },
    projection: map.getView().getProjection(),
});

geolocation.setTracking(true); // Start tracking

geolocation.on('error', function (error) {
    const info = document.getElementById('info');
    info.innerHTML = error.message;
    info.style.display = 'block';
});

// Create accuracy and position features
const accuracyFeature = new ol.Feature();
const positionFeature = new ol.Feature();

// Set styles for the features
accuracyFeature.setStyle(
    new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
        })
    })
);

positionFeature.setStyle(
    new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: '#3399CC',
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 2,
            }),
        }),
    })
);

function updateLocation(json) {
    // Parse the JSON data
    let data = JSON.parse(json);
    let latitude = data.latitude;
    let longitude = data.longitude;

    // Update the OpenLayers Geolocation feature
    geolocation.setPosition([longitude, latitude]);
    view.setCenter(ol.proj.fromLonLat([longitude, latitude]));
}

geolocation.on('change:accuracyGeometry', function () {
    accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
});

geolocation.on('change:position', function () {
    const coordinates = geolocation.getPosition();
    positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
    console.log('Geolocation coordinates:', coordinates); // Log coordinates
});

var vectorSource = new ol.source.Vector();
var vectorLayer = new ol.layer.Vector({
    source: vectorSource
});

var vectorGPS = new ol.source.Vector();
var GPSLayer = new ol.layer.Vector({
    source: vectorGPS
});

vectorGPS.addFeature(accuracyFeature);
vectorGPS.addFeature(positionFeature);

map.addLayer(vectorLayer);
map.addLayer(GPSLayer);

async function addEdificio(lon, lat, nombre, image, id, pisos, v1, v2, v3, v4, tipo) {
    try {

        var salones = JSON.parse(await App.getEdificioSalones(id));
        var edificio = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([lat, lon])),
            nombre: nombre,
            pisos: pisos,
            id: id,
            v1: v1,
            v2: v2,
            v3: v3,
            v4: v4,
            tipo: tipo,
            image: image,
            salones: salones
        });



        var edificioStyle = new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 1],
                src: 'data:image/png;base64,' + image,
                scale: 1
            })
        });

        edificio.setStyle(edificioStyle);
        edificios.push(edificio);
        vectorSource.addFeature(edificio);
        console.log("Added edificio with id:" + edificio.get('id'));
        console.log("edificios", edificios);
        console.log("salones: ", salones);

        await addRoomsInPolygon(edificio, salones, selectedFloor);
        await drawBuildingStoryControl(edificio);
    } catch (error) {
        console.error("error! while adding ", error);
    }
}

async function addEdificiosFromApp() {
    if (isEdificiosLoaded) {
        console.log("Edificios already loaded, skipping");
        return;
    }
    var edificios = JSON.parse(await App.getEdificios());
    edificios.forEach(function (edificio) {
        addEdificio(edificio.lon, edificio.lat, edificio.nombre, edificio.image, edificio.id, edificio.pisos, edificio.v1, edificio.v2, edificio.v3, edificio.v4, edificio.tipo);
    });
    isEdificiosLoaded = true;
}

document.addEventListener('DOMContentLoaded', (event) => { //waits for map content then loads data
    addEdificiosFromApp();

});
var searchBoxOpen = false;
document.addEventListener("DOMContentLoaded", async function () { //Listens for typing in search bar
    const searchBar = document.getElementById("searchQueryInput");
    const resultBox = document.getElementById("resultBox");
    searchBar.addEventListener("input", async function (event) {
        const searchTerm = event.target.value;
        console.log("User typed: " + searchTerm);
        resultBox.style.display = 'block';
        await handleSearch(searchTerm);
    });
    searchBar.addEventListener("click", async function (event) {
        await handleSearch("");
        event.target.value = "";
        searchBoxOpen = true;
    });
    if (await App.getSalonid() != "") {
        await travelToSalon(await getSalonFeaturefromID(await App.getSalonid()));
    }
});

async function handleSearch(searchTerm) {
    const searchBar = document.getElementById("searchBar");
    const resultBox = document.getElementById("resultBox");
    const resultList = document.getElementById("resultListinMap");
    resultBox.style.display = 'block';
    var results = JSON.parse(await App.getEdificioSearch(searchTerm));
    results.push(...JSON.parse(await App.getSalonSearch(searchTerm)));
    console.log("Search results: ", results);
    // document.getElementById("result-text").textContent = results[0].nombre
    resultList.innerHTML = '';
    results.forEach(function (result) {
        var item = document.createElement("li");
        item.className = 'result-li-item';
        item.textContent = result.nombre;
        resultList.appendChild(item);

        if (result.tipo != "edificio") {
            item.addEventListener("click", function (event) { //attaches a click event for every item
                console.log("click! ", result.nombre);
                resultBox.style.display = 'none';
                travelToSalon(result);

            });
        } else {
            item.addEventListener("click", function (event) { //attaches a click event for every item
                map.removeLayer(edificioVerticeLayer)//deletes previous building borders before creating new ones
                console.log("click! ed ", result.nombre);
                resultBox.style.display = 'none';
                travelToEdificio(result);

            });
        }

    });
};

async function travelToEdificio(edificio) {
    console.log("traveling to id ", edificio.id);
    edificios.forEach(function (ed) {
        if (edificio.id == ed.get('id')) {
            console.log("match!");
            zoomToRoom(ed, initialZoom, 1500);
            showBuildingBorders(ed);
            showPopup(ed);
        }
    });
}

async function travelToSalon(salon) {
    var view = map.getView();
    var highlighted = false;

    rooms.forEach(async function (room) {
        if (!highlighted && room.get('salonid') == salon.salonid) {
            zoomToRoom(room, 20, 1500);
            highlightSalon(room);



            highlighted = true;
        } else {
            if (salon.piso != selectedFloor) {//if clicked room does not belong in the current displayed floor

                for (var i = rooms.length - 1; i >= 0; i--) {
                    if (rooms[i].get('piso') == selectedFloor && rooms[i].get('edificioid') == salon.edificio_edificioid) {
                        console.log("removed room: ", rooms[i].get('nombre'));
                        rooms.splice(i, 1); // Removing index i

                    }
                }
                map.removeLayer(roomLayer);

                selectedFloor = salon.piso; //set selected floor to the current searched room
                console.log("selected floor: ", selectedFloor);
                var edificioSearched = getEdificioFeaturefromID(salon.salonid);
                console.log("edificio object:", edificioSearched);
                console.log("edificio searched name:", edificioSearched.get('nombre'))
                await addRoomsInPolygon(edificioSearched, edificioSearched.get('salones'), selectedFloor);//TODO: make function that returns the edificio object for the salon that it belongs to

                if (!highlighted) {
                    travelToSalon(salon);
                    highlighted = true; // Set flag to true to avoid recursion
                }

            }

        }
    });
}

async function highlightSalon(room) {
    var currentHiddenRoomStyle = room.getStyle();
    console.log("original style: ", JSON.stringify(currentHiddenRoomStyle, null, 2));
    var textStyle = Array.isArray(room.getStyle()) ? room.getStyle()[0].getText() : room.getStyle().getText();
    var roomHighlight = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'blue',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0, 0, 255, 0.8)'
        }),
        text: textStyle
    });

    room.setStyle(roomHighlight);
    currentClickedFeature = [];
    currentClickedFeature.push(room);

    showPopup(room, "salon");

    var onMapClick = function (event) {
        var feature = map.forEachFeatureAtPixel(event.pixel, function (feature) {
            return feature;
        }, {
            hitTolerance: 10
        });

        // If no feature is clicked, revert the room style
        if (!feature) {
            room.setStyle(currentHiddenRoomStyle);
            console.log("Reverting to original style", JSON.stringify(currentHiddenRoomStyle, null, 2));
            currentClickedFeature = [];
            // Remove this click listener after it's executed
            map.un('click', onMapClick);
        }
        else if (feature && currentClickedFeature != null) {
            if (currentClickedFeature.length > 0) {
                currentClickedFeature[0].setStyle(currentHiddenRoomStyle);
            }

            map.un('click', onMapClick);
        }
    };

    // Ensure the click event listener is only added once
    map.on('click', onMapClick);
}

async function showFeature(feature) {
    var edificioStyle = new ol.style.Style({
        image: new ol.style.Icon({
            anchor: [0.5, 1],
            src: 'data:image/png;base64,' + feature.get('image'),
            scale: 1
        })
    });
    feature.setStyle(edificioStyle);
}

async function hideFeature(feature) {
    feature.setStyle(new ol.style.Style({
        display: 'none'
    }));
}

async function addRoomsInPolygon(edificio, salones, selectedFloor) {
    var v11 = ol.proj.fromLonLat(edificio.get('v1').split(',').map(Number));
    var v22 = ol.proj.fromLonLat(edificio.get('v2').split(',').map(Number));
    var v33 = ol.proj.fromLonLat(edificio.get('v3').split(',').map(Number));
    var v44 = ol.proj.fromLonLat(edificio.get('v4').split(',').map(Number));

    console.log("add rooms for ", edificio.get('nombre'));
    console.log("v1: ", v11);
    console.log("v2: ", v22);
    console.log("v3: ", v33);
    console.log("v4: ", v44);

    var minX = Math.min(v11[0], v22[0], v33[0], v44[0]);
    var minY = Math.min(v11[1], v22[1], v33[1], v44[1]);
    var maxX = Math.max(v11[0], v22[0], v33[0], v44[0]);
    var maxY = Math.max(v11[1], v22[1], v33[1], v44[1]);

    var viewableRooms = []
    for (var i = 0; i < Object.keys(salones).length; i++) {
        if (salones[i].piso == selectedFloor) {
            viewableRooms.push(salones[i])
        }
    }
    var width = maxX - minX;
    var filterPromises = viewableRooms.map(async (room) => {
        try {
            var customParams = JSON.parse(await App.getCustomParametersSalon(room.salonid));
            return !(customParams && customParams.length > 0) ? room : null;
        } catch (error) {
            console.error("Error fetching or parsing custom params for room ID", room.salonid, ":", error);
            return null;
        }
    });

    var filteredResults = await Promise.all(filterPromises);
    var filteredViewableRooms = filteredResults.filter(room => room !== null);

    var roomWidth = width / Object.keys(filteredViewableRooms).length;
    console.log("filtered length " + filteredViewableRooms.length);


    for (var i = 0; i < Object.keys(viewableRooms).length; i++) {
        var customParams;
        try {
            customParams = JSON.parse(await App.getCustomParametersSalon(viewableRooms[i].salonid));
        } catch (error) {
            console.error("Error parsing custom params for room ID", viewableRooms[i].salonid, ":", error);
            customParams = [];
        }

        var roomCoords;
        if (customParams && customParams.length > 0) {
            var customCoords = customParams[0];

            if (customCoords.v1 && customCoords.v2 && customCoords.v3 && customCoords.v4) {
                console.log("salon " + viewableRooms[i].nombre + " has custom params");
                var customV1 = ol.proj.fromLonLat(customCoords.v1.split(',').map(Number));
                var customV2 = ol.proj.fromLonLat(customCoords.v2.split(',').map(Number));
                var customV3 = ol.proj.fromLonLat(customCoords.v3.split(',').map(Number));
                var customV4 = ol.proj.fromLonLat(customCoords.v4.split(',').map(Number));
                roomCoords = [
                    customV1,
                    customV2,
                    customV3,
                    customV4
                ];
            }
        } else {
            var index = filteredViewableRooms.findIndex(room => room.salonid === viewableRooms[i].salonid);
            var roomMinX = minX - index * roomWidth + width;
            var roomMaxX = roomMinX - roomWidth;
            roomCoords = [
                [roomMinX, minY],
                [roomMaxX, minY],
                [roomMaxX, maxY],
                [roomMinX, maxY],
                [roomMinX, minY]
            ];
        }

        var roomPolygon = new ol.geom.Polygon([roomCoords]);
        var roomFeature = new ol.Feature({
            geometry: roomPolygon,
            edificio: edificio,
            salonid: viewableRooms[i].salonid,
            nombre: viewableRooms[i].nombre,
            descripcion: viewableRooms[i].descripcion,
            tipo: viewableRooms[i].tipo,
            piso: viewableRooms[i].piso,
            edificioid: viewableRooms[i].edificio_edificioid
        });

        setFeatureStyle(roomFeature);
        rooms.push(roomFeature);
    }

    console.log("pushed viewable", viewableRooms)
    roomVectorSource = new ol.source.Vector({
        features: rooms
    });
    roomLayer = new ol.layer.Vector({
        source: roomVectorSource
    });

    map.addLayer(roomLayer);
    roomLayer.setVisible(0);



    map.getView().on('change:resolution', function () {
        var zoom = map.getView().getZoom();
        // console.log("current zoom: " + zoom)
        roomLayer.setVisible(zoom >= roomTriggerZoom);
        if (zoom < roomTriggerZoom) {
            vectorLayer.setVisible(1);
            arrowLayer.setVisible(0);
        } else {
            vectorLayer.setVisible(0);
            arrowLayer.setVisible(1);
        }

    });

}





roomVectorSource = new ol.source.Vector({
    features: rooms
});
roomLayer = new ol.layer.Vector({
    source: roomVectorSource
});

map.addLayer(roomLayer);
roomLayer.setVisible(1);



map.getView().on('change:resolution', function () {
    var zoom = map.getView().getZoom();
    // console.log("current zoom: " + zoom)
    roomLayer.setVisible(zoom >= roomTriggerZoom);
    if (zoom < roomTriggerZoom) {
        vectorLayer.setVisible(1);
        arrowLayer.setVisible(0);
    } else {
        vectorLayer.setVisible(0);
        arrowLayer.setVisible(1);
    }

});


function splitTextIntoLines(text, maxLength) {
    let lines = [];
    let currentLine = '';

    text.split(' ').forEach(word => {
        if ((currentLine + word).length <= maxLength) {
            currentLine += (currentLine ? ' ' : '') + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

function createDynamicTextStyle(text, fontSize) {
    const maxLineLength = 9; // Maximum number of characters per line
    const maxLines = 3; // Maximum number of lines before truncation
    var baseFontSize = fontSize; // Base font size

    // Split text into lines
    let lines = splitTextIntoLines(text, maxLineLength);

    // Truncate lines if exceeding maximum number of lines
    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines - 1);
        lines.push('...'); // Add ellipsis if truncated
    }

    // Create a multiline text string with line breaks
    const multilineText = lines.join('\n');

    return new ol.style.Text({
        text: multilineText,
        font: baseFontSize + 'px Calibri,sans-serif',
        fill: new ol.style.Fill({
            color: '#000'
        }),
        stroke: new ol.style.Stroke({
            color: '#fff',
            width: 2
        }),
        textBaseline: 'middle', // Align text vertically
        offsetY: baseFontSize / 4.2, // Adjust vertical alignment
        overflow: true
    });
}

function getRoomStyle(feature) {
    return new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'green',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0, 255, 0, 0.1)'
        }),
        text: createDynamicTextStyle(feature.get('nombre'), 16),
    });
}

function getOfficeStyle(feature) {
    return new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'magenta',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(255, 0, 255, 0.1)'
        }),
        text: createDynamicTextStyle(feature.get('nombre'), 14)
    });
}

function getEmptyStyle(feature) {
    return new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 0, 0.0)',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0, 0, 0, 0.0)'
        }),
        text: null
    });
}

function getBathroomStyle(feature) {
    return new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'blue',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0, 0, 255, 0.5)'
        }),
        text: createDynamicTextStyle(feature.get('nombre'), 18)
    });
}

function setFeatureStyle(feature) {
    switch (feature.get('tipo')) {
        case 'salon':
            feature.setStyle(getRoomStyle(feature));
            break;
        case 'oficina':
            feature.setStyle(getOfficeStyle(feature));
            break;
        case 'vacio':
            feature.setStyle(getEmptyStyle(feature));
            break;
        case 'sanitario':
            feature.setStyle(getBathroomStyle(feature));
            break;
        default:
            console.log(`No style defined for tipo: ${feature.get('tipo')}`);
            break;
    }
}

function drawBuildingStoryControl(edificio) {
    var v1 = ol.proj.fromLonLat(edificio.get('v1').split(','));
    var v2 = ol.proj.fromLonLat(edificio.get('v2').split(','));
    var v3 = ol.proj.fromLonLat(edificio.get('v3').split(','));
    var v4 = ol.proj.fromLonLat(edificio.get('v4').split(','));
    console.log("for ", edificio.get('nombre'));
    console.log("v1: ", v1);
    console.log("v2: ", v2);
    console.log("v3: ", v3);
    console.log("v4: ", v4);

    var topY = Math.max(v1[1], v2[1], v3[1], v4[1]);
    var bottomY = Math.min(v1[1], v2[1], v3[1], v4[1]);
    var midX = (v1[0] + v2[0] + v3[0] + v4[0]) / 4;

    var arrowUpPosition = [midX, topY + 0.0001];
    var arrowDownPosition = [midX, bottomY - 0.0001];

    var upArrowFeature = new ol.Feature({
        geometry: new ol.geom.Point(arrowUpPosition),
        tipo: "uparrow",
        edificio: edificio,

    })

    var downArrowFeature = new ol.Feature({
        geometry: new ol.geom.Point(arrowDownPosition),
        tipo: "downarrow",
        edificio: edificio,

    });

    var upArrowStyle = new ol.style.Style({
        image: new ol.style.Icon({
            anchor: [0.5, 1],
            src: 'images/up_arrow.png',
            scale: 0.8
        })
    });

    var downArrowStyle = new ol.style.Style({
        image: new ol.style.Icon({
            anchor: [0.5, 0],
            src: 'images/down_arrow.png',
            scale: 0.8
        })
    });

    upArrowFeature.setStyle(upArrowStyle);
    downArrowFeature.setStyle(downArrowStyle);
    if (edificio.get('pisos') > 1) { //si el edificio tiene mas de 1 piso, agrega las flechas
        // si solo tiene un piso no son necesarias las flechas
        arrowControlSource.addFeature(upArrowFeature);
        arrowControlSource.addFeature(downArrowFeature);
    }

    map.addLayer(arrowLayer);
    arrowLayer.setVisible(0);
}

function showBuildingBorders(edificioFeature) {
    //VERTICE COORDINATES

    var edificio = {
        id: edificioFeature.get('id'),
        nombre: edificioFeature.get('nombre'),
        pisos: edificioFeature.get('pisos'),
        v1: edificioFeature.get('v1').split(',').map(Number),
        v2: edificioFeature.get('v2').split(',').map(Number),
        v3: edificioFeature.get('v3').split(',').map(Number),
        v4: edificioFeature.get('v4').split(',').map(Number),
        tipo: edificioFeature.get('tipo'),
        geometry: edificioFeature.getGeometry()
    };

    var vcoor = [
        ol.proj.fromLonLat(edificio.v1),
        ol.proj.fromLonLat(edificio.v2),
        ol.proj.fromLonLat(edificio.v3),
        ol.proj.fromLonLat(edificio.v4)
    ]
    console.log('Vertex coordinates:', vcoor);
    var polygon = new ol.geom.Polygon([vcoor]);
    var polygonFeature = new ol.Feature(polygon, {
        tipo: edificio.tipo
    });

    var polygonStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'blue',
            width: 2
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0, 0, 255, 0.1)'
        })
    });
    polygonFeature.setStyle(polygonStyle);

    var vectorSource = new ol.source.Vector({
        features: [polygonFeature]
    });
    edificioVerticeLayer = new ol.layer.Vector({
        source: vectorSource
    });

    // Add the vector layer to the map
    map.addLayer(edificioVerticeLayer);

}

function featureDetailsToString(feature) {
    var details = "feature not clicked"
    if (feature) {
        var properties = feature.getProperties();
        details = `Feature Details:\n`;

        for (var key in properties) {
            if (properties.hasOwnProperty(key)) {
                details += `${key}: ${properties[key]}\n`;
            }
        }
    }


    return details;
}

map.on('click', async function (event) {
    if (searchBoxOpen) {
        document.getElementById("resultBox").style.display = "none";
        searchBoxOpen = false;
    }

    var feature = map.forEachFeatureAtPixel(event.pixel, function (feature) {
        return feature;
    }, {
        hitTolerance: 10
    });

    console.log(featureDetailsToString(feature))
    if (feature && currentHiddenFeature != null) {
        showFeature(currentHiddenFeature);
        map.removeLayer(edificioVerticeLayer);
    }

    if (feature && feature.get('id')) {


        hideFeature(feature);

        currentHiddenFeature = feature;
        var info = feature.get('id');
        // alert(info);
        showPopup(feature);
        showBuildingBorders(feature);

    }
    else if (feature && feature.get('salonid') && feature.get('tipo') != "vacio") {//if the feature clicked is a salon
        var salon = {
            id: feature.get('salonid')
        }
        var info = feature.get('salonid');
        showPopup(feature, "salon");

    } else if (feature && feature.get('tipo') == "uparrow") {
        hidePopup();
        for (var i = rooms.length - 1; i >= 0; i--) {
            if (rooms[i].get('piso') == selectedFloor && rooms[i].get('edificioid') == feature.get('edificio').get('id')) {
                console.log("removed room: ", rooms[i].get('nombre'));
                rooms.splice(i, 1); // Removing index i

            }
        }
        map.removeLayer(roomLayer);
        if (selectedFloor >= 1 && selectedFloor <= feature.get('edificio').get('pisos') - 1) {
            selectedFloor++;
        }

        console.log("floor select: ", selectedFloor);

        await addRoomsInPolygon(feature.get('edificio'), feature.get('edificio').get('salones'), selectedFloor);
        roomLayer.setVisible(1);
    } else if (feature && feature.get('tipo') == "downarrow") {
        hidePopup();
        for (var i = rooms.length - 1; i >= 0; i--) {
            if (rooms[i].get('piso') == selectedFloor && rooms[i].get('edificioid') == feature.get('edificio').get('id')) {
                console.log("removed room: ", rooms[i].get('nombre'));
                rooms.splice(i, 1); // Removing index i

            }
        }
        map.removeLayer(roomLayer);
        if (selectedFloor > 1) {
            selectedFloor--;
        }

        console.log("floor select: ", selectedFloor);

        await addRoomsInPolygon(feature.get('edificio'), feature.get('edificio').get('salones'), selectedFloor);
        roomLayer.setVisible(1);
    }
    else {

        hidePopup();
        if (currentHiddenFeature) {
            showFeature(currentHiddenFeature);
            currentHiddenFeature = null;
        }
        map.removeLayer(edificioVerticeLayer);
        App.setSalonid("");
    };
});

function getAllFeaturesToArray() {
    var featuresSource = vectorSource.getFeatures();
    var features = [];
    featuresSource.forEach(function (sourceFeature) {
        features.push(sourceFeature);
    });
    return features;
};

function hideAllFeatures() {
    var featuresSource = vectorSource.getFeatures();
    featuresSource.forEach(function (sourceFeature) {
        hideFeature(sourceFeature);
    });
}

function showAllFeatures() {
    var featuresSource = vectorSource.getFeatures();
    featuresSource.forEach(function (sourceFeature) {
        showFeature(sourceFeature);
    });
}

function zoomToRoom(room, zoomLevel, animDurationMs) {
    console.log("requested zoom for room: ", room.get('nombre'));
    var ext = room.getGeometry().getExtent();
    var center = ol.extent.getCenter(ext);
    var view = map.getView();
    view.animate({
        projection: 'EPSG:3857',
        center: [center[0], center[1]],//zoom to the center of feature
        zoom: zoomLevel,
        duration: animDurationMs,
        extent: bounds
    });


    if (room.get('tipo') != "edificio") {
        roomLayer.setVisible(1); //force rooms to show on zoom
        vectorLayer.setVisible(0);
    } else {
        roomLayer.setVisible(0);
        vectorLayer.setVisible(1);
    }

}

function getEdificioFeaturefromID(salonid) {
    var edificioFound = undefined;
    edificios.forEach(function (edificio) {
        var salonList = edificio.get('salones');
        salonList.forEach(function (salon) {
            if (salonid == salon.salonid) {
                console.log("se encontro el salon en json: ", salon.salonid);
                edificioFound = edificio;
            }
        })
    });
    return edificioFound;
}

async function getSalonFeaturefromID(salonid) {
    var salonFound = undefined;
    JSON.parse(await App.getSalon(salonid)).forEach(function (sal) {
        if (salonid == sal.salonid) {
            console.log("se encontro el salon en json: ", sal.salonid);
            salonFound = sal;
        }
    });
    return salonFound;
}

//POP UP CODE
var popup = new ol.Overlay({
    element: document.getElementById('popup'),
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    }
});
map.addOverlay(popup);
function showPopup(feature, tipo) {
    var content = document.getElementById('popup-content');

    var button = document.getElementById('view-details-btn');
    document.getElementById('edificio-nombre').textContent = feature.get('nombre');
    if (feature.get('descripcion') != null) {//show descripcion if it has one
        document.getElementById('edificio-descripcion').textContent = feature.get('descripcion');
    }
    switch (tipo) {
        case "salon":
            button.textContent = "Ver más"
            break;
        default:
            button.textContent = "Ampliar"
            break;
    }

    document.getElementById('view-details-btn').onclick = function () {
        // alert('View Details clicked for ' + feature.get('nombre'));
        hidePopup();
        map.removeLayer(edificioVerticeLayer);

        if (typeof App !== 'undefined' && App.navToSalonInfo && feature.get('salonid')) {
            App.navToSalonInfo(feature.get('salonid'));
        }
        var ext = feature.getGeometry().getExtent();
        var center = ol.extent.getCenter(ext);
        var view = map.getView();
        view.animate({
            projection: 'EPSG:3857',
            center: [center[0], center[1]],//zoom to the center of feature
            zoom: 19.5,
            duration: 1000,
            extent: bounds
        });
        if (feature.get('salonid')) {
            highlightSalon(feature);
        }


        roomLayer.setVisible(1); //force rooms to show on zoom
        vectorLayer.setVisible(0);


        //force hide edificio icon
        map.getView().on('change:resolution', function () {
            var zoom = map.getView().getZoom();
            roomLayer.setVisible(zoom >= roomTriggerZoom);
            if (zoom < roomTriggerZoom) {
                vectorLayer.setVisible(1);
                arrowLayer.setVisible(0);
            } else {
                vectorLayer.setVisible(0);
                arrowLayer.setVisible(1);
            }

        });

        if (currentHiddenFeature) {
            showFeature(currentHiddenFeature);
            currentHiddenFeature = null;
        }
    };
    switch (tipo) {
        case "salon":
            var ext = feature.getGeometry().getExtent();
            var center = ol.extent.getCenter(ext);
            popup.setPosition(center);
            break;

        default:
            var featCoords = feature.get('geometry').getCoordinates();
            popup.setPosition(featCoords);
            break;
    }

    content.style.display = 'block';
    console.log("popup coords:", featCoords);

}

function hidePopup() {
    document.getElementById('popup-content').style.display = 'none';
    popup.setPosition(undefined);
}

