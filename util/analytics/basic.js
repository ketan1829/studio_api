// const analytics = require('./init')
const { Analytics } = require('@customerio/cdp-analytics-node')
const axios = require('axios')

// instantiation
const analytics = new Analytics({ 
  writeKey: 'b2e8cc69697248981f3d' ,
  host: 'https://cdp.customer.io',
  // if you're in our EU region
  // host: 'https://cdp-eu.customer.io',
})

const CUSTOMER_IO_API = process.env.CUSTOMER_IO_API

class Track {
  constructor(parameters) {

  }

    static async User(userData, role='', event='') {
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
              event: userData.event || '' || event,
            }
          }))

          // console.log("getUserAttributes-->", getUserAttributes("917021908949"))



      } catch (error) {
          // Handle errors appropriately
          console.log(error.message)
          throw new Error('Error: ' + error.message);
      }
  }

  static async Event(phone, event, props) {
    try {
      await analytics.track({
        userId: phone,
        event: event,
        properties: props
      });
      console.log(`Event ${event} tracked for user ${phone}`);
    } catch (error) {
      throw new Error('Error: ' + error.message);
    }
  }

  static async BookingAttempt(phone, studioId) {
    await this.Event(phone, 'studio_booking_attempt', { studioId });
  }

  static async BookingCreated(phone, studioId, roomId, discountId, discountCode, bookingDate, bookingTime, totalPrice) {
    await this.Event(phone, 'studio_booking_created', { phone, studioId, roomId, discountId, discountCode, bookingDate, bookingTime, totalPrice });
  }
  
  static async SlotsViewed(phone, studioId) {
    await this.Event(phone, 'studio_slots_viewed', { studioId });
  }

}


module.exports = Track;