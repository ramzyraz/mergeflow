import Document from '../models/document.js';
import Member from '../models/member.js';
import Team from '../models/team.js';
import Group from '../models/group.js';
import { sendInviteEmail } from './invite.js';

export const uploadFiles = async (req, res) => {
  try {
    const { teamId, files, showFile } = req.body;

    // Ensure that the teamId and name are provided
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is missing from the request.' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    // Get the total size
    const totalSize = files.reduce((accumulator, currentObject) => accumulator + currentObject.size, 0);
    
    // Create and save individual file Document records
    const fileDocuments = await Promise.all(files.map(async (file) => {
      const fileDocument = new Document({
        teamId,
        showFile,
        name: file.name,
        size: file.size,
        url: file.url,
        type: file.type,
        tags: [],
        sharedWith: [],
      });

      return await fileDocument.save();
    }));

    // Get the ObjectIDs of the file Document records
    const fileDocumentIds = fileDocuments.map(fileDocument => fileDocument._id);
    await Team.findByIdAndUpdate(teamId, { $push: { documents: { $each: fileDocumentIds } } });

    res.status(201).json({ message: 'Files uploaded successfully.', documentIds: fileDocumentIds, totalSize });    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create the folder.' });
  }
}

export const createDocument = async (req, res) => {
  try {
    const { teamId, name, files, url } = req.body;

    // Ensure that the teamId and name are provided
    if (!teamId || !name) {
      return res.status(400).json({ error: 'Team ID and folder name are required.' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }
    
    // Create and save the folder Document with the file Document IDs
    const folder = new Document({
      name,
      teamId,
      url,
      type: 'folder',
      size: files.totalSize,
      totalFiles: files.documentIds.length,
      files: files.documentIds,
      showFile: true,
      tags: [],
      sharedWith: [],
    });
    // Save the folder document to the database
    await folder.save();
    
    // Now, update the team's documents array with the newly created document's _id
    await Team.findByIdAndUpdate(teamId, { $push: { documents: folder._id } });

    res.status(201).json({ message: 'Folder created successfully.', folder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create the folder.' });
  }
}

export const updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { teamId, name, files } = req.body;

    // Ensure that the teamId and name are provided
    if (!teamId || !documentId || !name) {
      return res.status(400).json({ error: 'Team ID, Document ID and name are required.' });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    // Find the folder document by its ID
    const folder = await Document.findById(documentId);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    if (!folder.teamId.equals(teamId)) {
      return res.status(400).json({ error: 'Folder does not belong to the current team.' });
    }

    folder.name = name;
    folder.size += files.totalSize;
    folder.files.push(...files.documentIds)
    folder.totalFiles = folder.files.length;

    await folder.save();

    res.status(200).json({ message: 'Folder details updated successfully.', folder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create the folder.' });
  }
}

export const loadMany = async (req, res) => {
  try {
    const { teamId, userEmail } = req.query;

    let documents;

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId parameter.' });
    }
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    const isAdmin = team.ownerEmail === userEmail;
    if (isAdmin) {
      // User is the admin, fetch all documents belonging to that team
      documents = await Document.find({ teamId, showFile: true }).populate('groups', 'name').populate('sharedWith.member', '_id name email avatarUrl');
    } else {
      const member = await Member.findOne({ email: userEmail, teamId });
      if (!member) {
        return res.status(400).json({ error: 'Member does not exist.' });
      }  

      // User is not the admin, fetch documents with specific access or belonging to the team
      documents = await Document.find({
        teamId,
        $or: [
          { 'groups': { $in: member.groupId }, showFile: true }, // Check if the document belongs to any user group
          { 'sharedWith.member': { $eq: member._id }, showFile: true }, // Check if the document is specifically shared with the user
        ],
        // showFile: true,
      }).populate({
        path: 'groups',
        populate: {
          path: 'members',
          model: 'Member',
          select: '_id name avatarUrl'
        },
      }).populate('sharedWith.member', '_id name email avatarUrl');
    }

    // const documents = await Document.find({ teamId, showFile: true }).populate('groups', 'name').populate('sharedWith.member', '_id name email avatarUrl');
    res.status(200).json(documents);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

export const loadOne = async (req, res) => {
  try {
    const { documentId } = req.params;
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required.' });
    }

    // Find the document by ID
    const document = await Document.findById(documentId)
      .populate('files')
      .populate('groups', 'name')
      .populate('sharedWith.member', '_id name email avatarUrl');

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    res.status(200).json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch document.' });
  }
}

// Share a document with a group or a single user by email
export const shareDocumentWithUserOrGroup = async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const { teamId, groupId, userEmail, invitationLink } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    // Check if the document exists
    const document = await Document.findOne({ _id: documentId, teamId });
    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // If groupId is provided, share the document with the group
    if (groupId) {
      // Check if the group exists
      const group = await Group.findOne({ _id: groupId, teamId });
      if (!group) {
        return res.status(404).json({ error: 'Group not found.' });
      }

      // Share the document with the group
      document.groups.push(groupId);
      await document.save();
    }

    // If userEmail is provided, share the document with the specified user
    if (userEmail) {
      // Check if the user exists
      const member = await Member.findOne({ email: userEmail, teamId });
      if (!member) {
        // Save the email in team and send the invite to the user
        team.docShared.push({ email: userEmail, docId: documentId});
        await team.save();

        await sendInviteEmail(userEmail, invitationLink);
        return res.status(200).json({ error: 'Member not found so sending an Invite.' });
      } 

      // Share the document with the user
      document.sharedWith.push({ member: member._id, permission: 'view' });
      await document.save();
      return res.status(200).json(document);
    }

    res.status(200).json(document);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to share the document.' });
  }
}

export const revokeDocumentAccess = async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const { teamId, groupId, userEmail } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    // Check if the document exists
    const document = await Document.findOne({ _id: documentId, teamId });
    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // If groupId is provided, revoke the access of the document from the group
    if (groupId) {
      // Check if the group exists
      const groupExists = await Group.findOne({ _id: groupId, teamId });
      if (!groupExists) {
        return res.status(404).json({ error: 'Group not found.' });
      }

      // Revoke the access of the document from the group
      document.groups = document.groups.filter(deptId => !deptId.equals(groupId));
      await document.save();
    }

    // If userEmail is provided, revoke the access of the document with the specified user
    if (userEmail) {
      // Check if the user exists
      const member = await Member.findOne({ email: userEmail, teamId });
      if (!member) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Revoke the access of the document from the user
      document.sharedWith = document.sharedWith.filter(entry => !entry.member.equals(memberId));
      await document.save();
      return res.status(200).json({ message: `Document unshared successfully with the member with id ${memberId}` });
    }

    res.status(200).json({ message: `Document unshared successfully with the group with id ${groupId}` });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to revoke document access.' });
  }
}

export const updatePermissions = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { teamId, memberId, newPermission } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    // Check if the document exists
    const document = await Document.findOne({ _id: documentId, teamId });
    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Find the shared member with the provided email
    const sharedMember = document.sharedWith.find(entry  => entry && entry?.member.equals(memberId));
    if (!sharedMember) {
      return res.status(404).json({ error: 'Member not found in the shared list.' });
    }

    // Check if the provided permission is valid
    if (!['view', 'edit'].includes(newPermission)) {
      return res.status(400).json({ error: 'Invalid permission provided.' });
    }

    // Update the permission of the shared member
    sharedMember.permission = newPermission;
    await document.save();

    res.status(200).json({ message: 'Permission updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update the document permission.' });
  }
}

