const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 

const ObjectId = mongodb.ObjectId;

class Admin
{
    constructor(id,fname,lname,email,password,adminImage,token)
    {
        this.adminId = id;
        this.firstName = fname;
        this.lastName = lname;
        this.email = email;
        this.password = password;
        this.adminImage = adminImage;
        this.token = token;
    }

    save()
    {
        const db = getDb();
        return db.collection('admins').insertOne(this);
    }

    static findAdminByEmail(email)
    {
        const db = getDb();
                            
        return db.collection('admins').findOne({ email:email })
                .then(adminData=>{
                    return adminData;
                })
                .catch(err=>console.log(err));
    }

    static findAdminByNumber(phone)
    {
        const db = getDb();
                            
        return db.collection('admins').findOne({ phone:phone })
                .then(adminData=>{
                    return adminData;
                })
                .catch(err=>console.log(err));
    }

    static findAdminById(adminId)
    {
        const db = getDb();
        var o_id = new ObjectId(adminId);
        return db.collection('admins').findOne({_id:o_id})
                .then(adminData=>{
                    return adminData;
                })
                .catch(err=>console.log(err));
    }

    static findAdminByAdminId(adminId)
    {
        const db = getDb();
        return db.collection('admins').findOne({adminId:adminId})
                .then(adminData=>{
                    return adminData;
                })
                .catch(err=>console.log(err));
    }
  
    static fetchAllAdmins()
    {
        const db = getDb();
        return db.collection('admins').find().toArray()
                .then(adminData=>{
                    return adminData;
                })
                .catch(err=>console.log(err));
    }

}


module.exports = Admin;
