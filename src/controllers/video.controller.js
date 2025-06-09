import mongoose, { isValidObjectId, Schema } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { getPublicIdFromUrl } from "./user.controller.js";
import { deleteFromCloudinary } from "../utils/removeFile.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const sortOrder = sortType === "asc" ? 1 : -1;

  // Validate sortBy field
  const allowedSortFields = ["createdAt", "title", "views", "duration"];
  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const pipeline = [];

  if (query) {
    pipeline.push({
      $match: {
        $or: [
          {
            title: {
              $regex: query,
              $options: "i",
            },
          },
          {
            description: {
              $regex: query,
              $options: "i",
            },
          },
        ],
      },
    });
  }

  if (userId) {
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  const videoAggregate = Video.aggregate([
    ...pipeline,
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
        path: "$owner",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: {
        [finalSortBy]: sortOrder,
      },
    },
  ]);

  const options = {
    page: pageNumber,
    limit: limitNumber,
  };

  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  // 1. Verify if title & description is present or not
  // 2. Take Video and Thumbnail from req.file
  // 3. Check if exists or not
  // 4. If exists --> Upload to cloudinary  and get url
  // 5. Check if uploaded properly in cloudinary
  // 6. If all the things are right - Create a videoschema is mongodb and add the entry in database.

  if (!title) {
    throw new ApiError(402, "Title is required");
  }

  if (!description) {
    throw new ApiError(402, "Description is required");
  }

  const videoLocalFilePath = req.files?.videoFile[0].path;

  if (!videoLocalFilePath) {
    throw new ApiError(400, "Video File is unable to upload, Retry");
  }

  const thumbnailLocalFilePath = req.files?.thumbnail[0].path;

  if (!thumbnailLocalFilePath) {
    throw new ApiError(400, "Thumbnail is unable to upload, Retry");
  }

  const videoFile = await uploadOnCloudinary(videoLocalFilePath);

  const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);

  if (!videoFile) {
    throw new ApiError(400, "Video File is required");
  }

  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const duration = videoFile.duration;

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Upload Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const getVideo = await Video.findById(videoId);

  if (!getVideo) {
    throw new ApiError("Invalid Video Id");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, getVideo, "Video fetched Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail

  // 1. Check for VideoId is correct or not by a data query
  // 2. Check if title / description / thumbnail is send or not
  // 3. if anyone of them is not send throw an error
  // 4. if title / description is there , simply replace
  // 5. if thumbanil is there - uplad to cloudinary
  // 6. check if upload to cloudinary or not
  // 7. if yes then delete the previous thumnail
  // 8. Return the response with updated thumbnail url.

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const getVideo = await Video.findById(videoId);

  if (!getVideo) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const { title, description } = req.body;

  const thumbnailLocalFilePath = req.files?.thumbnail[0]?.path;

  if (!title && !description && !thumbnailLocalFilePath) {
    throw new ApiError(400, "Atleast one field is required");
  }

  const updatedData = {};

  const thumbnailToBeDeleted = getVideo.thumbnail;

  if (title) updatedData.title = title;
  if (description) updatedData.description = description;

  let video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updatedData,
    },
    { new: true }
  );

  if (thumbnailLocalFilePath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);

    if (!thumbnail) {
      throw new ApiError(400, "Thumbnail Uploading failed");
    }

    video = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          thumbnail: thumbnail.url,
        },
      },
      {
        new: true,
      }
    );

    const publicId = getPublicIdFromUrl(thumbnailToBeDeleted);

    if (publicId) {
      const response = await deleteFromCloudinary(publicId);
      if (!response) {
        console.log("Failed to delete from cloudinary");
      }
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Update details Successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  //TODO : DELETE THUMBNAIL , TITLE , DESCRIPTION.
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const getVideo = await Video.findById(videoId);

  if (!getVideo) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const videoToBeDeleted = getVideo.videoFile;

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      videoFile: null,
    },
    {
      new: true,
    }
  );

  if (!video) {
    const publicId = getPublicIdFromUrl(videoToBeDeleted);
    if (publicId) {
      const response = await deleteFromCloudinary(publicId);
      if (!response) {
        console.log("Failed to delete from cloudinary");
      }
    }
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Deleted Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      isPublished: !video.isPublished,
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Toggled successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
