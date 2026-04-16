/**
 * EMERGENCY DATA EXTRACTION
 * Tries EVERY possible method to connect to MongoDB and extract family tree data
 * 
 * Methods tried:
 * 1. Standard SRV connection
 * 2. Direct connection to each replica set member
 * 3. Secondary read preference
 * 4. Different timeout configurations
 */

const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');
const dns = require('dns');
const { runLocalRecovery } = require('./localRecovery');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'emergency_backup');
const MONGODB_URI = process.env.MONGODB_URI;

// Known replica set members from error logs
const REPLICA_MEMBERS = [
    'ac-mtgvpu1-shard-00-00.npzs81o.mongodb.net',
    'ac-mtgvpu1-shard-00-01.npzs81o.mongodb.net',
    'ac-mtgvpu1-shard-00-02.npzs81o.mongodb.net'
];

// Extract credentials from URI
function extractCredentials(uri) {
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@/);
    if (match) return { user: match[1], pass: match[2] };
    return null;
}

async function resolveSRV() {
    console.log('\n📡 [DNS] Resolving SRV records...');
    return new Promise((resolve) => {
        dns.resolveSrv('_mongodb._tcp.cluster0.npzs81o.mongodb.net', (err, addresses) => {
            if (err) {
                console.log(`   ❌ SRV resolution failed: ${err.message}`);
                resolve(null);
            } else {
                console.log(`   ✅ SRV resolved to ${addresses.length} hosts:`);
                addresses.forEach(a => console.log(`      - ${a.name}:${a.port}`));
                resolve(addresses);
            }
        });
    });
}

async function tryConnection(label, uri, options = {}) {
    console.log(`\n🔌 [${label}] Trying connection...`);
    console.log(`   URI: ${uri.replace(/:[^@]+@/, ':***@').substring(0, 80)}...`);
    
    const conn = mongoose.createConnection();
    
    const defaultOptions = {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 20000,
        maxPoolSize: 1,
        ...options
    };

    try {
        await conn.openUri(uri, defaultOptions);
        console.log(`   ✅ CONNECTED! Host: ${conn.host}`);
        return conn;
    } catch (error) {
        const shortError = error.message.split('\n')[0].substring(0, 100);
        console.log(`   ❌ Failed: ${shortError}`);
        try { await conn.close(); } catch(e) {}
        return null;
    }
}

async function extractData(conn) {
    console.log('\n📦 Extracting data...');
    await fs.ensureDir(OUTPUT_DIR);
    
    const db = conn.db;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Priority 1: Family Tree (persons)
    try {
        const persons = await db.collection('persons').find({}).toArray();
        if (persons.length > 0) {
            const filePath = path.join(OUTPUT_DIR, `persons_${timestamp}.json`);
            await fs.writeJson(filePath, persons, { spaces: 2 });
            console.log(`   ✅ PERSONS: ${persons.length} records saved → ${filePath}`);
        } else {
            console.log('   ⚠️ PERSONS: collection empty');
        }
    } catch (e) {
        console.log(`   ❌ PERSONS: ${e.message}`);
    }

    // Priority 2: Backups collection
    try {
        const backups = await db.collection('backups').find({ status: 'completed' })
            .sort({ createdAt: -1 }).limit(5).toArray();
        if (backups.length > 0) {
            for (const backup of backups) {
                const filePath = path.join(OUTPUT_DIR, `backup_${backup.backupType}_${backup.backupId || timestamp}.json`);
                await fs.writeJson(filePath, backup.data || backup, { spaces: 2 });
                console.log(`   ✅ BACKUP [${backup.backupType}]: saved → ${filePath}`);
            }
        } else {
            console.log('   ⚠️ BACKUPS: no completed backups found');
        }
    } catch (e) {
        console.log(`   ❌ BACKUPS: ${e.message}`);
    }

    // Priority 3: All other important collections
    const collections = [
        'news', 'articles', 'conversations', 'palestines',
        'galleries', 'contacts', 'comments', 'familytickernews',
        'heroslides', 'admins', 'familytreeadmins',
        'forumusers', 'forumcategories', 'forumtopics', 'forumposts',
        'devteams', 'familytreecontents'
    ];

    for (const colName of collections) {
        try {
            const data = await db.collection(colName).find({}).toArray();
            if (data.length > 0) {
                const filePath = path.join(OUTPUT_DIR, `${colName}_${timestamp}.json`);
                await fs.writeJson(filePath, data, { spaces: 2 });
                console.log(`   ✅ ${colName}: ${data.length} records`);
            }
        } catch (e) {
            // silently skip
        }
    }

    console.log(`\n🎉 All data saved to: ${OUTPUT_DIR}`);
}

