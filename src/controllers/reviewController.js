const CustomError = require("../errors");
const Review = require("../models/Review");
const Product = require("../models/Product");
const { checkPermissions } = require("../utils");
const { StatusCodes } = require("http-status-codes");
const { reviewValidator } = require("../validator/validate");

const createReview = async (req, res) => {
  try {
    const { error, value } = reviewValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        response({
          msg: error.details.map((d) => d.message),
        })
      );
    }
    const { product: productId, rating, title, comment } = value;

    const isValidProduct = await Product.findOne({ _id: productId });
    if (!isValidProduct) {
      throw new CustomError.NotFoundError(
        `no product with id ${productId} found`
      );
    }

    const alreadySubmitted = await Review.findOne({
      product: productId,
      user: req.user.userId,
    });
    if (alreadySubmitted) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(response({ msg: "Already submitted a review for this product" }));
    }

    req.body.user = req.user.userId;
    const review = await Review.create(value);
    await review.save();

    res.status(StatusCodes.CREATED).json(response({ data: review }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getAllReviews = async (req, res) => {
  try {
    const review = await Review.find({})
      .populate({ path: "product", select: "vendor name price" })
      .populate({ path: "user", select: "name email" });

    res.status(StatusCodes.OK).json(response({ data: review }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getSingleReview = async (req, res) => {
  try {
    const { id: reviewId } = req.params;
    const review = await Review.findOne({ _id: reviewId })
      .populate({ path: "user", select: "name email" })
      .populate({ path: "product", select: "name company price" });

    if (!review) {
      throw new CustomError.NotFoundError(
        `No review with id ${reviewId} found`
      );
    }

    res.status(StatusCodes.OK).json(response({ data: review }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const updateReview = async (req, res) => {
  try {
    const {
      params: { id: reviewId },
      body: { title, comment, rating },
    } = req;

    const review = await Review.findOne({ _id: reviewId });
    if (!review) {
      throw new CustomError.NotFoundError(
        `No review with id ${reviewId} found`
      );
    }

    checkPermissions(req.user, review.user);

    review.title = title;
    review.comment = comment;
    review.rating = rating;

    await review.save();

    res.status(StatusCodes.OK).json(response({ data: review }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id: reviewId } = req.params;
    
    const review = await Review.findOne({ _id: reviewId });
    if (!review) {
      throw new CustomError.NotFoundError(
        `No review with id ${reviewId} found`
      );
    }

    checkPermissions(req.user, review.user);
    await review.deleteOne();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "Review successfully deleted" }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getSingleProductReviews = async (req, res) => {
  try {
    const { id: productId } = req.params;
    
    const reviews = await Review.find({ product: productId })
      .populate({ path: "user", select: "name email" })
      .populate({ path: "product", select: "name company price" });

    res
      .status(StatusCodes.OK)
      .json(response({ data: { reviews, count: reviews.length } }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};
module.exports = {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getSingleProductReviews,
};
