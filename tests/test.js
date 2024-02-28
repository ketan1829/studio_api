const axios = require('axios');


axios.get("https://maps.googleapis.com/maps/api/geocode/json?address=Second%20Floor,%20Mangalmurti%20Square,%20Opposite%20Water%20Tank,Umrer%20road,%20Outer%20Ring%20Rd,%20above%20Kwality%20Wines,%20Nagpur,%20Maharashtra%20440022&key=AIzaSyBtY-nXeCN1DIZMGE9WhSAonDz7O8OJRJM").then(function (response) {
    const data = response.data.results[0].geometry.location
    let latitude = data.lat.toString();
    let longitude = data.lng.toString();

    console.log(latitude,longitude)

})