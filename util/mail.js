const {BOOKING_SUCCESS_ADMIN,WELCOME_TEMPLATE} = require('./mailTemplates/mail-template.js')
const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2
const nodemailer = require('nodemailer')
const axios = require("axios");


const OAuth2_client = new OAuth2(process.env.clientId, process.env.clientSecret)
OAuth2_client.setCredentials({ refresh_token: process.env.refreshToken })

exports.send_mail = function (bookingDetails) {
  
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
        to: ["nitin.goswami@choira.io","ketan.salvi@choira.io","support@choira.io"],
        subject: 'New Booking Arrived!',
        html: BOOKING_SUCCESS_ADMIN(bookingDetails)
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

exports.sendRegisterMail = async function(userdata){

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
        to: ["nitin.goswami@choira.io","ketan.salvi@choira.io","support@choira.io"],
        subject: 'New User Registered !',
        html: WELCOME_TEMPLATE(userdata)
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

exports.sendOTP = async function (phoneNumber, otp) {
    try {
        const response = await axios.get(`https://www.fast2sms.com/dev/bulkV2`, {
            params: {
                authorization: process.env.FAST2SMS_AUTH_KEY,
                variables_values: otp,
                route: "otp",
                numbers: phoneNumber
            }
        });

        if (response.data.return === true || response.data.message[0] === "SMS sent successfully.") {
            return { success: true };
        } else {
            return { success: false };
        }
    } catch (error) {
        console.error("Error sending OTP:", error);
        return { success: false };
    }
}

exports.addContactBrevo = async function (userData) {
    try {
        const data = {
            email: userData.email,
            attributes: {
              FIRSTNAME: userData.fullName.split(" ")[0],
              LASTNAME: userData.fullName.split(" ")[1],
              SMS: `+91${userData.phoneNumber}`,
            },
            emailBlacklisted: false,
            smsBlacklisted: false,
            listIds: [2],
            updateEnabled: true,
          };
          
        const headers = {
        'Accept': 'application/json',
        'api-key': process.env.SENDINBLUE_API_KEY,
        'Content-Type': 'application/json'
        };
        const response = axios.post('https://api.sendinblue.com/v3/contacts', data, { headers });

        if (response) {
            return { success: true };
        } else {
            return { success: false };
        }
    } catch (error) {
        console.error("Error sending OTP:", error);
        return { success: false };
    }
}
