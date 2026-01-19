/**
 * Person Schema for Arabic Family Tree (Genealogy)
 * Integrated into Alshaer Family Website
 * 
 * This schema supports:
 * - Unlimited generations through self-referencing
 * - Complex family branches
 * - Arabic text with RTL support
 * - Historical documentation
 */

const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  // Full Arabic name
  fullName: {
    type: String,
    required: [true, 'الاسم الكامل مطلوب'],
    trim: true,
    index: true
  },

  // Optional nickname or known-as name
  nickname: {
    type: String,
    trim: true
  },

  // Father reference (self-referencing for tree structure)
  fatherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    default: null,
    index: true
  },

  // Mother reference (optional for extended genealogy)
  motherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    default: null
  },

  // Generation level (auto-calculated from root)
  generation: {
    type: Number,
    default: 0,
    index: true
  },

  // Gender (male/female)
  gender: {
    type: String,
    enum: ['male', 'female', 'unknown'],
    default: 'male'
  },

  // Birth date (approximate for historical figures)
  birthDate: {
    type: String,
    trim: true
  },

  // Death date (if applicable)
  deathDate: {
    type: String,
    trim: true
  },

  // Is this person still alive?
  isAlive: {
    type: Boolean,
    default: true
  },

  // Birth location/origin
  birthPlace: {
    type: String,
    trim: true
  },

  // Current residence
  currentResidence: {
    type: String,
    trim: true
  },

  // Occupation or profession
  occupation: {
    type: String,
    trim: true
  },

  // Biography or notes
  biography: {
    type: String,
    trim: true
  },

  // Additional notes for historical documentation
  notes: {
    type: String,
    trim: true
  },

  // Profile image URL
  profileImage: {
    type: String,
    trim: true
  },

  // Order among siblings (for display purposes)
  siblingOrder: {
    type: Number,
    default: 0
  },

  // Is this the root ancestor?
  isRoot: {
    type: Boolean,
    default: false,
    index: true
  },

  // Contact information (for living family members)
  contact: {
    phone: String,
    email: String,
    address: String
  },

  // Verification status (for accuracy tracking)
  verification: {
    status: {
      type: String,
      enum: ['verified', 'pending', 'unverified'],
      default: 'pending'
    },
    verifiedBy: String,
    verifiedAt: Date,
    source: String
  },

  // Created by (admin user tracking)
  createdBy: {
    type: String,
    trim: true
  },

  // Ownership audit
  createdBy: {
    type: String,
    default: 'system'
  },
  lastModifiedBy: {
    type: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'persons' // Explicitly set collection name
});

// Virtual for children (those who have this person as father)
personSchema.virtual('children', {
  ref: 'Person',
  localField: '_id',
  foreignField: 'fatherId'
});

// Virtual for full lineage path (ancestors)
personSchema.virtual('lineage').get(function () {
  return this._lineage || [];
});

personSchema.virtual('childrenCount', {
  ref: 'Person',
  localField: '_id',
  foreignField: 'fatherId',
  count: true
});

// Pre-save middleware to auto-calculate generation
personSchema.pre('save', async function (next) {
  if (this.isModified('fatherId') || this.isNew) {
    if (!this.fatherId) {
      this.generation = 0;
      this.isRoot = true;
    } else {
      const father = await this.constructor.findById(this.fatherId);
      if (father) {
        this.generation = father.generation + 1;
        this.isRoot = false;
      }
    }
  }
  this.updatedAt = new Date();
  next();
});

// Static method to get full tree starting from root
personSchema.statics.getFullTree = async function () {
  const root = await this.findOne({ isRoot: true }).populate({
    path: 'children',
    populate: {
      path: 'children',
      populate: {
        path: 'children',
        populate: {
          path: 'children',
          populate: {
            path: 'children',
            populate: {
              path: 'children',
              populate: {
                path: 'children',
                populate: {
                  path: 'children'
                }
              }
            }
          }
        }
      }
    }
  });
  return root;
};

// Static method to build nested tree structure (OPTIMIZED - single query)
personSchema.statics.buildTree = async function (personId = null) {
  // Fetch ALL persons in a single query - MUCH faster than recursive queries
  const allPersons = await this.find({}).lean();

  if (allPersons.length === 0) return null;

  // Create a map for O(1) lookup
  const personMap = new Map();
  allPersons.forEach(person => {
    personMap.set(person._id.toString(), {
      ...person,
      children: []
    });
  });

  // Build parent-child relationships and add fatherName
  let root = null;
  allPersons.forEach(person => {
    const node = personMap.get(person._id.toString());

    if (person.fatherId) {
      const parent = personMap.get(person.fatherId.toString());
      if (parent) {
        parent.children.push(node);
        // Add father's name for display in PersonModal
        node.fatherName = parent.fullName;
      }
    }

    // Find root (no fatherId or isRoot flag)
    if (person.isRoot || (!person.fatherId && !root)) {
      root = node;
    }
  });

  // Sort children by siblingOrder
  const sortChildren = (node) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => (a.siblingOrder || 0) - (b.siblingOrder || 0));
      node.children.forEach(sortChildren);
    }
  };

  // If a specific personId was requested, return that branch
  if (personId) {
    const startNode = personMap.get(personId.toString());
    if (startNode) {
      sortChildren(startNode);
      return startNode;
    }
    return null;
  }

  // Return full tree from root
  if (root) {
    sortChildren(root);
    return root;
  }

  return null;
};

// Static method to get ancestors chain
personSchema.statics.getAncestors = async function (personId) {
  const ancestors = [];
  let currentPerson = await this.findById(personId);

  while (currentPerson && currentPerson.fatherId) {
    const father = await this.findById(currentPerson.fatherId);
    if (father) {
      ancestors.push(father);
      currentPerson = father;
    } else {
      break;
    }
  }

  return ancestors;
};

// Static method to get descendants count
personSchema.statics.getDescendantsCount = async function (personId) {
  let count = 0;
  const countDescendants = async (id) => {
    const children = await this.find({ fatherId: id });
    count += children.length;
    await Promise.all(children.map(child => countDescendants(child._id)));
  };

  await countDescendants(personId);
  return count;
};

// Index for efficient queries
personSchema.index({ fullName: 'text', nickname: 'text', biography: 'text' });

const Person = mongoose.model('Person', personSchema);

module.exports = Person;
