import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  // 1. Check if videoId exist in like schema or not
  // 2. If not exists create one with likedby field
  // 3. If exists delete from schema

  if (!videoId) {
    throw new ApiError(400, "Invaild Video Id");
  }

  const isExist = Like.findByIdAndDelete(videoId, {
    new: true,
  });

  let like;

  if (!isExist) {
    like = await Like.create({
      likedBy: req.user?._id,
      video: videoId,
    });
  }

  if (!like) {
    throw new ApiError(400, "Error while creating entry in database");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, like, "Toggle Video Like Successfully"));
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

  const isExist = Like.findByIdAndDelete(commentId, {
    new: true,
  });
  let like;
  if (!isExist) {
    like = await Like.create({
      likedBy: req.user?._id,
      comment: commentId,
    });
  }

  if (!like) {
    throw new ApiError(400, "Error while creating entry in database");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, like, "Toggled Comment like successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!isValidObjectId(tweetId)) {
    throw new ApiResponse(401, "Invalid Tweet Id");
  }

  const isExist = Like.findByIdAndDelete(tweetId, {
    new: true,
  });

  let like;
  if (!isExist) {
    like = await Like.create({
      likedBy: req.user?._id,
      tweet: tweetId,
    });
  }

  if (!like) {
    throw new ApiError(400, "Error while creating entry in database");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, like, "Toggled Tweet like successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  // 1. Match userId with comment schema,
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
        ],
      },
    },
    {
      $unwind: {
        path: true,
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  if(!like) {
    throw new ApiError(400,"Something went wrong while aggregate pipelines")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,like,"Liked Videos feteched Successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
