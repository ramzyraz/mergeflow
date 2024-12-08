import mongoose from "mongoose";
import Member from "./member.js";

const Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    totalFiles: {
      type: Number,
      default: 0,
    },
    isFavorited: {
      type: Boolean,
      default: false,
    },
    showFile: {
      type: Boolean,
      default: false,
    },
    url: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
      },
    ],
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    files: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document",
        },
      ],
      default: [],
    },
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    sharedWith: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
        permission: { type: String, enum: ["view", "edit"], default: "view" },
      },
    ],
  },
  { timestamps: true },
);

// Added a pre-remove hook to the Document schema
Schema.pre("remove", async function (next) {
  try {
    // Get the list of member IDs that the document is shared with
    const memberIds = this.sharedWith.map((entry) => entry.member);

    // Remove the document ID from the sharedDocuments field of all members
    await Member.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { sharedDocuments: this._id } },
    );

    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("Document", Schema);
