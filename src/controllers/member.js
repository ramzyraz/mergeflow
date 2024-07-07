import mongoose from 'mongoose';
import Member from '../models/member.js';
import Document from '../models/document.js';
import Group from '../models/group.js';
import Team from '../models/team.js';
import logger from '../utils/logger.js';
import { sendInviteEmail } from './invite.js';

export const createMember = async (req, res) => {
  try {
    const teamId = req.body.teamId;
    const invitationLink = req.body.invitationLink;
    const avatarUrlPreview = req.body.avatarUrl && req.body.avatarUrl?.preview || "";

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId in the request' });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    if (team && team.companyName !== req.body.company) {
      return res.status(400).json({ error: 'Company name should be the same as the team name.' });
    }

    const memberObject = new Member({
      ...req.body,
      avatarUrl: avatarUrlPreview,
    });
    const newMember  = await memberObject.save();

    // Update the team to include the new member's _id
    await Team.findByIdAndUpdate(teamId, { $push: { members: newMember._id } });

    // Send invite to member
    await sendInviteEmail(newMember.email, invitationLink);

    res.status(201).json({ message: 'A new member has been created', newMember });
  } catch (error) {
    logger.error(['[create -- member] Failed to create a new member', error]);
    res.status(404).json({ error: 'Failed to create a new member' });
  }
};

export const loadMany = async (req, res) => {
  try {
    const { teamId, memberIds } = req.query;

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId parameter.' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    if (memberIds) {
      const memberIdsArray = memberIds.split(',');
      const sharedMembers = await Member.find({ _id: { $in: memberIdsArray }, teamId });
      logger.info(['[loadMany -- member] Fetching shared members']);
      return res.status(200).json(sharedMembers);
    } else {
      const members = await Member.find({ teamId });
      logger.info(['[loadMany -- member] Fetching individual members']);
      res.status(200).json(members);
    }

  } catch (error) {
    const errorMsg = error?.message || '';
    logger.error(['[loadMany -- member] Failed to fetch members', errorMsg]);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

export const loadOne = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({error: 'No member with that id'})
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId in the request' });
    }

    const member = await Member.findOne({ _id: id, teamId });

    if (!member) {
      return res.status(404).json({error: 'Member not found or does not belong to the specified team.'})
    }

    res.status(200).json(member);
  } catch (error) {
    const errorMsg = error?.message || '';
    logger.error(['[loadOne -- member] Failed to get member', errorMsg]);
    res.status(500).json({ error: 'Failed to get member' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params
    const { teamId } = req.query;
    const updatedFields  = req.body;
    const avatarUrlPreview = req.body.avatarUrl && req.body.avatarUrl?.preview || "";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).send('No member with that id');
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId in the request' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    const updatedMember = await Member.findOneAndUpdate(
      { _id: id, teamId }, 
      { ...updatedFields, avatarUrl: avatarUrlPreview },
      { new: true }
    );

    if (!updatedMember) {
      return res.status(400).json({error: 'Member not found or does not belong to the specified team.'})
    }
  
    res.status(200).json(updatedMember)
  } catch (error) {
    const errorMsg = error?.message || '';
    logger.error(['[update -- member] Failed to update member', errorMsg]);
    res.status(500).json({ error: 'Failed to update member' });
  }
};

export const updateByEmail = async (req, res) => {
  try {
    const { email } = req.params
    const { teamId } = req.query;
    const updatedFields  = req.body;
    const displayName = req.body.displayName;
    const photoUrlPreview = req.body.photoURL && req.body.photoURL?.preview || "";

    if (!email) {
      return res.status(400).json({ message: 'Missing email in the request', code: 'update/missing field' });
    }

    if (!teamId) {
      return res.status(400).json({ message: 'Missing teamId in the request', code: 'update/missing field' });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({message: 'Team not found.'})
    }

    const updatedMember = await Member.findOneAndUpdate(
      { email, teamId }, 
      { ...updatedFields, name: displayName, avatarUrl: photoUrlPreview },
      { new: true }
    );

    if (!updatedMember) {
      return res.status(200).json({message: 'Member not found or does not belong to the specified team.', code: 'update/not a member'});
    }
  
    res.status(200).json(updatedMember)
  } catch (error) {
    const errorMsg = error?.message || '';
    logger.error(['[updateByEmail -- member] Failed to update member', errorMsg]);
    res.status(500).json({ message: 'Failed to update member' });
  }
};

