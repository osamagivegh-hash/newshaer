/**
 * Script to set the Founder Post flag for Osama Mohammed Mousa Al-Shaer
 * This will make his article always appear at the top of the dev team posts
 * 
 * Usage: node server/scripts/setFounderPost.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { DevTeamPost } = require('../models/DevTeam');

const MONGODB_URI = process.env.MONGODB_URI;

async function setFounderPost() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Search for posts by Osama Mohammed Mousa Al-Shaer
        const searchTerms = [
            'أسامة محمد موسى الشاعر',
            'اسامة محمد موسى الشاعر',
            'أسامة محمد',
            'اسامة محمد',
            'أسامه محمد موسى الشاعر',
            'اسامه محمد موسى الشاعر'
        ];

        // First, reset any existing founder posts
        console.log('\n🔄 Resetting any existing founder posts...');
        await DevTeamPost.updateMany(
            { isFounderPost: true },
            { $set: { isFounderPost: false } }
        );

        // Search for the founder's post
        console.log('\n🔍 Searching for founder post...');

        let founderPost = null;

        for (const term of searchTerms) {
            founderPost = await DevTeamPost.findOne({
                $or: [
                    { author: { $regex: term, $options: 'i' } },
                    { title: { $regex: term, $options: 'i' } },
                    { content: { $regex: term, $options: 'i' } }
                ]
            });

            if (founderPost) {
                console.log(`✅ Found post matching: "${term}"`);
                break;
            }
        }

        if (founderPost) {
            console.log('\n📋 Found Founder Post:');
            console.log(`   ID: ${founderPost._id}`);
            console.log(`   Title: ${founderPost.title}`);
            console.log(`   Author: ${founderPost.author}`);
            console.log(`   Created: ${founderPost.createdAt}`);

            // Update the post
            founderPost.isFounderPost = true;
            founderPost.isPinned = true;
            await founderPost.save();

            console.log('\n✅ Successfully set as Founder Post!');
            console.log('   This post will now always appear at the top.');
        } else {
            console.log('\n⚠️ No post found with the founder name.');
            console.log('\nSearching all posts to help identify...\n');

            // List all posts
            const allPosts = await DevTeamPost.find({}).select('_id title author createdAt').sort({ createdAt: -1 });

            if (allPosts.length === 0) {
                console.log('No posts found in the database.');
                console.log('\nYou can create a new founder post through the admin panel,');
                console.log('or run this script again after creating the post.');
            } else {
                console.log('Available posts:');
                allPosts.forEach((post, index) => {
                    console.log(`${index + 1}. [${post._id}] "${post.title}" by ${post.author}`);
                });

                console.log('\n💡 To manually set a founder post, you can:');
                console.log('   1. Use the admin panel and check "تثبيت كمقال المؤسس"');
                console.log('   2. Or run: node server/scripts/setFounderPost.js <post_id>');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Check if a specific post ID was provided
const postId = process.argv[2];

if (postId) {
    // Set specific post as founder post
    (async () => {
        try {
            console.log('🔌 Connecting to MongoDB...');
            await mongoose.connect(MONGODB_URI);
            console.log('✅ Connected to MongoDB');

            // Reset existing founder posts
            await DevTeamPost.updateMany(
                { isFounderPost: true },
                { $set: { isFounderPost: false } }
            );

            // Find and update the specified post
            const post = await DevTeamPost.findById(postId);

            if (post) {
                post.isFounderPost = true;
                post.isPinned = true;
                await post.save();

                console.log('\n✅ Successfully set as Founder Post!');
                console.log(`   Title: ${post.title}`);
                console.log(`   Author: ${post.author}`);
            } else {
                console.log(`\n❌ Post with ID "${postId}" not found.`);
            }

        } catch (error) {
            console.error('❌ Error:', error.message);
        } finally {
            await mongoose.disconnect();
            console.log('\n🔌 Disconnected from MongoDB');
        }
    })();
} else {
    setFounderPost();
}
