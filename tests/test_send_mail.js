const {BOOKING_SUCCESS_ADMIN} = require('../util/mailTemplates/mail-template')
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2
const nodemailer = require('nodemailer')


const user= 'connect@choira.io'
const clientId='387073537740-hj38fg0k13l18une1huha3diusqk4s66.apps.googleusercontent.com'
const clientSecret='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'
const refreshToken='1//04bhYfR6GhRStCgYIARAAGAQSNwF-L9Ir0P2B0pryALDVa1roz2QdTgozzMhUhyhXB216vRuJ8iIzp4Q2rkgPCBaNgQ2OO-kGDUk'

const OAuth2_client = new OAuth2(clientId, clientSecret)
OAuth2_client.setCredentials({ refresh_token: refreshToken })

const send_mail = function (userName) {
  
    const accessToken = OAuth2_client.getAccessToken()

    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: user,
            clientId: clientId,
            clientSecret: clientSecret,
            refreshToken: refreshToken,
            accessToken: accessToken
        }
    })

    const mail_options = {
        from: `Choira <${user}>`,
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

send_mail()

