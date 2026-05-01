


const { resendVerificationEmail } = require('../authController');
const crypto = require("crypto");
const CustomError = require("../../errors");
const User = require("../../models/User");
const {
  sendVerificationEmail,
} = require("../../utils");
const { StatusCodes } = require("http-status-codes");
const { registerValidator, loginValidator } = require("../../validator/validate");


// Import necessary modules and dependencies
// Mock dependencies
jest.mock("crypto");
jest.mock("../../models/User");
jest.mock("../../utils/sendVerificationEmail");

describe('resendVerificationEmail() resendVerificationEmail method', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        email: 'test@example.com',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('Happy paths', () => {
    it('should resend verification email successfully for an unverified user', async () => {
      // Arrange
      const user = {
        name: 'Test User',
        email: 'test@example.com',
        isVerified: false,
        save: jest.fn(),
      };
      User.findOne.mockResolvedValue(user);
      crypto.randomBytes.mockReturnValue(Buffer.from('randomtoken'));
      sendVerificationEmail.mockResolvedValue();

      // Act
      await resendVerificationEmail(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(user.verificationToken).toBe('randomtoken');
      expect(user.save).toHaveBeenCalled();
      expect(sendVerificationEmail).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        verificationToken: 'randomtoken',
        origin: 'http://localhost:3000',
      });
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith({
        msg: 'Verification email resent successfully.',
      });
    });
  });

  describe('Edge cases', () => {
    it('should throw NotFoundError if no user is found with the given email', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(resendVerificationEmail(req, res)).rejects.toThrow(
        new CustomError.NotFoundError('No account found with that email.')
      );
    });

    it('should throw BadRequestError if the user is already verified', async () => {
      // Arrange
      const user = {
        isVerified: true,
      };
      User.findOne.mockResolvedValue(user);

      // Act & Assert
      await expect(resendVerificationEmail(req, res)).rejects.toThrow(
        new CustomError.BadRequestError('Account already verified.')
      );
    });
  });
});