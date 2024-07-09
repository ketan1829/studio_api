const SubAdmin = require('../models/subAdmin');

const axios = require('axios');

const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 
const ObjectId = mongodb.ObjectId;

const jwt = require('jsonwebtoken');
const { sendMsg91OTP } = require('../util/mail');


exports.createNewSubAdmin = async(req,res,next)=>{

    const firstName = req.body.firstName.trim();
    const lastName = req.body.lastName.trim();
    const email = req.body.email;
    const password = req.body.password;
    const permissions = req.body.permissions;
    const phone = req.body.phone;

    SubAdmin.findSubAdminByEmail(email)
    .then(subAdminData=>{
        if(subAdminData)
        {
            return res.json({status:false, message:"Sub-Admin with this Email already exists"});
        }
        const subAdminObj = new SubAdmin(firstName,lastName,email,password,permissions,phone);
        
        // saving in database
        return subAdminObj.save()
        .then(resultData=>{
            return res.json({status:true,message:"Sub-Admin created successfully",subAdmin:resultData["ops"][0]});
        })
        .catch(err=>console.log(err));
    })

}


exports.subAdminLogin = async(req,res,next)=>{

    const email = req.body.email;
    const password = req.body.password;
    const phoneNumber = req.body.phoneNumber;
    const userType = req.body.userType;

    if(userType==="Number"){
        let db = getDb()
        let subadmin = await SubAdmin.findSubAdminByNumber(phoneNumber)
        console.log("subadmin",subadmin);
        if(!subadmin){
            return res.status(200).json({
                status:false,
                message:"SubAdmin not found in DB"
            })
        }
        const status_otp = await sendMsg91OTP(`${subadmin.phone}`);
        if(!(status_otp.status)){
          return res.status(400).json({
            status:false,
            message:"Error while sending OTP to SubAdmin"
        })
    }
        res.status(200).json({
            status: true,
            message: "Hello Admin, OTP has been send Succesfully",
        })
    }
    else{
    SubAdmin.findSubAdminByEmail(email)
    .then(subAdminData=>{
        if(!subAdminData)
        {
            return res.json({status:false, message:'No Sub-Admin with this email exists'});
        }

        if(subAdminData.password!=password)
        {
            return res.json({status:false, message:"Incorrect password"});
        }

        const db = getDb();
        db.collection('subAdmins').updateOne({email:email},{$set:subAdminData})
        .then(resultData=>{
            jwt.sign({ admin:subAdminData }, 'myAppSecretKey', (err, token) => {
                res.json({
                    status: true,
                    message: "Successfully Logged In",
                    subAdmin: subAdminData,
                    token: token
                });
            });
        })
        .catch(err=>console.log(err));
    })
}

}


exports.getParticularSubAdminDetails = (req,res,next)=>{

    const subAdminId = req.params.subAdminId;

    SubAdmin.findSubAdminById(subAdminId)
    .then(subAdminData=>{
        if(!subAdminData)
        {
            return res.json({status:false, message:'No Sub-Admin with this ID exists'});
        }
        return res.json({status:true, message:"Sub-Admin exists",subAdmin:subAdminData});
    })

}


exports.getAllsubadmins = (req,res,next)=>{

    let skip = +req.query.skip;
    let limit = +req.query.limit;

    if(isNaN(skip))
    {
        skip = 0;
        limit = 0;
    }

    SubAdmin.fetchAllSubAdmins(skip,limit)
    .then(subAdminsData=>{
        return res.json({status:true, message:"All Sub-Admins returned",subAdmins:subAdminsData});
    })

}


function checkEmailAvailability(subAdminId, email,_callBack)
{
    SubAdmin.findSubAdminById(subAdminId)
    .then(subAdminDoc=>{
        if(!subAdminDoc)
        {
            _callBack(false,"No Sub-Admin with this ID exists");
            return;
        }
        SubAdmin.findSubAdminByEmail(email)
        .then(subAdminNew=>{
            if(!subAdminNew)
            {
                _callBack(true,"New Email");
                return;
            }
            else if(subAdminNew.email == subAdminDoc.email)
            {
                _callBack(true,"Same Email");
                return;
            }
            else if(subAdminNew.email != subAdminDoc.email)
            {
                _callBack(false,"Email already used by another sub-admin");
                return;
            }
        })
    })
}

exports.editSubAdminDetails = (req,res,next)=>{

    const subAdminId = req.params.subAdminId;
    const firstName = req.body.firstName.trim();
    const lastName = req.body.lastName.trim();
    const email = req.body.email;
    const password = req.body.password;
    const permissions = req.body.permissions;

    SubAdmin.findSubAdminById(subAdminId)
    .then(subAdminData=>{
        if(!subAdminData)
        {
            return res.json({status:false, message:"No Sub-Admin with this ID exists"});
        }
        subAdminData.firstName = firstName;
        subAdminData.lastName = lastName;
        subAdminData.password = password;
        subAdminData.permissions = permissions;

        checkEmailAvailability(subAdminId, email, (valStatus,valMsg) => {
            if(!valStatus)
            {
                return res.json({status:false, message:valMsg});
            }
            subAdminData.email = email;

            const db = getDb();
            var o_id = new ObjectId(subAdminId);
            db.collection('subAdmins').updateOne({_id:o_id},{$set:subAdminData})
            .then(resultData=>{
                res.json({status:true, message:'Sub-Admin details updated successfully',subAdmin:subAdminData});
            })
            .catch(err=>console.log(err));
        })
    })

}


exports.deleteParticularSubAdmin = (req,res,next)=>{

    const subAdminId = req.params.subAdminId;

    SubAdmin.findSubAdminById(subAdminId)
    .then(subAdminData=>{
        if(!subAdminData)
        {
            return res.status(404).json({status:false, message:"No Sub-Admin with this ID exists"});
        }

        const db = getDb();
        var o_id = new ObjectId(subAdminId);

        db.collection('subAdmins').deleteOne({_id:o_id})
        .then(resultData=>{
            return res.json({ status:true, message:'Sub-Admin deleted successfully'});
        })
        .catch(err=>console.log(err));
    })

}
