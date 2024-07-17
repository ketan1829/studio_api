const Transaction = require('../models/transaction');
const ChoiraDiscount = require('../models/choiraDiscount');
const User = require('../models/user');
const Studio = require('../models/studio');

const mongodb = require('mongodb');
const getDb = require('../util/database').getDB; 
const ObjectId = mongodb.ObjectId;

var request = require('request');

// var crypto = require("crypto");
// const Razorpay = require('razorpay');
// var instance = new Razorpay({  key_id: process.env.RAZORPAY_KEY_ID,  key_secret: process.env.RAZORPAY_KEY_SECRET,});


// exports.createPhonePeOrder = (req,res,next)=>{

//     let amount = parseFloat(req.body.amount);

//     var options = {
//         amount: amount * 100,  // amount in the smallest currency unit
//         currency: "INR"
//     };
//     instance.orders.create(options, function(err, order) {
//         // console.log(order);
//         if(err)
//         {
//             return res.status(500).json({status:false, message:"Error Occured", error:err});
//         }
//         else{
//             return res.json({status:true, message:"RazorPay-Order Created Successfully", order:order});
//         }
//     });
      
// }


exports.VerifyPaymentStatus = (req,res,next)=>{

    const { state, merchantId, merchantTransactionId, studioId, userId, amount, transactionStatus } = req.body;

    console.log("req.body:::", req.body);

    if (merchantId === process.env.merchantId) {
        
        const transactionObj = new Transaction(merchantTransactionId, studioId, userId, amount, transactionStatus);

        // saving in database
        // return transactionObj.save()
        // .then(resultData => {
        //     console.log("resultData", resultData);
        //     return res.json({ status: true, message: "Transaction created successfully" });
        // })
        // .catch(err => console.log("Error---->", err));

        return res.json({ status: true, message: "Transaction created successfully" });

    } else {
        res.status(400).json({status:false, message:"Error Occured"});
    }

}

exports.VerifyPaymentStatusWeb = (req,res,next)=>{

    const {code, data} = req.body;
    const {merchantId, merchantTransactionId, transactionId, amount, state, paymentInstrument} = data


    if (merchantId === process.env.merchantId) {

        //+++++++++++++++++++++++++++++++++++++++++++++++++++++
        let saltKey = process.env.phonepeSaltKey;
        let saltIndex = 1
        //++++++++++++++++++++++++++++++++++++++++++++++++++++++
        let surl = 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/PGTESTPAYUAT/' + transactionId;
        //+++++++++++++++++++++++++++++++++++++++++++++++++++++
        let string = '/pg/v1/status/PGTESTPAYUAT/' + transactionId + saltKey;
        //+++++++++++++++++++++++++++++++++++++++++++++++++++++
        let sha256_val = sha256(string);
        let checksum = sha256_val + '###' + saltIndex;
        //+++++++++++++++++++++++++++++++++++++++++++++++++++++
        console.log("checksum:::",checksum);
        //+++++++++++++++++++++++++++++++++++++++++++++++++++++


        axios.get(surl, {
            headers: {
              'Content-Type': 'application/json',
              'X-VERIFY': checksum,
              'X-MERCHANT-ID': transactionId,
              'accept': 'application/json'
            }
        }).then(function (response) {

            Transaction.findTransactionByTransactionId(transactionId)
            .then(transactionData=>{
                if(!transactionData)
                {
                    return res.status(404).json({status:false, message:"No transaction with this ID exists"});
                }
                transactionData.transactionStatus = 1;

                const db = getDb();

                db.collection('transactions').updateOne({transactionId:transactionId},{$set:transactionData})
                .then(resultData=>{

                    return res.json({ status:true, message:response.message });

                })
                .catch(err=>console.log(err));
            })


        })


    } else {
        res.status(400).json({status:false, message:"Error Occured",error:error});
    }
    




    var options = {
        url: 'https://api.razorpay.com/v1/payments/'+paymentId,
        auth: {
            'user': process.env.RAZORPAY_KEY_ID,
            'pass': process.env.RAZORPAY_KEY_SECRET
        }
    };
    
    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            // console.log(body);
            return res.json({status:true, message:"Payment exists",payment:JSON.parse(body)});
        }
        else{
            return res.status(400).json({status:false, message:"Error Occured",error:error});
        }
    }
    
    request(options, callback);

}