// Move a member to a group or assign to a group
export const move = async (req, res) => {
  try {
    const id = req.params.id;
    const { teamId, groupId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId in the request' });
    }
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    // Check if the member exists
    const member = await Member.findOne({ _id: id, teamId });
    if (!member) {
      return res.status(404).json({ error: 'Member not found in this team.' });
    }

    // Check if the group exists
    const groupExists = await Group.findOne({ _id: groupId, teamId });
    if (!groupExists) {
      return res.status(404).json({ error: 'Group not found in this team.' });
    }

    // Remove the member from the existing group, if any
    if (member.groupId) {
      await Group.findByIdAndUpdate(member.groupId, { $pull: { members: id } });
    }

    // Update the member's group to the new group
    member.groupId = groupId;
    await member.save();

    // Add the member to the new group
    await Group.findByIdAndUpdate(groupId, { $addToSet: { members: id } });

    return res.status(200).json(member);
  } catch (error) {
    const errorMsg = error?.message || '';
    logger.error(['[move -- member] Failed to move the member to the group.', errorMsg]);
    return res.status(500).json({ error: 'Failed to move the member to the group.' });
  }
};

export const deleteOne = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Member ID is missing from the request.' });
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId in the request' });
    }
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    const member = await Member.findOneAndDelete({ _id: id, teamId });    
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    // Remove the member from the sharedWith property of all documents where they are listed
    await Document.updateMany({ 'sharedWith.member': id }, { $pull: { sharedWith: { member: id } } });

    // Remove the member and shared access of the member from the team
    await Team.findByIdAndUpdate(
      member.teamId,
      {
        $pull: {
          members: id,
          shared: member.email,
          docShared: { email: member.email }, // Remove entire object with matching email
        },
      }
    );

    // Remove the member from all groups they were associated with
    await Group.updateMany({ members: id }, { $pull: { members: id } });

    res.status(200).json({message: `Member with ${id} id has been deleted successfully`})
  } catch (error) {
    const errorMsg = error?.message || '';
    logger.error(['[deleteOne -- member] Failed to delete member.', errorMsg]);
    res.status(500).json({ error: 'Failed to delete member' });
  }
};

export const deleteMany = async (req, res) => {
  try {
    const { memberIds, teamId } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty memberIds array' });
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId in the request' });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    const membersToDelete = await Member.find({ _id: { $in: memberIds }, teamId });
    const emailsToRemove = membersToDelete.map(member => member.email);
    const firebaseIds = membersToDelete.map(member => member.uid);

    const membersDeletedInfo = await Member.deleteMany({ _id: { $in: memberIds }, teamId, });
    // Remove all the members along with their shared access from the team
    await Team.findByIdAndUpdate(
      teamId, {
        $pull: {
          members: { $in: memberIds },
          shared: { $in: emailsToRemove },
          docShared: { email: { $in: emailsToRemove } }
        }
      }
    );
    
    // Update the sharedWith array in the documents
    await Document.updateMany(
      { 'sharedWith.member': { $in: memberIds } },
      { $pull: { sharedWith: { member: { $in: memberIds } } } }
    );

    // Remove the deleted memberIds from the 'members' array of all groups
    await Group.updateMany(
      { members: { $in: memberIds } },
      { $pull: { members: { $in: memberIds } } }
    );

    res.status(200).json({ message: `${membersDeletedInfo.deletedCount} members deleted successfully`, memberIds: firebaseIds });
  } catch (error) {
    const errorMsg = error?.message || '';
    logger.error(['[deleteMany -- member] Failed to delete members.', errorMsg]);
    res.status(500).json({ error: 'Error deleting members' });
  }
};