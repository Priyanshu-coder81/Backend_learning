import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Invalid Video ID");
  }

  // Check if like already exists
  const existingLike = await Like.findOneAndDelete({
    video: videoId,
    likedBy: req.user._id,
  });

  let responseMessage = "Video unliked successfully";
  let likeDoc = null;

  // If not exists, create one
  if (!existingLike) {
    likeDoc = await Like.create({
      likedBy: req.user._id,
      video: videoId,
    });

    if (!likeDoc) {
      throw new ApiError(500, "Error while liking the video");
    }

    responseMessage = "Video liked successfully";
  }

  return res
    .status(200)
    .json(new ApiResponse(200, likeDoc || {}, responseMessage));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  // 1. Check if commentId exists or not
  // 2. If exists, delete the schema
  // 3. if no exists, create the schema with comment Id.

  if (!isValidObjectId(commentId)) {
    throw new ApiResponse(401, "Invalid Comment Id");
  }

  const isExist = await Like.findOneAndDelete({
    likedBy: req.user?._id,
    comment: commentId,
  });

  let responseMessage = "Comment unliked Successfully";
  let like = null;

  if (!isExist) {
    like = await Like.create({
      likedBy: req.user?._id,
      comment: commentId,
    });

    if (!like) {
      throw new ApiError(400, "Error while creating in Like schema");
    }

    responseMessage = "Comment Liked Successfully";
  }

  return res
    .status(200)
    .json(new ApiResponse(200, like || [], responseMessage));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!isValidObjectId(tweetId)) {
    throw new ApiResponse(401, "Invalid Tweet Id");
  }
  const isExist = await Like.findOneAndDelete({
    likedBy: req.user?._id,
    tweet: tweetId,
  });

  let responseMessage = "Comment unliked Successfully";
  let like = null;

  if (!isExist) {
    like = await Like.create({
      likedBy: req.user?._id,
      tweet: tweetId,
    });

    if (!like) {
      throw new ApiError(400, "Error while creating in Like schema");
    }

    responseMessage = "Tweet Liked Successfully";
  }

  return res
    .status(200)
    .json(new ApiResponse(200, like || [], responseMessage));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  // 1. Match userId with like schema,
  // 2. aggregate pipline with

  const like = await Like.aggregate([
    {
      $match: {
        likedBy: req.user?._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              thumbnail: 1,
              title: 1,
              description: 1,
              owner: 1,
            },
          },
          {
            $unwind: "$owner",
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
  ]);

  if (!like) {
    throw new ApiError(400, "Something went wrong while aggregate pipelines");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, like, "Liked Videos feteched Successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