async function main() {
    console.log('==============================================');
    console.log('  🚨 EMERGENCY DATA EXTRACTION TOOL');
    console.log('==============================================');
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log(`  Target: cluster0.npzs81o.mongodb.net`);
    console.log('');

    const creds = extractCredentials(MONGODB_URI);
    if (!creds) {
        console.error('❌ Cannot parse credentials from MONGODB_URI');
        process.exit(1);
    }

    // Resolve DNS first
    await resolveSRV();

    let conn = null;

    // ============ METHOD 1: Standard SRV ============
    conn = await tryConnection('Method 1: Standard SRV', MONGODB_URI);
    
    if (!conn) {
        // ============ METHOD 2: SRV with secondary read ============
        conn = await tryConnection(
            'Method 2: SRV + Secondary Read',
            MONGODB_URI + '&readPreference=secondary&readPreferenceTags=[]'
        );
    }

    if (!conn) {
        // ============ METHOD 3: SRV with nearest read ============
        conn = await tryConnection(
            'Method 3: SRV + Nearest Read',
            MONGODB_URI + '&readPreference=nearest'
        );
    }

    if (!conn) {
        // ============ METHOD 4-6: Direct connection to each member ============
        for (let i = 0; i < REPLICA_MEMBERS.length; i++) {
            const host = REPLICA_MEMBERS[i];
            const directUri = `mongodb://${creds.user}:${creds.pass}@${host}:27017/?authSource=admin&ssl=true&directConnection=true&readPreference=secondaryPreferred`;
            
            conn = await tryConnection(
                `Method ${4 + i}: Direct → ${host.split('.')[0]}`,
                directUri,
                { serverSelectionTimeoutMS: 20000 }
            );
            
            if (conn) break;
        }
    }

    if (!conn) {
        // ============ METHOD 7: Standard with very long timeout ============
        conn = await tryConnection(
            'Method 7: Long Timeout (60s)',
            MONGODB_URI,
            { 
                serverSelectionTimeoutMS: 60000, 
                connectTimeoutMS: 60000,
                socketTimeoutMS: 120000 
            }
        );
    }

    if (!conn) {
        // ============ METHOD 8: Force replica set with secondary ============
        const rsUri = `mongodb://${creds.user}:${creds.pass}@${REPLICA_MEMBERS.join(':27017,') + ':27017'}/?authSource=admin&ssl=true&replicaSet=atlas-wa5u9j-shard-0&readPreference=secondary`;
        conn = await tryConnection('Method 8: Replica Set URI + Secondary', rsUri, {
            serverSelectionTimeoutMS: 30000
        });
    }

    // ============ RESULTS ============
    console.log('\n==============================================');
    if (conn) {
        console.log('  ✅ CONNECTION SUCCESSFUL!');
        console.log('==============================================');
        await extractData(conn);
        await conn.close();
    } else {
        console.log('  ❌ ALL CONNECTION METHODS FAILED');
        console.log('==============================================');
        console.log('');
        console.log('  السيرفرات غير قابلة للوصول حالياً.');
        console.log('  الخيارات المتبقية:');
        console.log('  1. استخراج الكاش من المتصفح (localStorage)');
        console.log('  2. انتظار عودة سيرفرات AWS');
        console.log('  3. التواصل مع دعم MongoDB');
        console.log('');
        console.log('  لاستخراج الكاش من المتصفح:');
        console.log('  - افتح المتصفح → F12 → Console');
        console.log('  - الصق: JSON.parse(localStorage.getItem("familyTreeData_v3"))');
        try {
            const recovery = await runLocalRecovery('emergencyExtract-fallback');
            console.log('');
            console.log(`  Local recovery bundle created: ${recovery.outputPath}`);
        } catch (recoveryError) {
            console.log(`  Local recovery fallback failed: ${recoveryError.message}`);
        }
    }

    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
