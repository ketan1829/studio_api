const Admin = require('../models/admin');

const getDb = require('../util/database').getDB; 

const jwt = require('jsonwebtoken');

//For Email 
var nodemailer = require('nodemailer');
const { sendMsg91OTP } = require('../util/mail');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  name: 'smtp.mail.com',
  auth: {
    user: '',
    pass: '',
    port:465,
    sendmail: true
  }
}
);


exports.adminRegister = (req,res,next)=>{
    
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;  
    const password = req.body.password;
    const phone = req.body.phone;
    
    const adminImage = null;
    const token = null;

    let adminID;
    Admin.findAdminByEmail(email)
    .then(adminDoc=>{
        if(adminDoc){                        
            return res.json({status:false, message:'Admin Already Exists(Enter unique email)',admin:adminDoc});
        }

        const db = getDb();
        db.collection('adminCounter').find().toArray().then(data=>{

            newVal = data[data.length-1].count;
            
            newVal = newVal + 1;
            console.log(newVal);

            adminID = newVal;

            db.collection('adminCounter').insertOne({count:newVal})
            .then(result=>{

                const admin = new Admin(adminID,firstName,lastName,email,password,phone,adminImage,token);

                //saving in database
                return admin.save()
                .then(resultData=>{                
                    res.json({status:true,message:"Admin Registered",admin:resultData["ops"][0]});                
                })
                .catch(err=>console.log(err));    
            })
            .then(resultData=>{

            })
            .catch(err=>{
                res.json({status:false,error:err});
            })  
        })
    })
}


exports.adminLogin= async(req,res,next)=>{

    const email = req.body.email;
    const password = req.body.password;
    const userType = req.body.userType;
    const phoneNumber = req.body.phoneNumber;
    
    if(userType==="NUMBER"){
        let adminData = await Admin.findAdminByNumber(phoneNumber)
    if(!adminData){
                return res.json({status:false,message:'Admin does not exist'});
    }
    const status_otp = await sendMsg91OTP(`${adminData.phone}`);
        if(!(status_otp.status)){
          return res.status(400).json({
            status:false,
            message:"Error while sending OTP to admin"
        })
    }
    const AdminData = {
        id: adminData.adminId,
        fullName: adminData.fullName,
        emailId: adminData.email,
        Image: adminData.adminImage,
        phoneNumber: adminData.phone,
        role: adminData.role,
      };
      // console.log(">------",AdminData.phoneNumber);
    //   const token = await jwt.sign({ admin: AdminData }, 'myAppSecretKey');
      return res.json({
        status: true,
        message: "Hello Admin, OTP has been send Succesfully",
        user: AdminData,
      });
    }else{
    Admin.findAdminByEmail(email)
    .then(user=>{
        if(!user)
        {
            return res.json({status:false,message:'Admin does not exist'});
        }

        if(user.password == password)
        {                  
            jwt.sign({ admin:user }, 'myAppSecretKey', (err, token) => {
                res.json({ status:true, message:'Login Successful',admin:user,token: token});
            });
        }else{
            res.json({ message:'Password is incorrect',status:false});
        }
    })
    }

}


exports.getSingleAdmin=(req,res,next)=>{

    const adminId = +req.params.adminId;
    
    Admin.findAdminByAdminId(adminId)
    .then(adminData=>{
        if(!adminData)
        {
            return res.json({status:false, message:'Admin does not exist'});
        }

        return res.json({status:true,message:"Admin Exists",admin:adminData});
    })
}


exports.adminSendToken = (req,res,next)=>{

    const email = req.body.email;
    console.log(email);

    Admin.findAdminByEmail(email)
    .then(adminDoc=>{
        if(!adminDoc)
        {
            return res.json({status:false, message:'Admin does not exist'});
        }
    
        var token = "";

        var length = 6,
        charset = "123456789",        
        retVal = "";
        for (var i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        token = retVal;
    
        var mailOptions = {
            from: '',
            to: email,
            subject: 'Password Reset TOKEN',
            port:465,
            text: 'You requested a password reset. Your token - '+token
        };          
            
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
            console.log(error);
            return res.json({status:false, message:"Error Occured", error:error});
            } else {
            console.log('Email sent: ' + info.response);
            adminDoc.token = token;
                const db = getDb();
                db.collection('admins').updateOne({email:email},{$set:adminDoc})
                    .then(resultData=>{
                        
                        res.json({status:true, message:'Token sent',email:email,token:token});    
                    })
                    .catch(err=>console.log(err));
            }
        });
    })    

}


exports.adminForgotPassword = (req,res,next)=>{

    const email = req.body.email;
    const newPassword = req.body.newPassword;
    const token = req.body.token;

    Admin.findAdminByEmail(email)
    .then(adminDoc=>{
        if(!adminDoc)
        {
            return res.json({ message:'Admin does not exist',status:false});
        }
        if(adminDoc.token!=token)
        {
            return res.json({ message:'Enter Valid Token',status:false});
        }
        
        adminDoc.password = newPassword;
        adminDoc.token = null;
    
        const db = getDb();
        db.collection('admins').updateOne({email:email},{$set:adminDoc})
            .then(resultData=>{
                
                res.json({status:true, message:'Password Reset Successfully',admin:adminDoc});    
            })
            .catch(err=>console.log(err));
    })    
}


