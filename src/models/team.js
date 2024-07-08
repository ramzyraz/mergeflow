import mongoose from "mongoose";
import Document from "./document.js";
import Member from "./member.js";
import Group from "./group.js";

const Schema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      unique: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    ownerEmail: {
      type: String,
      required: true,
    },
    ownerRole: {
      type: String,
      required: true,
    },
    ownerType: {
      type: String,
      default: "admin",
    },
    shared: [
      {
        type: String,
      },
    ],
    docShared: [
      {
        email: { type: String },
        docId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
      },
    ],
    groups: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Group",
        },
      ],
      default: [],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
  },
  { timestamps: true },
);

// Define a pre hook to delete all members associated with the team before removing the team
Schema.pre("remove", async function (next) {
  try {
    // Get all member and document IDs associated with the team
    const memberIds = this.members;
    const groupIds = this.documents;
    const documentIds = this.documents;

    // Delete all members and documents associated with the team using Member.deleteMany
    await Document.deleteMany({ _id: { $in: documentIds } });
    await Member.deleteMany({ _id: { $in: memberIds } });
    await Group.deleteMany({ _id: { $in: groupIds } });

    // Continue with the removal of the team
    return next();
  } catch (error) {
    return next(error);
  }
});

export default mongoose.model("Team", Schema);
