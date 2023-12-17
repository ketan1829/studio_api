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
        title: "BookMyStudioApp - API",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://bookmystudioapp.herokuapp.com/api/",
        },
        {
          url:"http://ec2-3-109-47-228.ap-south-1.compute.amazonaws.com/api/"
        },
        {
          url: "http://localhost:8080/api/",
        },
        {
          url: "http://sadmin.choira.io:4000/api/",
        },
        {
          url: "http://studiotest.choira.io/api/",
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
    res.setHeader('Access-Control-Allow-Origin','*');
                                           
                        //specifying which methods are allowed
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE');

    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');

    next();  //so that request continues to next middleware
});


app.get('/api', (req, res) => {
  res.send('Studio Test Api is live !!')
})
app.use('/api',adminRoutes);
app.use('/api',userRoutes);
app.use('/api',studioRoutes);
app.use('/api',bookingRoutes);
app.use('/api',ratingRoutes);
app.use('/api',transactionRoutes);
app.use('/api',phonePeTransactionRoutes);
app.use('/api',choiraDiscountRoutes);
app.use('/api',subAdminRoutes);
app.use('/api',notificationsRoutes);
app.use('/api',ownerRoutes);
app.use('/api',adminNotificationsRoutes);
app.use('/api',mailtestRoutes);

// serve static folder (admin-panel)
app.use(express.static("dist-payment/bms-webpayment"));

// show admin panel 
app.get("/webPayment*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist-payment", "bms-webpayment", "index.html"));
});

// serve static folder (super admin-panel)
app.use(express.static("dist/BookMyStudioAppAdmin"));

// show admin panel 
app.get("/bms-admin*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "BookMyStudioAppAdmin", "index.html"));
});

// serve static folder (owner-panel)
// app.use(express.static("dist-owner/BookMyStudioAppOwner"));

// // show admin panel
// app.get("/studio-owner*", (req, res) => {
//     res.sendFile(path.resolve(__dirname, "dist-owner", "BookMyStudioAppOwner", "index.html"));
// });

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
    console.log(statusCode,"<<<");
    res.status(statusCode).json({
        message: msg || "internal server error",
    });
});


let port = process.env.PORT || 4000;
//establishing DB connection
mongoConnect(()=>{
    app.listen(port);

});
