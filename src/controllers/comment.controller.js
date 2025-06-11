import mongoose, { isValidObjectId, Schema } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  const commentAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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
            $project: {
              title: 1,
              description: 1,
              duration: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
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
      $unwind: "$owner",
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        "video.title": 1,
        "video.description": 1,
        "video.duration": 1,
        "owner.fullName": 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },
  ]);

  const options = {
    page: pageNumber,
    limit: limitNumber,
  };

  const comment = await Comment.aggregatePaginate(commentAggregate, options);

  if (!comment) {
    throw new ApiError(400, "Comments not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, comment, "Comments fetched Successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video

  // 1. Get comment content from req
  // 2. Add to comment schema

  const { content } = req.body;
  const {videoId} = req.params;

  if(!isValidObjectId(videoId)) {
    throw new ApiError(400,"VideoId is invalid");
  }


  if (!content) {
    throw new ApiError(400, "Content field is empty");
  }

  const comment = await Comment.create({
    content: content,
    owner : req.user?._id,
    video: videoId,
  });

  res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment Added Successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;

  const { newComment } = req.body;

  if (!newComment) {
    throw new ApiError(400, "Comment should not be empty");
  }

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: newComment,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated Successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  const comment = await Comment.findByIdAndDelete(
    commentId,
  );

  if (!comment) {
    throw new ApiError(400, "Invalid comment Id");
  }

  return res
    .status(200)
    .json(new ApiResponse(200,"Comment deleted Successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
