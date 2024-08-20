const { Analytics } = require('@customerio/cdp-analytics-node')

const analytics = new Analytics({ 
    writeKey: process.env.CUSTOMER_IO || 'b2e8cc69697248981f3d' ,
    host: 'https://cdp.customer.io',
    // if you're in our EU region
    // host: 'https://cdp-eu.customer.io',
  })

module.exports = analytics;