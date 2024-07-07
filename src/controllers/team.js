import mongoose from 'mongoose';
import Team from '../models/team.js';
import Member from '../models/member.js';
import Document from '../models/document.js';
import { sendMultipleInviteEmails, sendInviteEmail } from './invite.js';
import logger from '../utils/logger.js';

export const createTeam = async (req, res) => {
  try {
    const { companyName, ownerId, ownerRole, ownerEmail, shared, invitationLink } = req.body;
    let inviteSend;

    if (!companyName || !ownerId || !ownerRole || !ownerEmail) {
      return res.status(400).json({ error: 'Missing items in the request' });
    }

    // Check if the companyName is unique
    const existingTeam = await Team.findOne({ companyName });
    if (existingTeam) {
      return res.status(400).json({ error: 'A team with the provided company name already exists.' });
    }

    const team = new Team({
      companyName,
      ownerId,
      ownerEmail,
      ownerRole,
      ownerType: "admin",
      shared,
      members: [],
      documents: [],
    });
    // Save the team to the database
    await team.save();

    if (shared && !!shared.length) {
      // Send invitation emails to the recipients in the 'shared' array
      await sendMultipleInviteEmails(shared, invitationLink);
      inviteSend = true;
    }
    
    res.status(201).json({ message: 'Team created successfully', team, inviteSend });
  } catch (error) {
    logger.error(['[createTeam] Failed to create a new team', error]);
    res.status(500).json({ error: 'Failed to create a new team' });
  }
};

export const sendInvite = async (req, res) => {
  try {
    const { teamId, email, invitationLink } = req.body;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(404).json({error: 'No team with that id'})
    }

    let team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    // Send the invite to the user
    const result = await sendInviteEmail(email, invitationLink);

    if (!result) {
      res.status(500).json({ error: 'Failed to send invite to team members.' });
    }

    // Save the user email in shared so user can register
    team.shared.push(email);
    await team.save();

    res.status(200).json({ message: "Invite has been sent to the user." });
  } catch (error) {
    logger.error(['[sendInvite -- member] Failed to send invite to team members.', error]);
    res.status(500).json({ error: 'Failed to send invite to team members.' });
  }
}

export const loadMany = async (req, res) => {
  try {
    const teams = await Team.find({});
    res.status(200).json(teams);
  } catch (error) {
    logger.error(['[loadMany -- team] Failed to fetch teams', error]);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
}

export const loadOne = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(404).json({error: 'No team with that id'})
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }
    res.status(200).json(team);
  } catch (error) {
    logger.error(['[loadOne -- member] Failed to fetch the team', error]);
    res.status(500).json({ error: 'Failed to fetch the team' });
  }
}

export const loadOneByName = async (req, res) => {
  try {
    const { name, email } = req.query;
    const teamName = req.params.teamName;
    // Check if a team with the entered company name already exists
    const team = await Team.findOne({ companyName: teamName });

    if (team) {
      // Team already exists, create a new member and add them to the team
      const member = await Member.findOne({ email, teamId: team._id });

      if (member) {
        // Member already exists with the given email 
        return res.status(202).json({ error: 'A member with the provided email already exists.', team, member });
      } else {
        const newMember = new Member({
          name: name,
          email: email,
          company: teamName,
          teamId: team._id,
          isVerified: false,
          role: "employee",
          type: "employee",
          status: 'active',
        });

        await newMember.save();

        // Fetch all documents belonging to the team
        const documents = await Document.find({ teamId: team._id });
        // Update the sharedWith array of each document with the new member's information
        await Promise.all(documents.map(async (document) => {
          const updatedSharedWith = [
            ...document.sharedWith,
            {
              memberId: newMember._id,
              email: newMember.email,
              name: newMember.name,
              avatarUrl: newMember.avatarUrl,
              permission: 'view', // Default permission for a new member
            },
          ];

          return await Document.findByIdAndUpdate(document._id, { sharedWith: updatedSharedWith }, { new: true });
        }));

        // Update the team's members array with the new member's ID
        await Team.findByIdAndUpdate(team._id, { $push: { members: newMember._id } });
        return res.status(200).json({ message: 'Team exists. Member created successfully.', team, member: newMember });
      }
    } 
    
    res.status(404).json({ message: "Team not found." });
  } catch (error) {
    logger.error(['[loadOneByName -- member] Failed to fetch the team', error]);
    res.status(500).json({ error: 'Failed to fetch the team' });
  }
}

export const loadOneByEmail = async (req, res) => {
  try {
    const { name } = req.query;
    const { email } = req.params;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and/or Email is empty.', code: 'auth/missing fields' });
    }

    // Find any team owner whose section after "@" matches the provided email
    const teamWithMatchingOwner = await Team.findOne({ ownerEmail: { $regex: `@${email.split('@')[1]}`, $options: 'i' } });
    if (!teamWithMatchingOwner) {
      // If no team matches the criteria, return not found
      return res.status(200).json({ message: "No team found with the matching email domain. User can proceed further for team creation." });
    }   
    
    // There is a team with matching owner's email. Check if the shared array of the teamWithMatchingOwner contains the email
    const isEmailInShared = teamWithMatchingOwner.shared.includes(email);
    const isEmailInDocShared = teamWithMatchingOwner.docShared.find(teamItem => teamItem.email === email);
    if (!isEmailInShared && !isEmailInDocShared) {
      return res.status(403).json({ message: 'You are not authorized to create this account. Please contact your administrator.', code: 'auth/unauthorized' });
    }

    // Create a new member
    const newMember = new Member({
      name: name,
      email: email,
      company: teamWithMatchingOwner.companyName,
      teamId: teamWithMatchingOwner._id,
      groupId: null,
      uid: "",
      isVerified: true,
      role: "employee",
      type: "employee",
    });
    await newMember.save();

    if (isEmailInDocShared) {
      const document = await Document.findById(isEmailInDocShared.docId);
      document.sharedWith.push({ member: newMember._id, permission: 'view' });
      await document.save();
    }

    // Update the team's members array with the new member's ID
    teamWithMatchingOwner.members.push(newMember._id);
    await teamWithMatchingOwner.save();

    return res.status(201).json({ message: 'Team exists. Member created successfully.', team: teamWithMatchingOwner, member: newMember });   
  } catch (error) {
    if (error?.errors && error?.errors?.email) {
      return res.status(500).json({ message: error?.errors?.email?.message, code: 'auth/email-already-in-use' });
    }
    res.status(500).json({ message: 'Failed to fetch the team' });
  }
}

export const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(404).json({error: 'No team with that id'})
    }

    const team = await Team.findByIdAndDelete(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }
        
    res.status(200).json({message: `Team with ${teamId} id has been deleted successfully`});
  } catch (error) {
      logger.error(['[deleteTeam] Failed to delete team', error]);
    res.status(500).json({ error: 'Failed to delete team' });
  }
}