exports.createNewTransactionWeb = async (req, res, next) => {

    const apiEndPoint = "/pg/v1/pay";

    const merchantTransactionId = req.body.transactionId;
    let redirectUrl = req.body.redirectUrl;
    let studioId = req.body.studioId;
    const userId = req.body.userId;
    const mobileNumber = req.body.mobileNumber;
    // const paymentInstrumentType = req.body.paymentInstrumentType;
    // let discountId = req.body.discountId;
    const amount = parseFloat(req.body.amount);
    const transactionStatus = 0;


    let normalPayLoad = {
        "merchantId": process.env.merchantId,
        "merchantTransactionId": merchantTransactionId,
        "merchantUserId": userId,
        "amount": amount,
        "redirectUrl": redirectUrl,
        "redirectMode": "POST",
        "callbackUrl": process.env.phonepeCallbackUrl,
        "mobileNumber": mobileNumber,
        "paymentInstrument": {
            "type": "PAY_PAGE"
        }
    }
    let saltKey = '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399';
    let saltIndex = 1
    //++++++++++++++++++++++++++++++++++++++++++++++++++++++
    let bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
    let base64String = bufferObj.toString("base64");
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    //console.log(base64String)
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    let string = base64String + '/pg/v1/pay' + saltKey;
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    let sha256_val = sha256(string);
    let checksum = sha256_val + '###' + saltIndex;
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    //console.log(checksum);
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    axios.post('https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay', {
        'request': base64String
    }, {
        headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'accept': 'application/json'
        }
    }).then(function (response) {

        const transactionObj = new Transaction(response.data.data.merchantTransactionId, studioId, userId, amount, transactionStatus);

        // saving in database
        return transactionObj.save()
        .then(resultData => {
            console.log("resultData", resultData);
            return res.json({ status: true, message: "Transaction created successfully", data: { transaction: resultData, redirectUrl: response.data.data.redirectInfo.url}  });
        })
        .catch(err => console.log("Error---->", err));

        // res.redirect(response.data.data.instrumentResponse.redirectInfo.url);
    }).catch(function (error) {
        // res.render('index', { page_respond_data: JSON.stringify(error) });
        console.log("Error---->", error);
    });





    // if(discountId==undefined || discountId==null)
    // {
    //     discountId = "-1";
    // }

    // if(studioId==undefined || studioId==null)
    // {
    //     studioId = "-1";
    // }

    // Transaction.findTransactionByTransactionId(transactionId)
    // .then(async transactionData=>{
    //     if(transactionData)
    //     {
    //         return res.status(409).json({status:false, message:"Transaction with this ID already exists"});
    //     }

    //     if(discountId.toString()!="-1")
    //     {
    //         let discountData = await ChoiraDiscount.findChoiraDiscountById(discountId)
    //         if(!discountData)
    //         {
    //             return res.status(404).json({status:false, message:"No Discount with this ID exists"});
    //         }
    //     }

    //     const transactionObj = new Transaction(transactionId,studioId,userId,discountId,amount,transactionStatus);

    //     // saving in database
    //     return transactionObj.save()
    //     .then(resultData=>{
    //         return res.json({status:true,message:"Transaction created successfully",transaction:resultData["ops"][0]});
    //     })
    //     .catch(err=>console.log(err));
    // })

}


