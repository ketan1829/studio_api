const axios = require('axios');


const getLatLong = async(googleMapsUrl) => {
  try {
    // Fetch the URL content
    const response = await axios.get(googleMapsUrl);
    const redirectUrl = response.request.res.responseUrl;
    const latlong = redirectUrl.split("/").splice(-1)[0].split("?")[0].split(",")
    const lat = latlong[0].replace("+","").replace("-","");
    const long = latlong[1].replace("+","").replace("-","");
    return [lat,long]
    
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return null;
  }
}

exports.getLatLong = getLatLong;

