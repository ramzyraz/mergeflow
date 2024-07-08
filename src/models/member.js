import mongoose from "mongoose";
import { MEMBER_STATUS } from "../constants/member.js";

const Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: async function (email) {
          const user = await this.constructor.findOne({ email });
          if (user) {
            if (this.id === user.id) {
              return true;
            }
            return false;
          }
          return true;
        },
        message: () => "The specified email address is already in use.",
      },
    },
    uid: {
      type: String,
    },
    company: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    avatarUrl: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: MEMBER_STATUS,
      default: MEMBER_STATUS.ACTIVE,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    sharedDocuments: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document",
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Member", Schema);