exports.createNewTransactionUPI = async (req, res, next) => {

    const apiEndPoint = "/pg/v1/pay";

    const merchantTransactionId = req.body.transactionId;
    let redirectUrl = req.body.redirectUrl;
    let studioId = req.body.studioId;
    const userId = req.body.userId;
    const mobileNumber = req.body.mobileNumber;
    const vpa = req.body.vpa
    // const paymentInstrumentType = req.body.paymentInstrumentType;
    // let discountId = req.body.discountId;
    const amount = parseFloat(req.body.amount);
    const transactionStatus = 0;


    let normalPayLoad = {
        "merchantId": process.env.merchantId,
        "merchantTransactionId": merchantTransactionId,
        "merchantUserId": userId,
        "amount": amount,
        "callbackUrl": process.env.phonepeCallbackUrl,
        "mobileNumber": mobileNumber,
        "paymentInstrument": {
            "type": "UPI_COLLECT",
            "vpa": vpa
        }
    }

    let saltKey = '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399';
    let saltIndex = 1
    //++++++++++++++++++++++++++++++++++++++++++++++++++++++
    let bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
    let base64String = bufferObj.toString("base64");
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    //console.log(base64String)
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    let string = base64String + '/pg/v1/pay' + saltKey;
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    let sha256_val = sha256(string);
    let checksum = sha256_val + '###' + saltIndex;
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    //console.log(checksum);
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++
    axios.post('https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay', {
        'request': base64String
    }, {
        headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'accept': 'application/json'
        }
    }).then(function (response) {

        const transactionObj = new Transaction(response.data.data.merchantTransactionId, studioId, userId, amount, transactionStatus);

        // saving in database
        return transactionObj.save()
        .then(resultData => {
            console.log("resultData", resultData);
            return res.json({ status: true, message: response.message  });
        })
        .catch(err => console.log("Error---->", err));

        // res.redirect(response.data.data.instrumentResponse.redirectInfo.url);
    }).catch(function (error) {
        // res.render('index', { page_respond_data: JSON.stringify(error) });
        console.log("Error---->", error);
    });





    // if(discountId==undefined || discountId==null)
    // {
    //     discountId = "-1";
    // }

    // if(studioId==undefined || studioId==null)
    // {
    //     studioId = "-1";
    // }

    // Transaction.findTransactionByTransactionId(transactionId)
    // .then(async transactionData=>{
    //     if(transactionData)
    //     {
    //         return res.status(409).json({status:false, message:"Transaction with this ID already exists"});
    //     }

    //     if(discountId.toString()!="-1")
    //     {
    //         let discountData = await ChoiraDiscount.findChoiraDiscountById(discountId)
    //         if(!discountData)
    //         {
    //             return res.status(404).json({status:false, message:"No Discount with this ID exists"});
    //         }
    //     }

    //     const transactionObj = new Transaction(transactionId,studioId,userId,discountId,amount,transactionStatus);

    //     // saving in database
    //     return transactionObj.save()
    //     .then(resultData=>{
    //         return res.json({status:true,message:"Transaction created successfully",transaction:resultData["ops"][0]});
    //     })
    //     .catch(err=>console.log(err));
    // })

}


exports.getSingleTransactionDetails = (req,res,next)=>{

    const transactionId = req.params.transactionId;

    Transaction.findTransactionByTransactionId(transactionId)
    .then(transactionData=>{
        if(!transactionData)
        {
            return res.status(404).json({status:false, message:"No transaction with this ID exists"});
        }
        return res.json({status:true,message:"Transaction exists",transaction:transactionData});
    })

}


exports.editTransactionStatus = (req,res,next)=>{
    
    const transactionId = req.params.transactionId;
    const transactionStatus = +req.body.transactionStatus;

    Transaction.findTransactionByTransactionId(transactionId)
    .then(transactionData=>{
        if(!transactionData)
        {
            return res.status(404).json({status:false, message:"No transaction with this ID exists"});
        }
        transactionData.transactionStatus = transactionStatus;

        const db = getDb();

        db.collection('transactions').updateOne({transactionId:transactionId},{$set:transactionData})
        .then(resultData=>{
            return res.json({ status:true, message:'Transaction status updated successfully', transaction:transactionData});
        })
        .catch(err=>console.log(err));
    })

}


exports.getAllTransactions = (req,res,next)=>{

    let skip = +req.query.skip;
    let limit = +req.query.limit;

    if(isNaN(skip))
    {
        skip = 0;
        limit = 0;
    }

    Transaction.fetchAllTransactions(skip,limit)
    .then(transactionsData=>{
        let mappedTransactions = [];
        let allTransactions = transactionsData.map(async i=>{
            i.studioName = "NA";
            if(i.studioId!="-1")
            {
                try{
                    let studioInfo = await Studio.findStudioById(i.studioId.trim());
                    if(studioInfo!=null)
                    {
                        i.studioName = studioInfo.fullName;
                    }
                }
                catch(exception)
                {
                    i.studioName = "NA";
                }
            }
            i.userName = "";
            i.userEmail = "NA";
            let userData = await User.findUserByUserId(i.userId);
            if(userData!=null)
            {
                i.userName = userData.fullName;
                i.userEmail = userData.email;
            }

            i.discountType = "NA";
            if(i.discountId!="-1")
            {
                let discountInfo = await ChoiraDiscount.findChoiraDiscountById(i.discountId);
                if(discountInfo!=null)
                {
                    i.discountType = discountInfo.discountType;
                    if(i.discountType==0)
                    {
                        i.discountType = "User discount - First";
                    }
                    else if(i.discountType==1)
                    {
                        i.discountType = "User discount - Recurring";
                    }
                    else if(i.discountType==2)
                    {
                        i.discountType = "Event-based";
                    }
                    else{
                        i.discountType = "Specific User";
                    }
                }
            }

            i.transactionStatusValue = i.transactionStatus==1?'Success':(i.transactionStatus==2?'Failed':'Pending');
            mappedTransactions.push(i);
            if(mappedTransactions.length==transactionsData.length)
            {
                return res.json({status:true, message:"All transaction(s) returned",transactions:mappedTransactions});
            }
        });
    })

}


