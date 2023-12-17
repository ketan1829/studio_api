const {BOOKING_SUCCESS_ADMIN} = require('./mailTemplates/mail-template.js')
const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2
const nodemailer = require('nodemailer')


const OAuth2_client = new OAuth2(process.env.clientId, process.env.clientSecret)
OAuth2_client.setCredentials({ refresh_token: process.env.refreshToken })

exports.send_mail = function (bookingDetails) {
  
    const userName = bookingDetails.userName;
    const accessToken = OAuth2_client.getAccessToken()

    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.user,
            clientId: process.env.clientId,
            clientSecret: process.env.clientSecret,
            refreshToken: process.env.refreshToken,
            accessToken: accessToken
        }
    })

    const mail_options = {
        from: `Choira <${process.env.user}>`,
        to: ["nitin.goswami@choira.io","ketan.salvi@choira.io"],
        subject: 'New Booking Arrived!',
        html: BOOKING_SUCCESS_ADMIN("userName", "userNumber", "bookingDateTime", "studioName", "studioLocation", "paymentStatus")
    }


    transport.sendMail(mail_options, function (error, result) {
        if (error) {
            console.log('Error: ', error)
        } else {
            console.log('Success: ', result)
        }
        transport.close()
    })
}