exports.editAdminDetails = (req,res,next)=>{
    
    const adminId = +req.params.adminId;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const password = req.body.password;
    
    Admin.findAdminByAdminId(+adminId)
    .then(adminDoc=>{
        if(!adminDoc)
        {
            return res.json({status:false,message:'Admin does not exist'});
        }

        Admin.findAdminByEmail(email)
        .then(adminNew=>{
            if(!adminNew)
            {
                adminDoc.firstName = firstName;
                adminDoc.lastName = lastName;
                adminDoc.password = password;
                adminDoc.email = email;
                    
                const db = getDb();
                db.collection('admins').updateOne({adminId:adminId},{$set:adminDoc})
                .then(resultData=>{                    
                    return res.json({status:true,message:'Details updated successfully',admin:adminDoc});
                })
                .catch(err=>console.log(err));
            }
            else if(adminNew.email == adminDoc.email)
            {
                adminDoc.firstName = firstName;
                adminDoc.lastName = lastName;
                adminDoc.password = password;
                    
                const db = getDb();
                db.collection('admins').updateOne({adminId:adminId},{$set:adminDoc})
                .then(resultData=>{                    
                    return res.json({status:true,message:'Details updated successfully',admin:adminDoc});
                })
                .catch(err=>console.log(err));
            }
            else if(adminNew.email != adminDoc.email)
            {
                return res.json({status:false, message:"Email Already Exists"});
            }
        })                
    })

}


exports.editAdminImage = (req,res,next)=>{
    
    const adminId = +req.params.adminId;
    const adminImage = req.body.adminImage;    //URL
    
    Admin.findAdminByAdminId(+adminId)
    .then(adminDoc=>{
        if(!adminDoc)
        {
            return res.json({status:false,message:'Admin does not exist'});
        }

        adminDoc.adminImage = adminImage;

        const db = getDb();
        db.collection('admins').updateOne({adminId:adminId},{$set:adminDoc})
        .then(resultData=>{
            return res.json({status:true,message:'Image updated successfully',admin:adminDoc});
        })
        .catch(err=>console.log(err));
    })

}

exports.addBanner1Image = (req,res,next)=>{
    
    const adminId = +req.params.adminId;
    const Banner1Image = req.body.Banner1Image;    //URL
    
    Admin.findAdminByAdminId(+adminId)
    .then(adminDoc=>{
        if(!adminDoc)
        {
            return res.json({status:false,message:'Admin does not exist'});
        }

        adminDoc.Banner1Image = Banner1Image;

        const db = getDb();
        db.collection('admins').updateOne({adminId:adminId},{$set:adminDoc})
        .then(resultData=>{
            return res.json({status:true,message:'Banner Img updated successfully',admin:adminDoc});
        })
        .catch(err=>console.log(err));
    })

}

exports.addBanner2Image = (req,res,next)=>{
    
    const adminId = +req.params.adminId;
    const Banner2Image = req.body.Banner2Image;    //URL
    
    Admin.findAdminByAdminId(+adminId)
    .then(adminDoc=>{
        if(!adminDoc)
        {
            return res.json({status:false,message:'Admin does not exist'});
        }

        adminDoc.Banner2Image = Banner2Image;

        const db = getDb();
        db.collection('admins').updateOne({adminId:adminId},{$set:adminDoc})
        .then(resultData=>{
            return res.json({status:true,message:'Exclusive Banner Img updated successfully',admin:adminDoc});
        })
        .catch(err=>console.log(err));
    })

}

exports.removeBanner1Image = (req, res, next) => {
    const adminId = +req.params.adminId;

    Admin.findAdminByAdminId(+adminId)
        .then(adminDoc => {
            if (!adminDoc) {
                return res.json({ status: false, message: 'Admin does not exist' });
            }

            // Set Banner1Image to null or any initial state
            adminDoc.Banner1Image = null;

            const db = getDb();
            db.collection('admins').updateOne({ adminId: adminId }, { $set: adminDoc })
                .then(resultData => {
                    return res.json({ status: true, message: 'Banner Img removed successfully', admin: adminDoc });
                })
                .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
};

exports.removeBanner2Image = (req, res, next) => {
    const adminId = +req.params.adminId;

    Admin.findAdminByAdminId(+adminId)
        .then(adminDoc => {
            if (!adminDoc) {
                return res.json({ status: false, message: 'Admin does not exist' });
            }

            // Set Banner1Image to null or any initial state
            adminDoc.Banner2Image = null;

            const db = getDb();
            db.collection('admins').updateOne({ adminId: adminId }, { $set: adminDoc })
                .then(resultData => {
                    return res.json({ status: true, message: 'Exclusive Banner Img removed successfully', admin: adminDoc });
                })
                .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
};