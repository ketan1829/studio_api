module.exports.verifyToken = function verifyToken(req,res,next)
{
    //Get auth header value
    const bearerHeader = req.headers['authorization'];
    // console.log(bearerHeader);
    if(typeof bearerHeader !== 'undefined')
    {
                           //split at the space
        const bearer = bearerHeader.split(' ');
        //get token from array
        const bearerToken = bearer[1];

        //set the token
        req.token = bearerToken;

        next();

    }else{
        //Forbidden  (can send 403 status)
        res.sendStatus(403);
        // res.json({message:"Forbidden"})
    }
    
}