exports.getAllTransactionsOfParticularStudio = (req,res,next)=>{

    const studioId = req.params.studioId;

    let skip = +req.query.skip;
    let limit = +req.query.limit;

    if(isNaN(skip))
    {
        skip = 0;
        limit = 0;
    }

    Transaction.fetchAllTransactionsByStudioId(studioId,skip,limit)
    .then(transactionsData=>{
        let mappedTransactions = [];
        let allTransactions = transactionsData.map(async i=>{
            i.studioName = "NA";
            if(i.studioId!="-1")
            {
                try{
                    let studioInfo = await Studio.findStudioById(i.studioId.trim());
                    if(studioInfo!=null)
                    {
                        i.studioName = studioInfo.fullName;
                    }
                }
                catch(exception)
                {
                    i.studioName = "NA";
                }
            }
            i.userName = "";
            i.userEmail = "NA";
            let userData = await User.findUserByUserId(i.userId);
            if(userData!=null)
            {
                i.userName = userData.fullName;
                i.userEmail = userData.email;
            }

            i.discountType = "NA";
            if(i.discountId!="-1")
            {
                let discountInfo = await ChoiraDiscount.findChoiraDiscountById(i.discountId);
                if(discountInfo!=null)
                {
                    i.discountType = discountInfo.discountType;
                    if(i.discountType==0)
                    {
                        i.discountType = "User discount - First";
                    }
                    else if(i.discountType==1)
                    {
                        i.discountType = "User discount - Recurring";
                    }
                    else if(i.discountType==2)
                    {
                        i.discountType = "Event-based";
                    }
                    else{
                        i.discountType = "Specific User";
                    }
                }
            }

            i.transactionStatusValue = i.transactionStatus==1?'Success':(i.transactionStatus==2?'Failed':'Pending');
            mappedTransactions.push(i);
            if(mappedTransactions.length==transactionsData.length)
            {
                return res.json({status:true, message:"All transaction(s) returned",transactions:mappedTransactions});
            }
        });
    })

}


