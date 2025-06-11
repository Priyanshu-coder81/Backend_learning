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

  const isExist = Subscription.find({
    $and: [
      {
        channel: channelId,
      },
      {
        subscriber: req.user?._id,
      },
    ],
  });

  try {
    let subscription;
    if (!isExist) {
        subscription = await Subscription.create({
        channel: channelId,
        subscriber: req.user?._id,
      });
    } else {
        subscription = await Subscription.findByIdAndDelete(
        {
          channel: channelId,
          subscriber: req.user?._id,
        },
        { new: true }
      );
    }
  } catch (error) {
    console.log("Failed to toggle Subscription");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscription, "Toggled Subscription Successfully")
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
