const axios = require('axios');


const axios = require("axios");
const getLatLong = async (googleMapsUrl) => {
  try {
    // Fetch the URL content
    let response = await axios.get(googleMapsUrl);
    let redirectUrl = response.request.res.responseUrl;
    let latlong = []
    if (redirectUrl.includes("@")) {
      redirectUrl = redirectUrl.split("@")[1].split("/")[0].split(",");
      const lat = redirectUrl[0]
      const long = redirectUrl[1]
      latlong = [lat, long]
    } else {
      const latlong = redirectUrl.split("/").splice(-1)[0].split("?")[0].split(",")
      const lat = latlong[0].replace("+", "").replace("-", "");
      const long = latlong[1].replace("+", "").replace("-", "");
      latlong = [lat, long]

    }
    return latlong

  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return [];
  }
}

exports.getLatLong = getLatLong;

