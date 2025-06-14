import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  //TODO: create playlist

  if (!name) {
    throw new ApiError(400, "Name is required");
  }

  const playlist = await Playlist.create({
    name: name,
    description: description ? description : "",
    video: [],
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(400, "Error while creating entry in database");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created Successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User Id");
  }
  let playlist = await Playlist.find({
    owner: userId,
  });

  let message = "Playlist fetched Successfully";

  if (!playlist) {
    message = "No Playlist exists";
  }

  return res.status(200).json(new ApiResponse(200, playlist, message));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist Id");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "videoOwner",
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
              path: "$videoOwner",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "playlistOwner",
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
        path: "$playlistOwner",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(400, "No such Playlist exists");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched Successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist Id");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        video: videoId,
      },
    },
    {
      new: true,
    }
  );
  if (!playlist) {
    throw new ApiError(400, "No such Playlist exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to Plalist Successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist Id");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }

  let playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "No such Playlist exists");
  }

  let response = "Video Removed from Playlist successfully";
  let updatedPlaylist;
  if (playlist.video.includes(videoId)) {
    updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $pull: {
          video: videoId,
        },
      },
      {
        new: true,
      }
    );
  } else {
    response = "Video is not in the playlist";
  }

  return res.status(200).json(new ApiResponse(200, updatedPlaylist, response));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist\
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist Id");
  }

  const playlist = await Playlist.findByIdAndDelete(playlistId, { new: true });

  if (!playlist) {
    throw new ApiError(400, "No such Playlist exists");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, [], "Playlist deleted Successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist Id");
  }

  if (!name && !description) {
    throw new ApiError(400, "Atleast one field is required");
  }
  const updatedContent = {};

  if (name) updatedContent.name = name;
  if (description) updatedContent.description = description;

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: updatedContent,
    },
    {
      new: true,
    }
  );

  if (!playlist) {
    throw new ApiError(400, "No such Playlist exists");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist Updated Successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
