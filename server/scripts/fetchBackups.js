/**
 * Emergency Backup Fetcher
 * Tries to connect to MongoDB Atlas and download backup data locally
 * Usage: node scripts/fetchBackups.js
 */

const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');
const { runLocalRecovery } = require('./localRecovery');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'emergency_backup');

// Connection with aggressive timeout settings
const CONNECT_OPTIONS = {
    serverSelectionTimeoutMS: 30000,  // 30 seconds
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    maxPoolSize: 1,
};

async function fetchBackups() {
    console.log('===========================================');
    console.log('  Emergency Backup Fetcher');
    console.log('===========================================');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`MongoDB URI: ${MONGODB_URI ? MONGODB_URI.replace(/:[^@]+@/, ':***@') : 'NOT SET'}`);
    console.log('');

    // Create output directory
    await fs.ensureDir(OUTPUT_DIR);

    console.log('[1/3] Attempting to connect to MongoDB Atlas...');
    console.log('      (This may take up to 30 seconds if servers are slow)');
    console.log('');

    try {
        const conn = await mongoose.connect(MONGODB_URI, CONNECT_OPTIONS);
        console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
        console.log(`✅ Database: ${conn.connection.name}`);
        console.log('');

        const db = conn.connection.db;

        // Step 2: Fetch backup records (without data first to see what's available)
        console.log('[2/3] Fetching backup list...');
        const backupsCollection = db.collection('backups');
        
        const backupList = await backupsCollection.find(
            { status: 'completed' },
            { projection: { data: 0 } }  // Exclude large data field first
        ).sort({ createdAt: -1 }).toArray();

        console.log(`✅ Found ${backupList.length} completed backup(s)`);
        console.log('');

        if (backupList.length === 0) {
            console.log('⚠️  No completed backups found in database.');
            console.log('    Will try to export current data directly...');
            console.log('');
            
            // Export all collections directly
            await exportAllCollections(db);
        } else {
            // Show backup summary
            console.log('📋 Available Backups:');
            console.log('-------------------------------------------');
            backupList.forEach((b, i) => {
                console.log(`  ${i + 1}. ID: ${b.backupId}`);
                console.log(`     Type: ${b.backupType} | Trigger: ${b.triggerType}`);
                console.log(`     Date: ${b.createdAt}`);
                console.log(`     Records: ${b.stats?.totalRecords || 'N/A'}`);
                console.log(`     Size: ${formatBytes(b.stats?.sizeInBytes || 0)}`);
                console.log('');
            });

            // Step 3: Download the latest backup of each type
            console.log('[3/3] Downloading latest backups...');
            
            // Get latest family-tree backup
            const latestFT = backupList.find(b => b.backupType === 'family-tree');
            if (latestFT) {
                console.log(`\n  Downloading Family Tree backup: ${latestFT.backupId}...`);
                const fullFT = await backupsCollection.findOne({ backupId: latestFT.backupId });
                const ftPath = path.join(OUTPUT_DIR, `family-tree_${latestFT.backupId}.json`);
                await fs.writeJson(ftPath, fullFT.data, { spaces: 2 });
                console.log(`  ✅ Saved: ${ftPath}`);
                console.log(`     Records: ${fullFT.data?.persons?.length || 0} persons`);
            }

            // Get latest CMS backup
            const latestCMS = backupList.find(b => b.backupType === 'cms');
            if (latestCMS) {
                console.log(`\n  Downloading CMS backup: ${latestCMS.backupId}...`);
                const fullCMS = await backupsCollection.findOne({ backupId: latestCMS.backupId });
                const cmsPath = path.join(OUTPUT_DIR, `cms_${latestCMS.backupId}.json`);
                await fs.writeJson(cmsPath, fullCMS.data, { spaces: 2 });
                console.log(`  ✅ Saved: ${cmsPath}`);
                
                // Show CMS stats
                const data = fullCMS.data || {};
                console.log(`     News: ${data.news?.length || 0}`);
                console.log(`     Articles: ${data.articles?.length || 0}`);
                console.log(`     Conversations: ${data.conversations?.length || 0}`);
                console.log(`     Gallery: ${data.gallery?.length || 0}`);
                console.log(`     Contacts: ${data.contacts?.length || 0}`);
                console.log(`     Comments: ${data.comments?.length || 0}`);
                console.log(`     Hero Slides: ${data.heroSlides?.length || 0}`);
            }

            // Also save the backup list summary
            const summaryPath = path.join(OUTPUT_DIR, 'backup_summary.json');
            await fs.writeJson(summaryPath, backupList, { spaces: 2 });
            console.log(`\n  ✅ Backup summary saved: ${summaryPath}`);
        }

        console.log('\n===========================================');
        console.log('  ✅ DONE! All backups saved to:');
        console.log(`  ${OUTPUT_DIR}`);
        console.log('===========================================');

    } catch (error) {
        console.error('');
        console.error('❌ Connection FAILED:', error.message);
        console.error('');
        
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            console.error('💡 DNS resolution failed - MongoDB Atlas servers are unreachable.');
        } else if (error.message.includes('whitelist') || error.message.includes('IP')) {
            console.error('💡 Your IP is not whitelisted. Add 0.0.0.0/0 in MongoDB Atlas Network Access.');
        } else if (error.message.includes('ReplicaSetNoPrimary')) {
            console.error('💡 MongoDB Atlas cluster has no primary node - likely an AWS outage.');
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
            console.error('💡 Connection timed out - servers may be overloaded.');
        }
        
        console.error('');
        console.error('📌 Options:');
        console.error('   1. Wait for MongoDB Atlas / AWS to recover');
        console.error('   2. Check status at: https://status.mongodb.com/');
        console.error('   3. Check AWS status at: https://health.aws.amazon.com/');
        console.error('   4. Try again later with: node scripts/fetchBackups.js');
        console.error('');
        console.error('Switching to local-only recovery mode...');
        try {
            const recovery = await runLocalRecovery('fetchBackups-fallback');
            console.error(`Local recovery bundle created: ${recovery.outputPath}`);
        } catch (recoveryError) {
            console.error(`Local recovery fallback failed: ${recoveryError.message}`);
        }
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

async function exportAllCollections(db) {
    const collections = [
        'persons', 'news', 'articles', 'conversations',
        'palestines', 'galleries', 'contacts', 'comments',
        'familytickernews', 'palestinetickernews', 'tickersettings',
        'heroslides', 'forumusers', 'forumtopics', 'forumposts'
    ];

    for (const colName of collections) {
        try {
            const data = await db.collection(colName).find({}).toArray();
            if (data.length > 0) {
                const filePath = path.join(OUTPUT_DIR, `direct_export_${colName}.json`);
                await fs.writeJson(filePath, data, { spaces: 2 });
                console.log(`  ✅ ${colName}: ${data.length} records saved`);
            } else {
                console.log(`  ⏭️  ${colName}: empty, skipped`);
            }
        } catch (e) {
            console.log(`  ❌ ${colName}: failed - ${e.message}`);
        }
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run
fetchBackups();
