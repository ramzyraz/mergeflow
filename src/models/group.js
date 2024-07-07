import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  }],
  sharedDocuments: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    }],
    default: []
  },
}, { timestamps: true });

export default mongoose.model('Group', Schema);
