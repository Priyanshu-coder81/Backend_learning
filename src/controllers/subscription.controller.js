import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  // 1. check in subscriber if the channel Id is present or not
  // 2. If its not present add it.
  // 3. If its present then delete the entry.

  const isExist = Subscription.findOneAndDelete({
    channel: channelId,
    subscriber: req.user?._id,
  });

  let responseMessage = "Channel Unsubscribed Successfully";
  let subscription = null;

  if (!isExist) {
    subscription = await Subscription.create({
      channel: channelId,
      subscriber: req.user?._id,
    });

    if (!subscription) {
      throw new ApiError(400, "Error while creating Schema in Subscription");
    }

    responseMessage = "Channel Subscribed Successfully";
  }

  return res
    .status(200)
    .json(new ApiResponse(200, subscription, responseMessage));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }

  // 1. Aggregate pipeline to connect user to get details of subscribers

  const subscriptionAggregate = await Subscription.aggregate([
    {
      $match: {
        channel: channelId,
      },
    },
    {
      $lookup: {
        from: "users",
        localfield: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipleline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: true,
    },
  ]);

  if (!subscriptionAggregate) {
    throw new ApiError(400, "No Channel Id Exists");
  }

  return res
    .statu(200)
    .json(
      new ApiResponse(
        200,
        subscriptionAggregate,
        "Subscriber Details fetched Successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (isValidObjectId(subscriberId)) {
    throw new ApiResponse(400, "Subscriber Id is invalid");
  }

  const subscriptionAggregate = await Subscription.aggregate([
    {
      $match: {
        subscriber: subscriberId,
      },
    },
    {
      $lookup: {
        from: "users",
        localfield: "channel",
        foreignField: "_id",
        as: "channel",
        pipleline: [
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
        path: true,
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  if (!subscriptionAggregate) {
    throw new ApiError(400, "No Subscriber Id Exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptionAggregate,
        "Subscribed Channels detail fetched Successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