export const updateFavorite = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { isFavorited } = req.body;

    // Ensure that the documentId, and isFavorited are provided
    if (!documentId || isFavorited === null) {
      return res.status(400).json({ error: 'Document ID, and/or favorited tag is missing from the request.' });
    }

    // Find the document to update
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    document.isFavorited = isFavorited;
    await document.save();

    res.status(200).json({ message: 'Document has been marked as favorite' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Error at marking document as favorite.' });
  }
}

export const updateTags = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { tags } = req.body;

    // Check if the number of tags exceeds the limit
    if (tags.length > constants.maxTags) {
      return res.status(400).json({ message: `Only ${constants.maxTags} tags can be selected.` });
    }

    // Find the document by its ID
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    // Update the tags of the document
    document.tags = tags;
    // Save the updated document
    await document.save();

    res.status(200).json({ message: 'Tags updated successfully.', document });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error at updating tags.' });
  }
}

export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { teamId } = req.query;
    const { folderId } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is missing from the request.' });
    }
    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId in the request' });
    }
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    // Find the document to be deleted
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (document.type === 'folder' && document.files.length > 0) {
      // If the document is a folder and contains files, delete the files first
      const fileDocumentIds = document.files;

      // Delete the file documents from the 'Document' collection
      await Document.deleteMany({ _id: { $in: fileDocumentIds } });

      // Remove the file document IDs from the 'documents' array of the team
      await Team.findByIdAndUpdate(teamId, { $pullAll: { documents: fileDocumentIds } });
    }

    if (folderId) {
      const folder = await Document.findById(folderId);
      if (folder) {
        folder.files = folder.files.filter(file => !file.equals(documentId));
        folder.size -= document.size;
        folder.totalFiles--;
        await folder.save();
      }
    }

    // Delete the document itself
    await Document.findByIdAndDelete(documentId);

    // Remove the document ID from the 'documents' array of the team
    await Team.findByIdAndUpdate(teamId, { $pull: { documents: documentId } });

    res.status(200).json({ message: `Document with ${documentId} has been deleted successfully.` });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
}

export const deleteMultipleDocuments = async (req, res) => {
  try {
    const { documentIds, teamId } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty documentIds array' });
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId in the request' });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({error: 'Team not found.'})
    }

    // Find the documents to be deleted
    const documents = await Document.find({ _id: { $in: documentIds }, teamId });

    if (documents.length === 0) {
      return res.status(404).json({ error: 'Documents not found.' });
    }

    // Find the folders with files to be deleted
    const foldersWithFiles = documents.filter(doc => doc.type === 'folder' && doc.files.length > 0);

    // If there are folders with files, delete the files first
    if (foldersWithFiles.length > 0) {
      const fileDocumentIds = foldersWithFiles.flatMap(folder => folder.files);

      // Delete the file documents from the 'Document' collection
      await Document.deleteMany({ _id: { $in: fileDocumentIds } });

      // Remove the file document IDs from the 'documents' array of the team
      await Team.findByIdAndUpdate(teamId, { $pullAll: { documents: fileDocumentIds } });
    }

    // Delete all the documents (including folders without files)
    await Document.deleteMany({ _id: { $in: documentIds }, teamId });

    // Remove the document IDs from the 'documents' array of the team
    await Team.findByIdAndUpdate(teamId, { $pull: { documents: { $in: documentIds } } });

    res.status(200).json({ message: `${documents.length} documents deleted successfully` });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to delete documents.' });
  }
}
