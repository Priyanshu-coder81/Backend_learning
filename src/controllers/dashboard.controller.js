import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscriptions.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  /* 
Total Subscribers

Total Videos

Total Views

Average Views per Video
→ (Total Views / Total Videos)

Total Likes
→ Sum of likes across all videos.

Total Comments
→ Count of all comments made on the channel’s videos.

Most Viewed Video */

  const data = [];

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscriber",
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videoDetails",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "likedBy",
        as: "likeDetails",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "owner",
        as: "commentDetails",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscriber",
        },
        totalVideos: {
          $size: "$videoDetails",
        },
        totalLikes: {
          $size: "$likeDetails",
        },
        totalComments: {
          $size: "$commentDetails",
        },
        totalViews: {
          $sum: "$videoDetails.views",
        },
        AverageViewsPerVideo: {
          $cond: {
            if: {
              $eq: ["$totalVideos", 0],
            },
            then: 0,
            else: {
              $divide: ["$totalViews", "$totalVideos"],
            },
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        email: 1,
        coverImage: 1,
        subscriberCount: 1,
        totalVideos: 1,
        totalComments: 1,
        totalLikes: 1,
        totalViews: 1,
        AverageViewsPerVideo: 1,
      },
    },
  ]);

  if (!user) {
    throw new ApiError(400, "Error while fetching from database");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Dashbord fetched Successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel

  const video = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
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
      $unwind: {
        path: "$ownerDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  let message = "Channel Videos fetched successfully";

  if (!video) {
    message = "No Video found";
  }

  return res.status(200).json(new ApiResponse(200, video, message));
});

export { getChannelStats, getChannelVideos };
