const { isTokenValid, attachCookiesToResponse } = require("../utils");
const Token = require("../models/Token");
const CustomError = require("../errors");

const authenticateUser = async (req, res, next) => {
  const { accessToken, refreshToken } = req.signedCookies;
  try {
    if(accessToken){
        const payload =  isTokenValid(accessToken);
        req.user = payload.user;
        return next()
    }
    const payload = isTokenValid(refreshToken)
    const existingToken = await Token.findOne({
        user : payload.user.userId,
        refreshToken : payload.refreshToken
    })

    if(!existingToken || !existingToken?.isValid){
        throw new CustomError.UnauthenticatedError('Authentication invalid')
    }
    attachCookiesToResponse({
        res,
        user : payload.user,
        refreshToken: existingToken.refreshToken
    })
    req.user = payload.user;
    next()
} catch (error) {
    throw new CustomError.UnauthenticatedError('Authentication invalid')
}
};

const authorizeRoles= (...roles)=>{
   return (req,res,next)=>{
    if(!roles.includes(req.user.role)){
        throw new CustomError.UnauthorizedError("Access Denied")
    }
    next()
   }
}
module.exports = { authenticateUser, authorizeRoles };