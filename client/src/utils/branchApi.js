/**
 * Branch-Based Tree API Utility
 * 
 * Safe, scalable API calls for lazy loading family tree data.
 * Uses the NEW /api/branches endpoints that load data progressively.
 * 
 * IMPORTANT: This is a NEW utility. It does NOT replace familyTreeCache.js
 * The existing fetchTreeWithCache() continues to work for branch-based views.
 */

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Fetch all branch metadata (lightweight - no member data)
 * @returns {Promise<{ success: boolean, data: Array, root: Object }>}
 */
export const fetchBranches = async () => {
    const response = await fetch(`${API_URL}/api/branches`);
    if (!response.ok) {
        throw new Error('Failed to fetch branches');
    }
    return response.json();
};

/**
 * Fetch members of a single branch (flat records, paginated)
 * @param {string} branchId - The branch root ID
 * @param {Object} options - { page, limit, depth }
 * @returns {Promise<{ success: boolean, data: Array, pagination: Object }>}
 */
export const fetchBranchMembers = async (branchId, options = {}) => {
    const { page = 1, limit = 50, depth } = options;

    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (depth) params.append('depth', depth.toString());

    const response = await fetch(`${API_URL}/api/branches/${branchId}/members?${params}`);
    if (!response.ok) {
        throw new Error('Failed to fetch branch members');
    }
    return response.json();
};

/**
 * Fetch shallow tree structure for a branch (depth-limited)
 * @param {string} branchId - The branch root ID
 * @param {number} depth - Max depth (default: 2, max: 3)
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export const fetchBranchTree = async (branchId, depth = 2) => {
    const response = await fetch(`${API_URL}/api/branches/${branchId}/tree?depth=${depth}`);
    if (!response.ok) {
        throw new Error('Failed to fetch branch tree');
    }
    return response.json();
};

/**
 * Fetch direct children of a node (for lazy expansion)
 * @param {string} nodeId - The parent node ID
 * @returns {Promise<{ success: boolean, data: Array }>}
 */
export const fetchNodeChildren = async (nodeId) => {
    const response = await fetch(`${API_URL}/api/branches/${nodeId}/children`);
    if (!response.ok) {
        throw new Error('Failed to fetch children');
    }
    return response.json();
};

/**
 * Fetch overall statistics
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export const fetchBranchStats = async () => {
    const response = await fetch(`${API_URL}/api/branches/stats/overview`);
    if (!response.ok) {
        throw new Error('Failed to fetch stats');
    }
    return response.json();
};

/**
 * Build tree structure from flat member records (client-side)
 * This is memory-safe because we only do this for a single branch at a time
 * @param {Array} members - Flat array of member records
 * @param {string} rootId - The root node ID
 * @returns {Object} - Tree structure
 */
export const buildTreeFromMembers = (members, rootId) => {
    if (!members || members.length === 0) return null;

    // Create a map for O(1) lookup
    const memberMap = new Map();
    members.forEach(member => {
        memberMap.set(member._id.toString(), {
            ...member,
            children: []
        });
    });

    // Find root and build relationships
    let root = null;
    members.forEach(member => {
        const node = memberMap.get(member._id.toString());

        if (member._id.toString() === rootId.toString()) {
            root = node;
        } else if (member.fatherId) {
            const parent = memberMap.get(member.fatherId.toString());
            if (parent) {
                parent.children.push(node);
            }
        }
    });

    // Sort children by siblingOrder
    const sortChildren = (node) => {
        if (node.children && node.children.length > 0) {
            node.children.sort((a, b) => (a.siblingOrder || 0) - (b.siblingOrder || 0));
            node.children.forEach(sortChildren);
        }
    };

    if (root) {
        sortChildren(root);
    }

    return root;
};

export default {
    fetchBranches,
    fetchBranchMembers,
    fetchBranchTree,
    fetchNodeChildren,
    fetchBranchStats,
    buildTreeFromMembers
};
