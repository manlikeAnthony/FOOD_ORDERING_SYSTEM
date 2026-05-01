


const { getAllProducts } = require('../productController');
const Product = require("../../models/Product");
const response = require("../../responses/response");
const { StatusCodes } = require("http-status-codes");
const { productValidator } = require("../../validator/validate");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");


// Import necessary modules and dependencies
// Mock dependencies
jest.mock("../../models/Product");
jest.mock("@aws-sdk/s3-request-presigner");
jest.mock("../../responses/response");

describe('getAllProducts() getAllProducts method', () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('Happy paths', () => {
    it('should return a list of products with signed URLs for images', async () => {
      // Arrange: Set up mock data and behavior
      const mockProducts = [
        {
          _id: 'product1',
          vendor: { name: 'Vendor1', description: 'Description1' },
          image: ['imageKey1', 'imageKey2'],
        },
      ];
      Product.find.mockResolvedValue(mockProducts);
      getSignedUrl.mockResolvedValueOnce('signedUrl1').mockResolvedValueOnce('signedUrl2');
      response.mockImplementation((data) => data);

      // Act: Call the function
      await getAllProducts(req, res);

      // Assert: Verify the expected behavior
      expect(Product.find).toHaveBeenCalledWith({});
      expect(getSignedUrl).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          count: 1,
          products: [
            {
              _id: 'product1',
              vendor: { name: 'Vendor1', description: 'Description1' },
              image: ['signedUrl1', 'signedUrl2'],
            },
          ],
        },
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle no products found', async () => {
      // Arrange: Set up mock data and behavior
      Product.find.mockResolvedValue([]);
      response.mockImplementation((data) => data);

      // Act: Call the function
      await getAllProducts(req, res);

      // Assert: Verify the expected behavior
      expect(Product.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          count: 0,
          products: [],
        },
      });
    });

    it('should handle errors during product retrieval', async () => {
      // Arrange: Set up mock data and behavior
      const errorMessage = 'Database error';
      Product.find.mockRejectedValue(new Error(errorMessage));
      response.mockImplementation((data) => data);

      // Act: Call the function
      await getAllProducts(req, res);

      // Assert: Verify the expected behavior
      expect(Product.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({ msg: errorMessage });
    });

    it('should handle errors during signed URL generation', async () => {
      // Arrange: Set up mock data and behavior
      const mockProducts = [
        {
          _id: 'product1',
          vendor: { name: 'Vendor1', description: 'Description1' },
          image: ['imageKey1'],
        },
      ];
      const errorMessage = 'S3 error';
      Product.find.mockResolvedValue(mockProducts);
      getSignedUrl.mockRejectedValue(new Error(errorMessage));
      response.mockImplementation((data) => data);

      // Act: Call the function
      await getAllProducts(req, res);

      // Assert: Verify the expected behavior
      expect(Product.find).toHaveBeenCalledWith({});
      expect(getSignedUrl).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({ msg: errorMessage });
    });
  });
});