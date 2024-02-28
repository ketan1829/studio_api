const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: __dirname + '/.env' })

const path = require('path');

const mongoConnect = require('./util/database').mongoConnect;

const app = express();

const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const studioRoutes = require('./routes/studio');
const bookingRoutes = require('./routes/booking');
const ratingRoutes = require('./routes/rating');
const transactionRoutes = require('./routes/transaction');
const choiraDiscountRoutes = require('./routes/choiraDiscount');
const subAdminRoutes = require('./routes/subAdmin');
const notificationsRoutes = require('./routes/notifications');
const ownerRoutes = require('./routes/owner');
const adminNotificationsRoutes = require('./routes/adminNotifications');


//SWAGGER
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    swaggerDefinition: {
      openapi: "3.0.1",
      info: {
        title: "Choira Studios - API",
        version: "2.2.0",
      },
      servers: [
        {
          url: "http://localhost:8080/api/",
        },
        {
          url:"http://studioadmin.choira.io"
        },
        {
          url:"https://sadmin.choira.io"
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

const specs = swaggerJsdoc(options);
// app.use(
//     "/api-docs",
//     swaggerUi.serve,
//     swaggerUi.setup(specs, { explorer: true })     //Explorer is used for search bar
// );


// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use('/uploads',express.static('uploads'));


app.use(bodyParser.json());  //for application/json data


//enabling CORS package
app.use((req,res,next)=>{
    //setting header to all responses
    res.setHeader('Access-Control-Allow-Origin','*');  
                                           
                        //specifying which methods are allowed
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE');

    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');

    next();  //so that request continues to next middleware
});


app.get("/api/status", (req, res) => {
  console.log("Logg - Home")
  return res.json({message:"Api is live !"});
});


app.use('/api',adminRoutes);
app.use('/api',userRoutes);
app.use('/api',studioRoutes);
app.use('/api',bookingRoutes);
app.use('/api',ratingRoutes);
app.use('/api',transactionRoutes);
app.use('/api',choiraDiscountRoutes);
app.use('/api',subAdminRoutes);
app.use('/api',notificationsRoutes);
app.use('/api',ownerRoutes);
app.use('/api',adminNotificationsRoutes);

// serve static folder (admin-panel)
// app.use(express.static("/dist-payment/bms-webpayment")); // WebApps/Studio_Panels/dist
app.use(express.static("../../WebApps/Studio_Panels/dist-payment/bms-webpayment"));

// show admin panel 
app.get("/webPayment*", (req, res) => {
    // res.sendFile(path.resolve(__dirname, "dist-payment", "bms-webpayment", "index.html"));
    res.sendFile(path.resolve(__dirname,  "..","..", "WebApps", "Studio_Panels", "dist-payment", "bms-webpayment", "index.html"));
});

// serve static folder (super admin-panel)
// app.use(express.static("dist/BookMyStudioAppAdmin"));
app.use(express.static("../../WebApps/Studio_Panels/dist/BookMyStudioAppAdmin"));

// show admin panel 
app.get("/bms-admin*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "..","..","WebApps", "Studio_Panels", "dist", "BookMyStudioAppAdmin", "index.html"));
});

// serve static folder (owner-panel)
// app.use(express.static("dist-owner/BookMyStudioAppOwner"));
app.use(express.static("../../WebApps/Studio_Panels/dist-owner/BookMyStudioAppOwner"));

// // show admin panel
app.get("/studio-owner*", (req, res) => {
    // res.sendFile(path.resolve(__dirname, "dist-owner", "BookMyStudioAppOwner", "index.html"));
    res.sendFile(path.resolve(__dirname, "..","..","WebApps", "Studio_Panels", "dist-owner", "BookMyStudioAppOwner", "index.html"));
});

// app.get('/',(req,res)=>{
//     res.json({message:"deploy api"});
// });

// error handler
app.use((error, req, res, next) => {
    // console.log("Error " ,error);
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
    console.log(statusCode);
    res.status(statusCode).json({
        message: msg || "internal server error",
    });
});


let port = process.env.PORT || 80;
//establishing DB connection
mongoConnect(()=>{
     
    //listening to incoming request on this port
    app.listen(port);

});
