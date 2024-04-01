const express = require('express');
const { logger, contextMiddleware } = require('./util/logger.js');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: __dirname + '/.env' })

const path = require('path');

const mongoConnect = require('./util/database').mongoConnect;

const app = express();

const configRoutes = require('./routes/config');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const studioRoutes = require('./routes/studio');
const serviceRoutes = require('./routes/service');
const settingRoutes = require('./routes/setting');
const bookingRoutes = require('./routes/booking');
const ratingRoutes = require('./routes/rating');
const transactionRoutes = require('./routes/transaction');
const phonePeTransactionRoutes = require('./routes/phonePeTransaction');
const choiraDiscountRoutes = require('./routes/choiraDiscount');
const subAdminRoutes = require('./routes/subAdmin');
const notificationsRoutes = require('./routes/notifications');
const ownerRoutes = require('./routes/owner');
const adminNotificationsRoutes = require('./routes/adminNotifications');
const mailtestRoutes = require('./routes/mailtest');


//SWAGGER
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    swaggerDefinition: {
      openapi: "3.0.1",
      info: {
        title: "Choira Studio - API",
        version: "2.2.3",
      },
      servers: [
        {
          url: "https://adminstudio.serveo.net/api/",
        },
        {
          url:"http://localhost:3000"
        },
        {
          url: "http://localhost:4200/api/",
        },
        {
          url: "http://sadmin.choira.io:4000/api/v2",
        },
        {
          url: "http://studiotest.choira.io/api/",
        },
        {
          url: "http://localhost:4000/api/",
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ["./routes/*.js"],
};

// Attach a unique request ID to every log line
app.use(contextMiddleware);

const specs = swaggerJsdoc(options);
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, { explorer: true })     //Explorer is used for search bar
);


// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use('/uploads',express.static('uploads'));


app.use(bodyParser.json());  //for application/json data

app.use(express.json());


//enabling CORS package
app.use((req,res,next)=>{
    //setting header to all responses
    res.setHeader('Access-Control-Allow-Origin','*'); //specifying which methods are allowed
    
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE');

    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');

    next();  //so that request continues to next middleware
});

const first_route = "/api/v2"
app.get(`${first_route}`, (req, res) => {
  res.send('Studio Live-Merge Api is live with v2 !!')
})

app.use(`${first_route}`,configRoutes);
app.use(`${first_route}`,adminRoutes);
app.use(`${first_route}`,userRoutes);
app.use(`${first_route}`,studioRoutes);
app.use(`${first_route}`,serviceRoutes);
app.use(`${first_route}`,settingRoutes);
app.use(`${first_route}`,bookingRoutes);
app.use(`${first_route}`,ratingRoutes);
app.use(`${first_route}`,transactionRoutes);
app.use(`${first_route}`,phonePeTransactionRoutes);
app.use(`${first_route}`,choiraDiscountRoutes);
app.use(`${first_route}`,subAdminRoutes);
app.use(`${first_route}`,notificationsRoutes);
app.use(`${first_route}`,ownerRoutes);
app.use(`${first_route}`,adminNotificationsRoutes);
app.use(`${first_route}`,mailtestRoutes);

// serve static folder (admin-panel)
app.use(express.static("dist-payment/bms-webpayment"));


// show admin panel 
// app.get("/webPayment*", (req, res) => {
//     res.sendFile(path.resolve(__dirname, "dist-payment", "bms-webpayment", "index.html"));
// });

// // serve static folder (super admin-panel)
// app.use(express.static("../../WebApps/Studio_Panels/dist/BookMyStudioAppAdmin"));

// // show admin panel 
// app.get("/bms-admin*", (req, res) => {
//     res.sendFile(path.resolve(__dirname, "dist", "BookMyStudioAppAdmin", "index.html"));
// });

// serve static folder (owner-panel)
// app.use(express.static("dist-owner/BookMyStudioAppOwner"));

// // show admin panel
// app.get("/studio-owner*", (req, res) => {
//     res.sendFile(path.resolve(__dirname, "dist-owner", "BookMyStudioAppOwner", "index.html"));
// });


//

app.use(express.static("../../../WebApps/Studio_Panels/dist-payment/bms-webpayment"));

// show admin panel 
app.get("/webPayment*", (req, res) => {
    // res.sendFile(path.resolve(__dirname, "dist-payment", "bms-webpayment", "index.html"));
    res.sendFile(path.resolve(__dirname,  "..","..","..","WebApps", "Studio_Panels", "dist-payment", "bms-webpayment", "index.html"));
});

// serve static folder (super admin-panel)
// app.use(express.static("dist/BookMyStudioAppAdmin"));
app.use(express.static("../../../WebApps/Studio_Panels/dist/BookMyStudioAppAdmin"));

// show admin panel 
app.get("/bms-admin*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "..","..","..","WebApps", "Studio_Panels", "dist", "BookMyStudioAppAdmin", "index.html"));
});

// serve static folder (owner-panel)
// app.use(express.static("dist-owner/BookMyStudioAppOwner"));
app.use(express.static("../../../WebApps/Studio_Panels/dist-owner/BookMyStudioAppOwner"));

// // show admin panel
app.get("/studio-owner*", (req, res) => {
    // res.sendFile(path.resolve(__dirname, "dist-owner", "BookMyStudioAppOwner", "index.html"));
    res.sendFile(path.resolve(__dirname, "..","..","..","WebApps", "Studio_Panels", "dist-owner", "BookMyStudioAppOwner", "index.html"));
});

//

app.get('/',(req,res)=>{
    logger.info('Test API check ---');
    res.json({message:"Test api"});
});


app.use((error, req, res, next) => {
    console.log("Error " ,error);
    let { statusCode, msg } = error;
    statusCode = statusCode || 500;

    if (statusCode == 500) {
        console.log(error);
    }

    if (statusCode == 404 && !msg) msg = "not found";

    res.set('Status-Code', statusCode)
    if (req.header('Ignore-Status-Code') == "true") {
        statusCode = 200;
    }
    console.log(statusCode,"<<<");
    res.status(statusCode).json({
        message: msg || "internal server error",
    });
});


let port = process.env.PORT || 4000;

console.log(port)
//establishing DB connection
mongoConnect(()=>{
    app.listen(port);
});


//Made in Bharat with ❤️
