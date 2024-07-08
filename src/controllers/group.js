import Group from "../models/group.js";
import Team from "../models/team.js";
import Member from "../models/member.js";

export const createGroup = async (req, res) => {
  try {
    const { name, teamId, members } = req.body;
    if (!teamId || !name) {
      return res.status(400).json({ message: "Missing teamId and/or name." });
    }
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    // Update the existing groups to remove the members
    // Won't work if a member can be added to multiple groups
    // If we do add this functionality later on, we might need to update this
    await Group.updateMany(
      { members: { $in: members } },
      { $pull: { members: { $in: members } } },
    );
    // Remove members from their existing groups, if any
    await Member.updateMany(
      { _id: { $in: members }, groupId: { $exists: true } },
      { $unset: { groupId: 1 } },
    );

    const newGroup = await Group.create({
      name,
      teamId,
      members,
    });

    // Update the team to include the new group's _id
    team.groups.push(newGroup._id);
    await team.save();

    // Use push to update the groupId of the members in the new group
    await Member.updateMany(
      { _id: { $in: members } },
      { groupId: newGroup._id },
    );

    res
      .status(201)
      .json({ message: "A new group has been created", group: newGroup });
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "Failed to create a new group" });
  }
};

export const loadMany = async (req, res) => {
  try {
    const { teamId } = req.query;

    if (!teamId) {
      return res.status(400).json({ error: "Missing teamId parameter." });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const groups = await Group.find({ teamId }).populate(
      "members",
      "_id name email avatarUrl",
    );
    res.status(200).json(groups);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

export const loadOne = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { teamId } = req.query;

    if (!teamId) {
      return res.status(400).json({ error: "Missing teamId in the request" });
    }

    const group = await Group.findOne({ _id: groupId, teamId });

    if (!group) {
      return res
        .status(404)
        .json({
          error: "Group not found or does not belong to the specified team.",
        });
    }

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ error: "Failed to get group" });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { teamId } = req.query;
    const members = req.body.members;
    const updatedFields = req.body;

    if (!teamId) {
      return res.status(400).json({ error: "Missing teamId in the request" });
    }
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    // Update the existing groups to remove the members
    // Won't work if a member can be added to multiple groups
    // If we do add this functionality later on, we might need to update this
    await Group.updateMany(
      { members: { $in: members } },
      { $pull: { members: { $in: members } } },
    );
    // Remove members from their existing groups, if any
    await Member.updateMany(
      { _id: { $in: members }, groupId: { $exists: true } },
      { $unset: { groupId: 1 } },
    );

    // Update the group (changing their name or adding new members)
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupId, teamId },
      { ...updatedFields },
      { new: true },
    );

    if (!updatedGroup) {
      return res
        .status(400)
        .json({
          error: "Group not found or does not belong to the specified team.",
        });
    }

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Failed to update group" });
  }
};

export const removeFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { teamId, memberId } = req.body;

    if (!groupId) {
      return res
        .status(400)
        .json({ error: "Group ID is missing from the request." });
    }

    if (!teamId) {
      return res.status(400).json({ error: "Missing teamId in the request" });
    }
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    // Check if the group exists
    const group = await Group.findOne({ _id: groupId, teamId });
    if (!group) {
      return res.status(404).json({ error: "Group not found in this team." });
    }

    // Check if the member exists
    const member = await Member.findOne({ _id: memberId, teamId });
    if (!member) {
      return res.status(404).json({ error: "Member not found in this team." });
    }

    // Use the filter method to create a new array excluding the member with the given memberId
    group.members = group.members.filter((memId) => memId.equals(memberId));
    await group.save();

    res
      .status(200)
      .json({
        message: `Member with ${memberId} id has been removed from group`,
      });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Failed to remove member" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { teamId } = req.query;

    if (!groupId) {
      return res
        .status(400)
        .json({ error: "Group ID is missing from the request." });
    }

    if (!teamId) {
      return res.status(400).json({ error: "Missing teamId in the request" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const group = await Group.findOneAndDelete({ _id: groupId, teamId });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Remove the member from the teams
    await Team.findByIdAndUpdate(teamId, { $pull: { groups: groupId } });
    // Update all members' groupId to null
    await Member.updateMany({ groupId: groupId }, { $set: { groupId: null } });

    res
      .status(200)
      .json({
        message: `Group with ${groupId} id has been deleted successfully`,
      });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Failed to delete group" });
  }
};

export const deleteMultipleGroups = async (req, res) => {
  try {
    const { groupIds, teamId } = req.body;

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ error: "Invalid or empty groupIds array" });
    }

    if (!teamId) {
      return res.status(400).json({ error: "Missing teamId in the request" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const groups = await Group.deleteMany({ _id: { $in: groupIds }, teamId });
    // Remove the members from the team db as well.
    await Team.findByIdAndUpdate(teamId, {
      $pull: { groups: { $in: groupIds } },
    });
    // Update members' groupId to null for the deleted groupIds
    await Member.updateMany(
      { groupId: { $in: groupIds } },
      { $set: { groupId: null } },
    );

    res
      .status(200)
      .json({ message: `${groups.deletedCount} groups deleted successfully` });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Error deleting members" });
  }
};
