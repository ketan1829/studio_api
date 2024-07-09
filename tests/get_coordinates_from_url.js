

const axios = require('axios');
async function getLatLong(googleMapsUrl) {
  try {
    // Fetch the URL content
    const response = await axios.get(googleMapsUrl);
    const redirectUrl = response.request.res.responseUrl;
    const ses = redirectUrl.split("/").splice(-1)[0].split("?")[0].split(",")
    console.log(ses[0].toString());
    console.log(ses[1].toString());
    
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return null;
  }
}

const googleMapsUrl = 'https://maps.app.goo.gl/zXMNCessLTc9u1HW9';
getLatLong(googleMapsUrl).then((coordinates) => {
  if (coordinates) {
    console.log(`Latitude: ${coordinates.latitude}, Longitude: ${coordinates.longitude}`);
  }
});
