// Initialize Map
var map = L.map('map', {
    zoomSnap: 0.25
}).setView([42.3744, -71.1167], 16); // Centered at 42.37438851046062, -71.11673284809753

// Set Bounds
var southwestBounds = L.latLng(42.3606, -71.1404); // Southwest corner 42.3606390053258, -71.1403594148131
var northeastBounds = L.latLng(42.3873, -71.0975); // Northeast corner 42.38733690371796, -71.09751809193455
var bounds = L.latLngBounds(southwestBounds, northeastBounds);

// Generate Map
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 21,
    minZoom: 14.5,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Map Boundary
map.setMaxBounds(bounds);
map.on('drag', function() {
    map.panInsideBounds(bounds, {
        animate: false
    });
});

// Handle Markers and On Map Click
var markerGroup = L.layerGroup().addTo(map);
var userLat;
var userLng;

// Buttons
const button = document.getElementById('submitbutton');
let roundActive = true;

const markerIcon = L.icon({
    iconUrl: '../static/marker.png',
    iconSize: [32, 45],
    iconAnchor: [16, 40],
    popupAnchor: [0, -32]
});

function onMapClick(e) {
    if (roundActive) {
        // Place Marker
        if (markerGroup) {
            markerGroup.clearLayers();;
        }
        userLat = e.latlng.lat;
        userLng = e.latlng.lng;
        userMarker = L.marker(e.latlng).addTo(map).addTo(markerGroup);

        // Redesign Button
        button.removeAttribute('disabled');
        button.style.backgroundColor = '#166088';
        button.innerHTML = 'Submit!';
    }
}

map.on('click', onMapClick);

// Handle Map and Button Sizes
const mapElement = document.getElementById('map');

// On Page Load
window.addEventListener('load', function() {
    mapElement.style.height = '20%';
    mapElement.style.width = '20%';
    startTimer();
});

var timeout;

// Mouse Over
mapElement.addEventListener('mouseover', function() {
    clearTimeout(timeout);

    // Adjust Map
    mapElement.style.height = '66%';
    mapElement.style.width = '50%';
    mapElement.style.opacity = 1;

    // Adjust Button Size
    button.style.width = '50%';
});

// Mouse Leave
mapElement.addEventListener('mouseleave', function() {
    timeout = setTimeout(function() {

        // Adjust Map
        mapElement.style.height = '20%';
        mapElement.style.width = '20%';
        mapElement.style.opacity = 0.4;

        // Adjust Button Size
        button.style.width = '20%';
    }, 500);
});

// Name Elements and Initialize Variables
const scoresheetElement = document.getElementById('scoresheet');
const photoElement = document.getElementById('photo');
var totalScore = 0;
var maxScore = 0;
var roundNum = 1;

// During Game, Submit Button Pressed (End Round Function)
function endRound() {
    if (roundActive) {
        console.log("Round End");
        console.log(roundNum);
        timerActive = false;

        // Change Button Color
        button.style.backgroundColor = '#660000';

        // Real Lat and Real Lng Data from Python->HTML
        var realLat = data[roundNum - 1].realLat;
        var realLng = data[roundNum - 1].realLng;
        realMarker = L.marker([realLat, realLng], {
            icon: markerIcon
        }).addTo(map).addTo(markerGroup);

        // Calculate Score
        try {
            var Δlat = Math.abs(userLat - realLat);
            var Δlng = Math.abs(userLng - realLng);
            var distance = 100000 * Math.sqrt(Δlat * Δlat + Δlng * Δlng);
            var score = Math.max(0, Math.round(1000 - distance));
        } catch (error) {
            console.log("No guess given")
            var score = 0;
        }
        score = isNaN(score) ? 0 : score;

        // Update Site HTML to Reflect Score
        totalScore += score;
        maxScore += 1000;

        scoresheetElement.innerHTML = '<span class="bold"> Round  ' + roundNum + '</span><br>' +
            (typeof score === 'number' ? '+' + score : '0') + '<br>' +
            totalScore + ' / ' + maxScore;

        // Conditional for Round End
        if (roundNum == photosPerGame) {
            // Turn Submit Button into End Game Button
            button.innerHTML = 'Results';
        } else {
            // Turn Submit Button into Next Button
            button.innerHTML = 'Next Round';
        }

        // End Round
        setTimeout(function() {
            roundActive = false;
        }, 100);
    }
};

button.addEventListener('click', endRound);

// Next Round Button Pressed (Begin Round Function)
function beginRound() {
    if (roundActive === false) {
        console.log("New Round");
        timerActive = true;

        if (roundNum == photosPerGame) {
            // Display Scoreboard
            document.getElementById("endscore").hidden = false;

            // Hide Other Elements
            scoresheetElement.style.opacity = 0;
            photoElement.style.opacity = 0;
            document.getElementById("submitbutton").style.opacity = 0;
            mapElement.style.opacity = 0;

            // Display Score
            document.getElementById("endscorevalue").innerHTML = totalScore + ' / ' + maxScore;

            // Force Hide Map
            setTimeout(function() {
                mapElement.hidden = true;
            }, 500);

        } else {
            // Turn Next Button into Submit Button
            button.style.backgroundColor = '#2A3439';
            button.innerHTML = 'Make a Guess!';
            button.disabled = true;

            // Clean Up
            markerGroup.clearLayers();
            roundNum++;
            scoresheetElement.innerHTML = '<span class="bold"> Round  ' + roundNum + '</span><br>' +
                totalScore + ' / ' + maxScore;

            // New Image
            const imageUrl = `../static/photos/${data[roundNum - 1].selectedPhoto}.jpg`;
            photoElement.style.opacity = 0;
            photoElement.onload = function() {
                setTimeout(function() {
                    // Set opacity to 1 to make it visible (fade-in)
                    photoElement.style.opacity = 1;
                }, 500);

                // Begin Round
                setTimeout(function() {
                    roundActive = true;
                    startTimer();
                }, 1000);
            }
            photoElement.setAttribute('src', imageUrl);
        }
    }
}

button.addEventListener('click', beginRound);

// Timer
const timer = document.getElementById("timer")
let timerActive = true;
var timerWidth = 100;
const totalDuration = 12000; // 12000 default for 12 seconds
const intervalTime = totalDuration / 1000;
let elapsedTime = 0;

function startTimer() {
    // Reset Variables
    timerWidth = 100;
    elapsedTime = 0;

    // Update Timer Width
    timer.style.width = `${timerWidth}%`;

    // Start
    intervalId = setInterval(function() {

        // Off Switch
        if (!timerActive) {
            clearInterval(intervalId)
            timer.style.width = '0%';
            return;
        }

        // Increment Time
        timerWidth = timerWidth - (100 / (totalDuration / intervalTime));
        document.getElementById("timer").style.width = `${timerWidth}%`;
        elapsedTime += intervalTime;

        // End Function
        if (elapsedTime >= totalDuration) {
            clearInterval(intervalId);
            endRound();
            button.disabled = false;
        }
    }, intervalTime);
}

// Submit Score
document.addEventListener("DOMContentLoaded", function() {
    const upload = document.getElementById("uploadscorebutton");

    function submitScore() {
        // Send Score
        console.log(totalScore);
        fetch('/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    score: totalScore
                }),
            }).then(response => response.json())
            .then(data => console.log(data))
            .catch((error) => console.error('Error:', error));
    }

    // Handle if User Logged In or Not
    if (upload) {
        upload.addEventListener('click', submitScore);
    } else {
        console.log("No Upload Found");
    }
});

// Send Data from Python to JavaScript
function send(vars) {
    return vars
}
