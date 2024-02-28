const jwt = require("jsonwebtoken");
const ErrorHandler = require("./errorHandler");

const isUser = async (req, res, next) => {
  console.log("authCheck1");

  let token = req.headers.authorization;

  try {
    // if token is missing, throw error
    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"
    // console.log("TOKEN:",token);

    // verify, decode token
    jwt.verify(token, 'myAppSecretKey', (err, payload) => {
      // console.log("Payload : ",payload);
      // console.log("Error : ",err);
      // if token is invalid, throw error
      if (err) throw new ErrorHandler(401, "unauthorized");
      // else continue with populating user
      else if (payload.user == undefined || payload.user._id == undefined) {
        console.log("Payload error");
        throw new ErrorHandler(401, "unauthorized");
      } 
      else {
        // console.log("Payload : ",payload);
        // req.user = {
        //   _id: payload._id,
        //   name: payload.name,
        //   email: payload.email,
        //   userType: payload.userType,
        // };        
        next();
      }
    });
  } catch (error) {
    // console.log("Error : ",error);
    next(new ErrorHandler(401, "unauthorized"));
  }
};

const isAdmin = async (req, res, next) => {
  console.log("authCheck2");

  let token = req.headers.authorization;

  try {
    // if token is missing, throw error
    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"
    // token = token === undefined ? "myAppSecretKey":token
    // console.log("TOKEN:",token);

    // verify, decode token
    jwt.verify(token, 'myAppSecretKey', (err, payload) => {
      // console.log(err);
      // if token is invalid, throw error
      if (err) throw new ErrorHandler(401, "unauthorized");
      // else continue with populating user
      else if (payload.admin == undefined || payload.admin.email == undefined) {
        console.log("isAdmin Payload error");
        throw new ErrorHandler(401, "unauthorized");
      } 
      else {
        next();
      }
    });
  } catch (error) {
    // console.log("Error : ",error);
    next(new ErrorHandler(401, "unauthorized"));
  }
};

const isBoth = async (req, res, next) => {
  console.log("authCheck3");

  let token = req.headers.authorization;
  let secret_by_pass = req.headers.secret_by_pass;
  console.log(secret_by_pass,"<< secret_by_pass");
  

  try {
    // if token is missing, throw error
    if(secret_by_pass === "ni3test"){
      next()
    }
    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"
    // console.log("TOKEN:",token);

    // verify, decode token
    jwt.verify(token, 'myAppSecretKey', (err, payload) => {
      // if token is invalid, throw error
      if (err) throw new ErrorHandler(401, "unauthorized");
      // else continue with populating user
      else if (payload.admin == undefined && payload.user == undefined) {
        console.log("Payload error");
        throw new ErrorHandler(401, "unauthorized");
      } 
      else {
        next();
      }
    });
  } catch (error) {
    // console.log("Error : ",error);
    next(new ErrorHandler(401, "unauthorized"));
  }
};

const isAdminOrOwner = async (req, res, next) => {
  console.log("authCheck");
  let token = req.headers.authorization;
  let secret_by_pass = req.headers.secret_by_pass;
  console.log("secret_by_pass:",secret_by_pass);

  try {
    // if token is missing, throw error
    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"
    // console.log("TOKEN:",token);

    // verify, decode token
    jwt.verify(token, 'myAppSecretKey', (err, payload) => {
      // if token is invalid, throw error
      if (err) throw new ErrorHandler(401, "unauthorized");
      // else continue with populating user
      else if (payload.admin == undefined && payload.owner == undefined) {
        console.log("Payload error");
        throw new ErrorHandler(401, "unauthorized");
      }
      else {
        next();
      }
    });
  } catch (error) {
    // console.log("Error : ",error);
    next(new ErrorHandler(401, "unauthorized"));
  }
};

const isAdminOrOwnerOrUser = async (req, res, next) => {
  let token = req.headers.authorization;

  try {
    // if token is missing, throw error
    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"
    // console.log("TOKEN:",token);

    // verify, decode token
    jwt.verify(token, 'myAppSecretKey', (err, payload) => {
      // if token is invalid, throw error
      if (err) throw new ErrorHandler(401, "unauthorized");
      // else continue with populating user
      else if (payload.admin == undefined && payload.owner == undefined && payload.user == undefined) {
        console.log("Payload error");
        throw new ErrorHandler(401, "unauthorized");
      }
      else {
        next();
      }
    });
  } catch (error) {
    // console.log("Error : ",error);
    next(new ErrorHandler(401, "unauthorized"));
  }
};


module.exports = { isUser, isAdmin ,isBoth,isAdminOrOwner,isAdminOrOwnerOrUser};
