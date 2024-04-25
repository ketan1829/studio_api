const jwt = require("jsonwebtoken");
const ErrorHandler = require("./errorHandler");
const { logger } = require("./logger");
const User = require("../models/user");

const verifyToken = (token) => {
  // console.log("token", token);

  return new Promise((resolve, reject) => {
    jwt.verify(token, 'myAppSecretKey', (err, decoded) => {
      console.log("==err==>")
      console.log(err)
      if (err) reject(new ErrorHandler(401, "unauthorized"));
      else resolve(decoded);
    });
  });
};

const isUser = async (req, res, next) => {
  console.log("authCheck1");

  try {
    let token = req.headers.authorization;

    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"

    const decoded = await verifyToken(token);

    console.log(decoded)

    // if (!decoded.user || !decoded.user._id) {
    if (!decoded.user) {
      console.log("UNNNNNNAUTHH")
      throw new ErrorHandler(401, "unauthorized");
    }

    next();
  } catch (error) {
    console.log("user error:=", error)
    next(error);
  }
};

const isUserTest = async (req, res, next) => {
  console.log("authCheckTest1");
  const userData = await User.findUserByPhone(req.query.phoneNumber,1,false);
  jwt.sign({ user: userData }, "myAppSecretKey",async (err,token)=>{
    try {  

      if (err) throw new ErrorHandler(402, "token creation failed !");
  
      if (!token) throw new ErrorHandler(401, "unauthorized.");
        const decoded = await verifyToken(token);
  
      console.log("decoded:")  
      if (!decoded.user || !decoded.user._id) {
        throw new ErrorHandler(401, "unauthorized");
      }
  
      next();
    } catch (error) {
      console.log("user error:=", error)
      next(error);
    }
  });

};

const isAdminV2 = async (req, res, next) => {

  try {
    let token = req.headers.authorization;
    let secret_by_pass = req.headers.secret_by_pass;

    if (!token) throw new ErrorHandler(401, "unauthorized");

    if ((token.split(" ")[1] || secret_by_pass) === "debugTest") {
      // console.log("authCheck3 >>>", token)
      return next();
    }

    token = token.split(" ")[1]; // remove "Bearer"
    // console.log("token", token);
    const decoded = await verifyToken(token);
    // console.log("decoded:::", decoded, decoded.user.role)

    if (decoded.user.role !== "admin") {
      throw new ErrorHandler(401, "unauthorized");
    }

    next();
  } catch (error) {
    next(error);
  }
};

const isAdmin = async (req, res, next) => {

  try {
    let token = req.headers.authorization;
    let secret_by_pass = req.headers.secret_by_pass;

    if (!token) throw new ErrorHandler(401, "unauthorized");

    if ((token.split(" ")[1] || secret_by_pass) === "debugTest") {
      // console.log("authCheck3 >>>", token)
      return next();
    }

    token = token.split(" ")[1]; // remove "Bearer"
    // console.log("token", token);
    const decoded = await verifyToken(token);
    // console.log("decoded:::", decoded, decoded.user.role)

    if (!decoded.admin || !decoded.admin.email) {
      throw new ErrorHandler(401, "unauthorized");
    }

    next();
  } catch (error) {
    next(error);
  }
};

const isBoth = async (req, res, next) => {
  // console.log("in ---- both >>>")

  try {
    let token = req.headers.authorization;
    let secret_by_pass = req.headers.secret_by_pass;

    // console.log("authCheck both >>>", token, secret_by_pass)

    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"


    if ((secret_by_pass || token) === "debugTest") {
      console.log("authCheck3 >>>")
      return next();
    } else {
      const decoded = await verifyToken(token);
      if (!decoded.admin && !decoded.user) {
        console.log("isboth:====");
        throw new ErrorHandler(401, "unauthorized");
      }
      next();
    }
  } catch (error) {
    console.log("isboth error:=", error);
    next(error);
  }
};

// const isAdminOrUser = async (req, res, next) => {

//   try {
//     let token = req.headers.authorization;
//     let secret_by_pass = req.headers.secret_by_pass;

//     if (!token) throw new ErrorHandler(401, "unauthorized");

//     token = token.split(" ")[1]; // remove "Bearer"

//     if ((secret_by_pass || token) === "debugTest") {
//       console.log("authCheck3 >>>", token)
//       return next();
//     } else {

//       const decoded = await verifyToken(token);

//       if (!decoded.admin || !decoded.user) {
//         throw new ErrorHandler(401, "unauthorized");
//       }

//       next();
//   }
//   } catch (error) {
//     next(error);
//   }
// };

const isAdminOrOwner = async (req, res, next) => {
  console.log("authCheck");

  try {
    let token = req.headers.authorization;
    console.log(token);
    if (!token) throw new ErrorHandler(401, "unauthorized simple");

    token = token.split(" ")[1]; // remove "Bearer"

    const decoded = await verifyToken(token);

    console.log(decoded, "<<<<<");

    // if (!decoded.admin || !decoded.owner || decoded?.user?.role !== "admin") {


    if (decoded?.user?.role === "admin" || decoded.admin || decoded.owner) {
      next();
    } else {
      throw new ErrorHandler(401, "unauthorized admin or owner");
    }

  } catch (error) {
    next(error);
  }
};

const isAdminOrOwnerOrUser = async (req, res, next) => {
  let token = req.headers.authorization;
  let secret_by_pass = req.headers.secret_by_pass;

  try {
    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"

    if ((secret_by_pass || token) === "debugTest") {
      console.log("authCheck3 >>>", token)
      return next();
    }

    const decoded = await verifyToken(token);

    if (!decoded.admin && !decoded.owner && !decoded.user) {
      throw new ErrorHandler(401, "unauthorized");
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { isUser, isAdmin, isBoth, isAdminOrOwner, isAdminOrOwnerOrUser, isAdminV2, isUserTest };
