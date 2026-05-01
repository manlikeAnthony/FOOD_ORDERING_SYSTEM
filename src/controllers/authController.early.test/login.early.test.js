


const { login } = require('../authController');
const crypto = require("crypto");
const CustomError = require("../../errors");
const User = require("../../models/User");
const {
  attachCookiesToResponse,
  createTokenUser,
} = require("../../utils");
const Token = require("../../models/Token");
const { StatusCodes } = require("http-status-codes");
const { loginValidator } = require("../../validator/validate");
jest.mock("crypto");
jest.mock("../../models/User");
jest.mock("../../utils");
jest.mock("../../models/Token");
jest.mock("../../validator/validate");

describe('login() login method', () => {
  let req, res, user, tokenUser, existingToken;

  beforeEach(() => {
    req = {
      body: { email: 'test@example.com', password: 'password123' },
      headers: { 'user-agent': 'Mozilla/5.0' },
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    user = {
      _id: 'userId',
      email: 'test@example.com',
      comparePassword: jest.fn(),
      isVerified: true,
      status: 'active',
    };
    tokenUser = { name: 'Test User', userId: 'userId', role: 'user' };
    existingToken = { isValid: true, refreshToken: 'existingRefreshToken' };
  });

  describe('Happy paths', () => {
    it('should log in a user with valid credentials and existing token', async () => {
      // Arrange
      loginValidator.mockReturnValue({ error: null });
      User.findOne.mockResolvedValue(user);
      user.comparePassword.mockResolvedValue(true);
      createTokenUser.mockReturnValue(tokenUser);
      Token.fnindOe.mockResolvedValue(existingToken);

      // Act
      await login(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith({ tokenUser });
      expect(attachCookiesToResponse).toHaveBeenCalledWith({
        res,
        user: tokenUser,
        refreshToken: 'existingRefreshToken',
      });
    });

    it('should log in a user with valid credentials and no existing token', async () => {
      // Arrange
      loginValidator.mockReturnValue({ error: null });
      User.findOne.mockResolvedValue(user);
      user.comparePassword.mockResolvedValue(true);
      createTokenUser.mockReturnValue(tokenUser);
      Token.findOne.mockResolvedValue(null);
      crypto.randomBytes.mockReturnValue(Buffer.from('newRefreshToken'));

      // Act
      await login(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith({ user: tokenUser });
      expect(attachCookiesToResponse).toHaveBeenCalledWith({
        res,
        user: tokenUser,
        refreshToken: 'newRefreshToken',
      });
      expect(Token.create).toHaveBeenCalledWith({
        refreshToken: 'newRefreshToken',
        userAgent: 'Mozilla/5.0',
        ip: '127.0.0.1',
        user: 'userId',
      });
    });
  });

  describe('Edge cases', () => {
    it('should return a 400 error if validation fails', async () => {
      // Arrange
      loginValidator.mockReturnValue({ error: { details: [{ message: 'Invalid input' }] } });

      // Act
      await login(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({ msg: ['Invalid input'] });
    });

    it('should throw an error if user is not found', async () => {
      // Arrange
      loginValidator.mockReturnValue({ error: null });
      User.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(login(req, res)).rejects.toThrow(CustomError.UnauthenticatedError);
    });

    it('should throw an error if user is banned', async () => {
      // Arrange
      loginValidator.mockReturnValue({ error: null });
      user.status = 'banned';
      User.findOne.mockResolvedValue(user);

      // Act & Assert
      await expect(login(req, res)).rejects.toThrow(CustomError.UnauthenticatedError);
    });

    it('should throw an error if password is incorrect', async () => {
      // Arrange
      loginValidator.mockReturnValue({ error: null });
      User.findOne.mockResolvedValue(user);
      user.comparePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(login(req, res)).rejects.toThrow(CustomError.UnauthenticatedError);
    });

    it('should throw an error if account is not verified', async () => {
      // Arrange
      loginValidator.mockReturnValue({ error: null });
      user.isVerified = false;
      User.findOne.mockResolvedValue(user);
      user.comparePassword.mockResolvedValue(true);

      // Act & Assert
      await expect(login(req, res)).rejects.toThrow(CustomError.UnauthenticatedError);
    });

    it('should throw an error if existing token is invalid', async () => {
      // Arrange
      loginValidator.mockReturnValue({ error: null });
      User.findOne.mockResolvedValue(user);
      user.comparePassword.mockResolvedValue(true);
      createTokenUser.mockReturnValue(tokenUser);
      existingToken.isValid = false;
      Token.findOne.mockResolvedValue(existingToken);

      // Act & Assert
      await expect(login(req, res)).rejects.toThrow(CustomError.UnauthenticatedError);
    });
  });
});