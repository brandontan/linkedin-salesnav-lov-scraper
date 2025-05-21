import mongoose from 'mongoose';

const ProspectSchema = new mongoose.Schema({
  linkedinUrl: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  industry: String,
  location: String,
  email: {
    address: String,
    verified: {
      type: Boolean,
      default: false,
    },
    verificationDate: Date,
    confidence: Number,
  },
  phone: String,
  about: String,
  skills: [String],
  experience: [{
    title: String,
    company: String,
    description: String,
    startDate: Date,
    endDate: Date,
    isCurrent: Boolean,
  }],
  education: [{
    institution: String,
    degree: String,
    field: String,
    startYear: Number,
    endYear: Number,
  }],
  connections: Number,
  notes: String,
  tags: [String],
  outreachStatus: {
    type: String,
    enum: ['new', 'researched', 'email_verified', 'campaign_added', 'contacted', 'responded', 'meeting_booked', 'closed', 'not_interested', 'invalid'],
    default: 'new',
  },
  outreachHistory: [{
    type: {
      type: String,
      enum: ['linkedin_connection', 'linkedin_message', 'email', 'phone', 'meeting'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    content: String,
    response: String,
    woodpeckerId: String,
    campaignId: String,
  }],
  personalizationData: {
    companyInfo: Object,
    recentNews: [String],
    commonConnections: [String],
    interests: [String],
    painPoints: [String],
    opportunities: [String],
  },
  score: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastResearchDate: Date,
});

// Add text indexes for searching
ProspectSchema.index({
  firstName: 'text',
  lastName: 'text',
  company: 'text',
  title: 'text',
  industry: 'text',
  location: 'text',
});

// Update the updatedAt field before saving
ProspectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const Prospect = mongoose.model('Prospect', ProspectSchema);
