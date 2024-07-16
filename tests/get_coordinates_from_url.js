

const axios = require("axios");
const getLatLong = async (googleMapsUrl) => {
  try {
    // Fetch the URL content
    let response = await axios.get(googleMapsUrl);
    let redirectUrl = response.request.res.responseUrl;
    let latlong = []
    if (redirectUrl.includes("@")) {
      console.log("ATTTTT");
      redirectUrl = redirectUrl.split("@")[1].split("/")[0].split(",");
      const lat = redirectUrl[0]
      const long = redirectUrl[1]
      latlong = [lat, long]
    } else {
      const ltlng = redirectUrl.split("/").splice(-1)[0].split("?")[0].split(",")
      const lat = ltlng[0].replace("+", "").replace("-", "");
      const long = ltlng[1].replace("+", "").replace("-", "");
      latlong = [lat, long]

    }
    console.log(latlong);
    return latlong

  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return [];
  }
}
console.log(getLatLong("https://maps.app.goo.gl/tkFJVrh9FntEzzdL8"));

exports.getLatLong = getLatLong;