exports.getTransactionsByDate = (req,res,next)=>{

    let startDate = req.body.startDate;
    let endDate = req.body.endDate;
    let studioId = req.body.studioId;

    //get startDate from timestamp
    startDate = new Date(startDate);
    var yr = startDate.getUTCFullYear();
    var mth = startDate.getUTCMonth() + 1;
    if(mth.toString().length==1)
    {
        mth = "0"+mth.toString();
    }
    var dt = startDate.getUTCDate();
    if(dt.toString().length==1)
    {
        dt = "0"+dt.toString();
    }
    startDate = yr+"-"+mth+"-"+dt;
    var sTimeStamp = new Date(startDate).getTime();
    console.log("Start Date : ",startDate);

    //get endDate from timestamp
    endDate = new Date(endDate);
    var yr = endDate.getUTCFullYear();
    var mth = endDate.getUTCMonth() + 1;
    if(mth.toString().length==1)
    {
        mth = "0"+mth.toString();
    }
    var dt = endDate.getUTCDate();
    if(dt.toString().length==1)
    {
        dt = "0"+dt.toString();
    }
    endDate = yr+"-"+mth+"-"+dt;
    var eTimeStamp = new Date(endDate).getTime();
    console.log("End Date : ",endDate);
    
    if(studioId==undefined)
    {
        console.log("No Studio");
        Transaction.fetchTransactionsByDateRange(startDate,endDate)
        .then(transactionsData=>{
            if(transactionsData.length==0)
            {
                return res.json({status:true, message:"No transactions exists for this range",transactions:[]});
            }
            let mappedTransactions = [];
            let allTransactions = transactionsData.map(async i=>{
                i.studioName = "NA";
                if(i.studioId!="-1" && i.studioId.length==24)
                {
                    let studioInfo = await Studio.findStudioById(i.studioId);
                    if(studioInfo!=null)
                    {
                        i.studioName = studioInfo.fullName;
                    }
                }
                i.userName = "";
                i.userEmail = "NA";
                let userData = await User.findUserByUserId(i.userId);
                if(userData!=null)
                {
                    i.userName = userData.fullName;
                    i.userEmail = userData.email;
                }
    
                i.discountType = "NA";
                if(i.discountId!="-1")
                {
                    let discountInfo = await ChoiraDiscount.findChoiraDiscountById(i.discountId);
                    if(discountInfo!=null)
                    {
                        i.discountType = discountInfo.discountType;
                        if(i.discountType==0)
                        {
                            i.discountType = "User discount - First";
                        }
                        else if(i.discountType==1)
                        {
                            i.discountType = "User discount - Recurring";
                        }
                        else if(i.discountType==2)
                        {
                            i.discountType = "Event-based";
                        }
                        else{
                            i.discountType = "Specific User";
                        }
                    }
                }
    
                i.transactionStatusValue = i.transactionStatus==1?'Success':(i.transactionStatus==2?'Failed':'Pending');
                mappedTransactions.push(i);
                if(mappedTransactions.length==transactionsData.length)
                {
                    return res.json({status:true, message:"All transaction(s) returned",transactions:mappedTransactions});
                }
            });
        })
    }
    else{
        console.log("Studio Exists");
        Transaction.fetchTransactionsByStudioAndDateRange(studioId,startDate,endDate)
        .then(transactionsData=>{
            if(transactionsData.length==0)
            {
                return res.json({status:true, message:"No transactions exists for this range",transactions:[]});
            }
            let mappedTransactions = [];
            let allTransactions = transactionsData.map(async i=>{
                i.studioName = "NA";
                if(i.studioId!="-1" && i.studioId.length==24)
                {
                    let studioInfo = await Studio.findStudioById(i.studioId);
                    if(studioInfo!=null)
                    {
                        i.studioName = studioInfo.fullName;
                    }
                }
                i.userName = "";
                i.userEmail = "NA";
                let userData = await User.findUserByUserId(i.userId);
                if(userData!=null)
                {
                    i.userName = userData.fullName;
                    i.userEmail = userData.email;
                }
    
                i.discountType = "NA";
                if(i.discountId!="-1")
                {
                    let discountInfo = await ChoiraDiscount.findChoiraDiscountById(i.discountId);
                    if(discountInfo!=null)
                    {
                        i.discountType = discountInfo.discountType;
                        if(i.discountType==0)
                        {
                            i.discountType = "User discount - First";
                        }
                        else if(i.discountType==1)
                        {
                            i.discountType = "User discount - Recurring";
                        }
                        else if(i.discountType==2)
                        {
                            i.discountType = "Event-based";
                        }
                        else{
                            i.discountType = "Specific User";
                        }
                    }
                }
    
                i.transactionStatusValue = i.transactionStatus==1?'Success':(i.transactionStatus==2?'Failed':'Pending');
                mappedTransactions.push(i);
                if(mappedTransactions.length==transactionsData.length)
                {
                    return res.json({status:true, message:"All transaction(s) returned",transactions:mappedTransactions});
                }
            });
        })
    }

}


