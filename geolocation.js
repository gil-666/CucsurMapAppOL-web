// Geolocation.js

class Geolocation {
    constructor(map) {
        this.map = map;
        this.locationLayer = new ol.layer.Vector({
            source: new ol.source.Vector()
        });
        this.map.addLayer(this.locationLayer);
        this.setupGeolocation();
    }

    setupGeolocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                this.successCallback.bind(this),
                this.errorCallback
            );
            navigator.geolocation.watchPosition(
                this.updatePosition.bind(this),
                this.errorCallback
            );
        } else {
            alert('Geolocation is not supported by your browser');
        }
    }

    successCallback(position) {
        var coords = position.coords;
        this.showLocation(coords.latitude, coords.longitude);
    }

    updatePosition(position) {
        var coords = position.coords;
        this.showLocation(coords.latitude, coords.longitude);
    }

    showLocation(lat, lon) {
        var locationFeature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
        });

        var locationStyle = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({
                    color: 'blue'
                }),
                stroke: new ol.style.Stroke({
                    color: 'white',
                    width: 2
                })
            })
        });

        locationFeature.setStyle(locationStyle);

        this.locationLayer.getSource().clear();
        this.locationLayer.getSource().addFeature(locationFeature);

        this.map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
        this.map.getView().setZoom(15);
    }

    errorCallback(error) {
        console.error('Error occurred while retrieving location: ', error);
    }
}

export default Geolocation;
