import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  targetAudience: {
    industries: [String],
    jobTitles: [String],
    companySize: String,
    locations: [String],
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft',
  },
  createdBy: String,
  messageTemplates: [{
    name: String,
    subject: String,
    body: String,
    followUpNumber: Number,
    personalizationLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  }],
  woodpeckerCampaignId: String,
  stats: {
    totalProspects: {
      type: Number,
      default: 0,
    },
    emailsSent: {
      type: Number,
      default: 0,
    },
    emailsOpened: {
      type: Number,
      default: 0,
    },
    emailsClicked: {
      type: Number,
      default: 0,
    },
    responses: {
      type: Number,
      default: 0,
    },
    meetings: {
      type: Number,
      default: 0,
    },
    deals: {
      type: Number,
      default: 0,
    },
  },
  prospects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prospect',
  }],
  startDate: Date,
  endDate: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
CampaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const Campaign = mongoose.model('Campaign', CampaignSchema);
