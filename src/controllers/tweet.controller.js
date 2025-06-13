import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Tweet field cannot be empty");
  }
  const tweet = await Tweet.create({
    owner: req.user?._id,
    content: content,
  });

  if (!tweet) {
    throw new ApiError(400, "Entry while creating in database");
  }

  res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created Successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User Id");
  }

  const tweet = await Tweet.find({
    owner: userId,
  });

  let responseMessage = "Tweets fetched Successfully";

  if (tweet.length === 0) {
    responseMessage = "No Tweets found";
  }
  return res.status(200).json(new ApiResponse(200, tweet, responseMessage));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { updatedContent } = req.body;

  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Tweet Id");
  }

  if (!updatedContent) {
    throw new ApiError(400, "Tweet field cannot be empty");
  }

  const tweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: updatedContent,
      },
    },
    {
      new: true,
    }
  );

  if (!tweet) {
    throw new ApiError(400, "No tweet found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet Updated Successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Tweet Id");
  }

  const tweet = await Tweet.findByIdAndDelete(tweetId, {
    new: true,
  });

  if (!tweet) {
    throw new ApiError(400, "Error while deleting from database");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, [], "Tweet Deleted Successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
