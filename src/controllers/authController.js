const crypto = require("crypto");
const CustomError = require("../errors");
const User = require("../models/User");
const {
  attachCookiesToResponse,
  createTokenUser,
  checkPermissions,
  sendVerificationEmail,
  sendResetPasswordEmail,
  createHash,
} = require("../utils");
const Token = require("../models/Token");
const { StatusCodes } = require("http-status-codes");
const { registerValidator, loginValidator } = require("../validator/validate");

const register = async (req, res) => {
  const { email, password, name, address } = req.body;
  const { error } = registerValidator(req.body);

  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: error.details.map((details) => details.message),
    });
  }

  const alreadyHasAccount = await User.findOne({ email });
  if (alreadyHasAccount) {
    throw new CustomError.BadRequestError(
      "You already have an account here, try logging in."
    );
  }

  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? "admin" : "user";
  const verificationToken = crypto.randomBytes(40).toString("hex");

  const user = await User.create({
    name,
    email,
    role,
    geoAddress: { address },
    password,
    verificationToken,
  });

  // don’t await here – send async
  sendVerificationEmail({
    name: user.name,
    email: user.email,
    verificationToken: user.verificationToken,
    origin: "http://localhost:3000",
  }).catch((err) => console.error("Email send failed:", err.message));

  res.status(StatusCodes.CREATED).json({
    msg: "Account created. Check your email for a verification code.",
  });
};

const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new CustomError.NotFoundError("No account found with that email.");
  }

  if (user.isVerified) {
    throw new CustomError.BadRequestError("Account already verified.");
  }

  // generate a new token
  user.verificationToken = crypto.randomBytes(40).toString("hex");
  await user.save();

  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    verificationToken: user.verificationToken,
    origin: "http://localhost:3000",
  });

  res.status(StatusCodes.OK).json({
    msg: "Verification email resent successfully.",
  });
};

const verifyEmail = async (req, res) => {
  const { token, email } = req.query; // 👈 read from query instead of body

  if (!token || !email) {
    throw new CustomError.BadRequestError("Invalid verification link");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new CustomError.NotFoundError("User not found");
  }

  if (user.isVerified) {
    return res
      .status(StatusCodes.OK)
      .json({ msg: "Account already verified." });
  }

  if (user.verificationToken !== token) {
    throw new CustomError.UnauthenticatedError("Invalid or expired token");
  }

  user.isVerified = true;
  user.verificationToken = "";
  user.verified = Date.now();
  await user.save();

  res.status(StatusCodes.OK).json({ msg: "✅ Email successfully verified" });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const { error, value } = loginValidator(req.body);
  if (error) {
    console.log(error);
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: error.details.map((details) => details.message) });
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new CustomError.UnauthenticatedError("invalid credentials");
  }

  if (user.status == "banned") {
    throw new CustomError.UnauthenticatedError(
      "user has been banned contact support for futher complaints"
    );
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError("invalid credentials");
  }

  if (!user.isVerified) {
    throw new CustomError.UnauthenticatedError("Account not verified");
  }

  const tokenUser = createTokenUser(user);

  let refreshToken = "";

  const existingToken = await Token.findOne({ user: user._id });
  if (existingToken) {
    const { isValid } = existingToken;

    if (!isValid) {
      throw new CustomError.UnauthenticatedError("invalid credentials");
    }

    refreshToken = existingToken.refreshToken;

    attachCookiesToResponse({ res, user: tokenUser, refreshToken });

    res.status(StatusCodes.OK).json({ tokenUser });
    return;
  }
  refreshToken = crypto.randomBytes(40).toString("hex");

  const userAgent = req.headers["user-agent"];

  const ip = req.ip;

  const userToken = { refreshToken, userAgent, ip, user: user._id };

  await Token.create(userToken);

  attachCookiesToResponse({ res, user: tokenUser, refreshToken });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};

const logout = async (req, res) => {
  await Token.findOneAndDelete({ user: req.user.userId });

  res.cookie("accessToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.cookie("refreshToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ msg: "user logged out " });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new CustomError.BadRequestError(
      "must provide all the required vlues"
    );
  }
  const user = await User.findOne({ email });
  if (user) {
    const passwordToken = crypto.randomBytes(70).toString("hex");
    const origin = "http://localhost:3000";

    await sendResetPasswordEmail({
      name: user.name,
      email: user.email,
      token: passwordToken,
      origin,
    });
    const tenMinutes = 1000 * 60 * 10;
    const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);
    user.passwordToken = createHash(passwordToken);
    user.passwordTokenExpirationDate = passwordTokenExpirationDate;
    await user.save();
  }

  res
    .status(StatusCodes.OK)
    .json({ msg: "please check your email for reset password link" });
};

const resetPassword = async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    throw new CustomError.BadRequestError("provide all the values");
  }
  const user = await User.findOne({ email });
  if (user) {
    const currentDate = new Date();
    if (
      user.passwordToken === createHash(token) &&
      user.passwordTokenExpirationDate > currentDate
    ) {
      user.password = password;
      user.passwordToken = null;
      user.passwordTokenExpirationDate = null;
      await user.save();
    }
  }
  res.status(StatusCodes.OK).json({ msg: "password successfully reset" });
};

module.exports = {
  register,
  verifyEmail,
  login,
  logout,
  forgotPassword,
  resetPassword,
  resendVerificationEmail
};
