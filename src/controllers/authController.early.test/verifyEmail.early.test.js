


const { verifyEmail } = require('../authController');
const CustomError = require("../../errors");
const User = require("../../models/User");
const {
  attachCookiesToResponse,
  createTokenUser,
  checkPermissions,
  sendVerificationEmail,
  sendResetPasswordEmail,
  createHash,
} = require("../../utils");
const { StatusCodes } = require("http-status-codes");
const { registerValidator, loginValidator } = require("../../validator/validate");


// Import necessary modules and dependencies
// Mock dependencies
jest.mock("../../models/User");
jest.mock("../../errors");

describe('verifyEmail() verifyEmail method', () => {
  let req, res, user;

  beforeEach(() => {
    // Set up a mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Set up a mock user object
    user = {
      isVerified: false,
      verificationToken: 'validToken',
      save: jest.fn(),
    };

    // Mock User.findOne to return the mock user
    User.findOne = jest.fn().mockResolvedValue(user);
  });

  describe('Happy Paths', () => {
    it('should verify the email successfully when token and email are valid', async () => {
      // Arrange: Set up request with valid token and email
      req = {
        query: {
          token: 'validToken',
          email: 'test@example.com',
        },
      };

      // Act: Call the verifyEmail function
      await verifyEmail(req, res);

      // Assert: Check that the response is correct
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(user.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith({ msg: '✅ Email successfully verified' });
    });

    it('should return a message if the account is already verified', async () => {
      // Arrange: Set up request with already verified user
      user.isVerified = true;
      req = {
        query: {
          token: 'validToken',
          email: 'test@example.com',
        },
      };

      // Act: Call the verifyEmail function
      await verifyEmail(req, res);

      // Assert: Check that the response is correct
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith({ msg: 'Account already verified.' });
    });
  });

  describe('Edge Cases', () => {
    it('should throw an error if token or email is missing', async () => {
      // Arrange: Set up request with missing token
      req = {
        query: {
          email: 'test@example.com',
        },
      };

      // Act & Assert: Expect an error to be thrown
      await expect(verifyEmail(req, res)).rejects.toThrow(CustomError.BadRequestError);
    });

    it('should throw an error if user is not found', async () => {
      // Arrange: Set up request with non-existent user
      User.findOne = jest.fn().mockResolvedValue(null);
      req = {
        query: {
          token: 'validToken',
          email: 'nonexistent@example.com',
        },
      };

      // Act & Assert: Expect an error to be thrown
      await expect(verifyEmail(req, res)).rejects.toThrow(CustomError.NotFoundError);
    });

    it('should throw an error if the token is invalid', async () => {
      // Arrange: Set up request with invalid token
      req = {
        query: {
          token: 'invalidToken',
          email: 'test@example.com',
        },
      };

      // Act & Assert: Expect an error to be thrown
      await expect(verifyEmail(req, res)).rejects.toThrow(CustomError.UnauthenticatedError);
    });
  });
});