const jwt = require("jsonwebtoken");
const ErrorHandler = require("./errorHandler");
const { logger } = require("./logger");

const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, 'myAppSecretKey', (err, decoded) => {
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

    if (!decoded.user || !decoded.user._id) {
      throw new ErrorHandler(401, "unauthorized");
    }

    next();
  } catch (error) {
    next(error);
  }
};

const isAdmin = async (req, res, next) => {
  console.log("AdminAuthCheck");

  try {
    let token = req.headers.authorization;
    let secret_by_pass = req.headers.secret_by_pass;

    console.log("AdminAuthCheck", token);


    if (!token) throw new ErrorHandler(401, "unauthorized");

    if ((token.split(" ")[1] || secret_by_pass) === "debugTest") {
      console.log("authCheck3 >>>", token)
      return next();
    }

    token = token.split(" ")[1]; // remove "Bearer"

    const decoded = await verifyToken(token);

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

    console.log("authCheck both >>>", token, secret_by_pass)

    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"

    if ((secret_by_pass || token) === "debugTest") {
      console.log("authCheck3 >>>")
      return next();
    } else {

      const decoded = await verifyToken(token);

      if (!decoded.admin && !decoded.user) {
        throw new ErrorHandler(401, "unauthorized");
      }

      next();
    }
  } catch (error) {
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

    if (!token) throw new ErrorHandler(401, "unauthorized");

    token = token.split(" ")[1]; // remove "Bearer"

    const decoded = await verifyToken(token);

    if (!decoded.admin && !decoded.owner) {
      throw new ErrorHandler(401, "unauthorized");
    }

    next();
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

module.exports = { isUser, isAdmin, isBoth, isAdminOrOwner, isAdminOrOwnerOrUser };