exports.getAllTransactionsGraphDetails = (req,res,next)=>{

    var today = new Date();
    // var today = new Date();
    var d;
    var months = [];
    var d = new Date();
    var month;
    var year = d.getFullYear();
    // console.log(year)

    //for last 6 months(including current month)
    // for(var i = 5; i > -1; i -= 1) {
    var keyData = 1;
    //for last 6 months(excluding current month)
    for(var i = 6; i > 0; i -= 1) {
      d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    //   console.log(d.getFullYear())
   
      months.push({month:d.getMonth(),year:d.getFullYear(),key:keyData,transactionCount:0});
      keyData = keyData+1;
    }
    console.log(months);
    
    Transaction.fetchAllTransactions(0,0)
    .then(transactionsData=>{
        transactionsData = transactionsData.filter(i=>i.transactionStatus==1);
        transactionsData.forEach(singleTransaction=>{
            var dt1 = new Date(singleTransaction.creationTimeStamp);
            var monthOnly = dt1.getMonth();
            months.forEach(mth=>{
                if((+mth.month)==(+monthOnly))
                {
                    // mth.transactionCount = mth.transactionCount + 1;
                    mth.transactionCount = parseFloat(mth.transactionCount) + singleTransaction.amount;
                }
            });
        });

        setTimeout(()=>{
            months.forEach(mthData=>{
                if(mthData.month==0)
                {
                    mthData.month = "January"
                }
                if(mthData.month==1)
                {
                    mthData.month = "Febuary"
                }
                if(mthData.month==2)
                {
                    mthData.month = "March"
                }
                if(mthData.month==3)
                {
                    mthData.month = "April"
                }
                if(mthData.month==4)
                {
                    mthData.month = "May"
                }
                if(mthData.month==5)
                {
                    mthData.month = "June"
                }
                if(mthData.month==6)
                {
                    mthData.month = "July"
                }
                if(mthData.month==7)
                {
                    mthData.month = "August"
                }
                if(mthData.month==8)
                {
                    mthData.month = "September"
                }
                if(mthData.month==9)
                {
                    mthData.month = "Ocober"
                }
                if(mthData.month==10)
                {
                    mthData.month = "November"
                }
                if(mthData.month==11)
                {
                    mthData.month = "December"
                }
                
            });

            months.sort((a, b) => {
                return a.key - b.key;
            });

            //retrieving only months
            var allMonths = [];
            months.forEach(m=>{
                allMonths.push(m.month);
            });

            //retrieving only transactionCounts
            var allTransactionCounts = [];
            months.forEach(m=>{
                allTransactionCounts.push(parseFloat(m.transactionCount.toFixed(2)));
            });

            res.json({status:true,message:"All data returned",allMonths:allMonths,allTransactionCounts:allTransactionCounts,allData:months});
        },1000);
    })

}


exports.getAllTransactionsGraphDetailsForParticularStudio = (req,res,next)=>{

    const studioId = req.params.studioId;

    var today = new Date();
    // var today = new Date();
    var d;
    var months = [];
    var d = new Date();
    var month;
    var year = d.getFullYear();
    // console.log(year)

    //for last 6 months(including current month)
    // for(var i = 5; i > -1; i -= 1) {
    var keyData = 1;
    //for last 6 months(excluding current month)
    for(var i = 6; i > 0; i -= 1) {
      d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    //   console.log(d.getFullYear())
   
      months.push({month:d.getMonth(),year:d.getFullYear(),key:keyData,transactionCount:0});
      keyData = keyData+1;
    }
    console.log(months);
    
    Transaction.fetchAllTransactionsByStudioId(studioId,0,0)
    .then(transactionsData=>{
        transactionsData = transactionsData.filter(i=>i.transactionStatus==1);
        transactionsData.forEach(singleTransaction=>{
            var dt1 = new Date(singleTransaction.creationTimeStamp);
            var monthOnly = dt1.getMonth();
            months.forEach(mth=>{
                if((+mth.month)==(+monthOnly))
                {
                    // mth.transactionCount = mth.transactionCount + 1;
                    mth.transactionCount = parseFloat(mth.transactionCount) + singleTransaction.amount;
                }
            });
        });

        setTimeout(()=>{
            months.forEach(mthData=>{
                if(mthData.month==0)
                {
                    mthData.month = "January"
                }
                if(mthData.month==1)
                {
                    mthData.month = "Febuary"
                }
                if(mthData.month==2)
                {
                    mthData.month = "March"
                }
                if(mthData.month==3)
                {
                    mthData.month = "April"
                }
                if(mthData.month==4)
                {
                    mthData.month = "May"
                }
                if(mthData.month==5)
                {
                    mthData.month = "June"
                }
                if(mthData.month==6)
                {
                    mthData.month = "July"
                }
                if(mthData.month==7)
                {
                    mthData.month = "August"
                }
                if(mthData.month==8)
                {
                    mthData.month = "September"
                }
                if(mthData.month==9)
                {
                    mthData.month = "Ocober"
                }
                if(mthData.month==10)
                {
                    mthData.month = "November"
                }
                if(mthData.month==11)
                {
                    mthData.month = "December"
                }
                
            });

            months.sort((a, b) => {
                return a.key - b.key;
            });

            //retrieving only months
            var allMonths = [];
            months.forEach(m=>{
                allMonths.push(m.month);
            });

            //retrieving only transactionCounts
            var allTransactionCounts = [];
            months.forEach(m=>{
                allTransactionCounts.push(parseFloat(m.transactionCount.toFixed(2)));
            });

            res.json({status:true,message:"All data returned",allMonths:allMonths,allTransactionCounts:allTransactionCounts,allData:months});
        },1000);
    })

}
