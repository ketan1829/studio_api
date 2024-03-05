const express = require('express');
const router = express.Router();
const {send_mail} = require("../util/mail.js")

router.post('/send/mail',(req,res,next)=>{
    send_mail({userName:"Tester"});
    res.json({message:"send mail hit"});
});

module.exports = router;
