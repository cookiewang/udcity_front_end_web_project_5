// declares global variables
"use strict";
var map;
var locationsName = [];
var locationsShortName = [];
var locationsAddresses = [];
var placeDataInfo = [];
var prev_infowindow = false;
var currentMarker = null;
/*
 Start here! initializeMap() is called when page is loaded.
 */
function initializeMap() {
    var self = this;
    self.locationsInfo = ko.observableArray();
    self.listMessage = ko.observable("Click For Show All The Locations");
    self.mapMarkers = ko.observableArray();
    self.showlistView = ko.observable(false);
    var mapOptions = {
        disableDefaultUI: true
    };

    // This next line makes `map` a new Google Map JavaScript Object and attaches it to
    // <div id="map">, which is appended as part of an exercise late in the course.
    map = new google.maps.Map(document.querySelector('#map'), mapOptions);

    this.resetMap = function () {
        if (prev_infowindow) {
            prev_infowindow.close();
        }
        var array = self.mapMarkers();
        array.forEach(function(element){
            element.marker.setIcon("images/pushpin_red.png");
        });
        if(currentMarker){
            currentMarker.setIcon("images/pushpin_blue.png");
        }
        google.maps.event.trigger(map, 'resize');
    };

    /*
     createMapMarker(placeData) reads Google Places search results to create map pins.
     placeData is the object returned from search results containing information
     about a single location.
     */
    function createMapMarker(placeData) {
        var lat = placeData.geometry.location.lat();  // latitude from the place service
        var lon = placeData.geometry.location.lng();  // longitude from the place service
        var name = placeData.formatted_address;   // name of the place from the place service
        var bounds = window.mapBounds;            // current boundaries of the map window
        // marker is an object with additional data about the pin for a single location
        var marker = new google.maps.Marker({
            map: map,
            position: placeData.geometry.location,
            title: name
        });
        var locName = "";
        var anchor = "";
        var array = self.locationsInfo();
        var len = array.length;
        for (var i = 0; i < len; i++) {
            if (array[i]) {
                //find the location name if its geoName as same as placeData.name
                console.info("placeData.name " + placeData.name);
                if (array[i].geoName == placeData.name) {
                    locName = array[i].name;
                    //call wiki API to get more data for this location
                    callingWikiApi('en.wikipedia.org', locName, {
                        ssl: true,
                        success: function (title, link) {
                            // link is now "https://en.wikipedia.org/wiki/location_name"
                            if (title === null) {
                                anchor = 'Not found';
                            }
                            var contentInfo = "";
                            if (anchor != 'Not found') {
                                contentInfo = '<div id="infowindow">' +
                                    '<h2>' + locName + '</h2>' +
                                    '<p><a href="' + link + '" target="_blank">Click to view more info</a></p>' +
                                    '</div>';
                            } else {
                                contentInfo = '<div id="infowindow">' +
                                    '<h2>' + locName + '</h2>' +
                                    '<p><a href="" target="_blank">No Wikipedia info available</a></p>' +
                                    '</div>';
                            }
                            marker.setIcon("images/pushpin_red.png");
                            google.maps.event.addListener(marker, 'click', function () {
                                var infoWindow = new google.maps.InfoWindow({
                                    content: contentInfo
                                });
                                //close any opening previous infowindow
                                if (prev_infowindow) {
                                    prev_infowindow.close();
                                }
                                prev_infowindow = infoWindow;
                                map.setZoom(14);
                                map.setCenter(marker.position);
                                if(currentMarker){
                                    currentMarker.setIcon("images/pushpin_red.png");
                                }
                                marker.setIcon("images/pushpin_blue.png");
                                currentMarker = marker;
                                infoWindow.open(map, marker);
                                map.panBy(0, -150);
                            });
                            self.mapMarkers.push({marker: marker, id: array[i].id});
                            // this is where the pin actually gets added to the map.
                            // bounds.extend() takes in a map location object
                            bounds.extend(new google.maps.LatLng(lat, lon));
                            // fit the map to the new marker
                            map.fitBounds(bounds);
                            // center the map
                            map.setCenter(bounds.getCenter());
                        },
                        error: function (XMLHttpRequest, textStats, errorThrown) {
                            console.log('Wikipedia error');
                            alert(errorThrown);
                        }
                    });
                    break;
                }
            }
        }
    };
    //this function is to find the id from locationsInfo
    this.locationSearch = function () {
        var locationShortName = $('#location-name-input').val();
        var array = self.locationsInfo();
        var id = "";
        for (var i = 0; i < array.length; i++) {
            if (array[i]) {
                if (array[i].shortName == locationShortName) {
                    id = array[i].id;
                    this.displayLocation({"id": id});
                    break;
                }
            }
        }
    };
    //this function to show the clicked marker
    this.displayLocation = function (clickedLocation) {
        console.info(" clickedLocation.id : " + clickedLocation.id);
        var array = self.mapMarkers();
        var id = clickedLocation.id;
        var len = array.length;
        for (var i = 0; i < len; i++) {
            if (id === array[i].id) {
                google.maps.event.trigger(array[i].marker, 'click');
                break;
            }
        }
    };
    /*
     callback(results, status) makes sure the search returned results for a location.
     If so, it creates a new map marker for that location.
     */
    function callback(results, status) {
        console.info("locationsName : " + locationsName);
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            placeDataInfo.push(results[0]);
        }
    };

    /*
     pinPoster() fires off Google place searches for each location
     */
    function pinPoster() {
        var service = new google.maps.places.PlacesService(map);

        var request;
        $.ajax({
            url: "locations.json",
            dataType: 'json',
            success: function (data) {
                console.info('Data Found:' + data);
                var len = data.length;
                for (var i = 0; i < len; i++) {
                    locationsAddresses.push(data[i].location);
                    self.locationsInfo.push(data[i]);
                    locationsName.push(data[i].name);
                    locationsShortName.push(data[i].shortName);
                    request = {
                        query: locationsAddresses[i]
                    };
                    service.textSearch(request, callback);
                }

                if (locationsShortName.length > 0) {
                    console.info("locationsName length: " + locationsShortName.length);
                    $('#location-name-input').autocomplete({
                        lookup: locationsShortName,
                        showNoSuggestionNotice: true,
                        noSuggestionNotice: 'Sorry, no matching results'
                    });
                }
            },
            error: function () {
                self.listMessage("No Data Found.");
            }
        });

    };
    //this function calls wikipedia API
    function callingWikiApi(site, search, callback, opts) {
        if (typeof callback == 'object') {
            opts = callback;
            callback = null;
        } else {
            opts = opts || {};
        }
        // Build the required URLs
        var siteUrl = (opts.ssl ? 'https' : 'http') + '://' + site;
        var apiUrl = siteUrl + (opts.apiBase || '/w/') + 'api.php';
        var queryUrl = apiUrl + '?action=query&list=search&srsearch=' + encodeURIComponent(search) + '&srlimit=' + (opts.maxResults || 1) + '&format=json';
        // Issue the JSONP request
        $.ajax(queryUrl + '&callback=?', {
            dataType: 'jsonp',
            // This prevents warnings about the unrecognized parameter "_"
            cache: true,
            success: function (data) {
                // Get all returned pages
                var titles = [], links = [];
                for (var i = 0; i < data.query.search.length; i++) {
                    var title = data.query.search[i].title,
                        link = siteUrl + (opts.wikiBase || '/wiki/') + encodeURIComponent(title);
                    titles.push(title);
                    links.push(link);
                }
                if (!opts.maxResults) {
                    // Single result requested
                    if (data.query.search.length == 0) {
                        titles = links = null;
                    } else {
                        titles = titles[0];
                        links = links[0];
                    }
                }
                // Call the callback
                (callback || opts.success || function () {
                })(titles, links);
            },
            error: function () {
                self.listMessage("Failed to call Wikipedia API.");
            }
        });
    };

    // Sets the boundaries of the map based on pin locations
    window.mapBounds = new google.maps.LatLngBounds();
    pinPoster();
    //Display all the markers on the map
    setTimeout(function () {
        console.info("placeDataInfo :" + placeDataInfo.length);
        for (var i = 0; i < placeDataInfo.length; i++) {
            createMapMarker(placeDataInfo[i]);
        }
        // buildListView();
        google.maps.event.addListener(map, 'resize', function () {
            var center = new google.maps.LatLng(32.7869275, -96.80661579999997);
            map.setCenter(center);
            map.fitBounds(mapBounds);
        });
    }, 1500);
    //this function show/hide the list of locations
    this.toggleListView = function () {
        if (self.showlistView() == false) {
            self.showlistView(true);
            self.listMessage("Click For Close The List")
        } else {
            self.showlistView(false);
            self.listMessage("Click For Show All The Locations")
        }
    };
};
// Calls the initializeMap() function when the page loads
if(!navigator.onLine){
    window.document.getElementById("main").innerHTML = '<div>' +
        '<h2>No Internet Connection</h2></div>';
}else {
    ko.applyBindings(new initializeMap());
// Vanilla JS way to listen for resizing of the window
// and adjust map bounds
    window.addEventListener('resize', function (e) {
        // Make sure the map bounds get updated on page resize
        map.fitBounds(mapBounds);
    });
};