// const analytics = require('./init')
const { Analytics } = require('@customerio/cdp-analytics-node')

// instantiation
const analytics = new Analytics({ 
  writeKey: 'b2e8cc69697248981f3d' ,
  host: 'https://cdp.customer.io',
  // if you're in our EU region
  // host: 'https://cdp-eu.customer.io',
})

class AS {
  constructor(parameters) {

  }
    static async User(userData, role) {
      try {
        console.log({
          fullName: userData.fullName || '',
          email: userData.email || '',
          dateOfBirth: userData.dateOfBirth || '',
          city: userData.city || '',
          state: userData.state || '',
          profileUrl: userData.profileUrl || '',
          gender: userData.gender || '',
          userType: userData.userType || '',
          deviceId: userData.deviceId || '',
          role: userData.role || '' || role,
          phone: userData.phone || userData.phoneNumber
        })
          console.log("---->",analytics.identify({
            userId: userData.phone || userData.phoneNumber,
            traits: {
              fullName: userData.fullName || '',
              email: userData.email || '',
              dateOfBirth: userData.dateOfBirth || '',
              city: userData.city || '',
              state: userData.state || '',
              profileUrl: userData.profileUrl || '',
              gender: userData.gender || '',
              userType: userData.userType || '',
              deviceId: userData.deviceId || '',
              role: userData.role || '' || role,
            }
          }))



      } catch (error) {
          // Handle errors appropriately
          console.log(error.message)
          throw new Error('Error: ' + error.message);
      }
  }

    static async Track(phone, event, props) {
    try {
      analytics.track({
        userId: phone,
        event: event,
        properties: props
        // {
        //   product: "shoes",
        //   revenue: 39.95,
        //   qty: 1,
        //   size: 9
        // }
      });

    } catch (error) {
        // Handle errors appropriately
        throw new Error('Error: ' + error.message);
    }
  }


}


module.exports = AS;