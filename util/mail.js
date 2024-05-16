const {BOOKING_SUCCESS_ADMIN,WELCOME_TEMPLATE} = require('./mailTemplates/mail-template.js')
const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2
const nodemailer = require('nodemailer')
const axios = require("axios");
const { logger,log } = require('./logger.js');


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

exports.sendMsg91OTP =  async (phoneNumber)=> {
    try {
        var options = {
          method: 'POST',
          url: 'https://control.msg91.com/api/v5/otp',
          params: {
            template_id: process.env.MSG91_TEMP_ID,
            mobile: phoneNumber,
            authkey: process.env.MSG91_AUT_KEY,
            // otp: otp,
            otp_length: '4',
            otp_expiry: '10'
          },
          headers: {'Content-Type': 'application/JSON'}
        };
        axios.request(options).then(function (response) {
          log("DATA--->",response.data);
          if (response.data.type === 'success') {
            return { status: true }
          } else {
              return { status: false}
          }
          }).catch(function (error) {
            console.error("Error sending OTP:", error);
            return { status: false }
          });
    } catch (error) {
        console.error("Error sending OTP:", error);
        return { status: false }
    }
  }
  
exports.verifyOTP = async (phoneNumber,otp)=> {
    try {
        const response = await axios.get(`https://control.msg91.com/api/v5/otp/verify`, {
            params: {otp:otp, mobile: phoneNumber},
            headers: {authkey: process.env.MSG91_AUT_KEY}
        });

        if (response.data.status >= 200 && response.data.status<300) {
            return { status: true , message :"otp verified successfully" }
        } else {
            return { status: false , message :"otp verification failed" }
        }
    } catch (error) {
        log.error(error,"Error verifiying OTP");
        return { status: false , message :"otp verification failed" }
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
        const response = await axios.post('https://api.sendinblue.com/v3/contacts', data, { headers });

        if (response) {
            return { status: true };
        } else {
            return { status: false };
        }
    } catch (error) {
        console.error("Error sending OTP:", error);
        return { status: false };
    }
}
