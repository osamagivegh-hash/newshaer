/**
 * Log Analyzer Integration Adapter
 * 
 * A lightweight, non-blocking, fail-safe logging adapter that sends structured
 * logs to the Log Analyzer service for analysis and visualization.
 * 
 * IMPORTANT: This adapter is designed to be OPTIONAL and NON-BLOCKING.
 * If the Log Analyzer service is unavailable, the main application continues
 * working without any interruption.
 * 
 * Usage:
 * 1. Copy this file to your project (e.g., /server/utils/logAnalyzerAdapter.js)
 * 2. Set environment variable: LOG_ANALYZER_URL and LOG_ANALYZER_KEY
 * 3. Import and use:
 * 
 *    const logAdapter = require('./utils/logAnalyzerAdapter');
 *    
 *    // Log errors
 *    logAdapter.error('Failed to fetch data', { route: '/api/news', userId: '123' });
 *    
 *    // Log warnings
 *    logAdapter.warn('Rate limit approaching', { route: '/api/users' });
 *    
 *    // Log info
 *    logAdapter.info('User logged in', { route: '/api/auth', userId: '456' });
 */

const https = require('https');
const http = require('http');

// ============================================================
// Configuration
// ============================================================
const CONFIG = {
    // Log Analyzer endpoint URL
    url: process.env.LOG_ANALYZER_URL || null,

    // API key for authentication
    apiKey: process.env.LOG_ANALYZER_KEY || null,

    // Service name to identify this application
    serviceName: process.env.LOG_ANALYZER_SERVICE_NAME || 'alshaer-family-web',

    // Request timeout in milliseconds (must be ≤ 200ms as per spec)
    timeout: 200,

    // Enable/disable logging (set to false to disable completely)
    enabled: process.env.LOG_ANALYZER_ENABLED !== 'false',

    // Batch settings for high-volume scenarios
    batchSize: 10,
    batchFlushInterval: 5000,  // 5 seconds

    // Silent mode - never log errors to console
    silent: process.env.LOG_ANALYZER_SILENT === 'true'
};

// ============================================================
// Internal State
// ============================================================
let logQueue = [];
let flushTimeout = null;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Parse URL and determine protocol
 */
function parseUrl(urlString) {
    try {
        const url = new URL(urlString);
        return {
            protocol: url.protocol === 'https:' ? https : http,
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + '/api/v1/logs/ingest'
        };
    } catch (e) {
        return null;
    }
}

/**
 * Send log to analyzer (fire-and-forget, non-blocking)
 */
function sendLog(logEntry) {
    // Skip if disabled or no URL configured
    if (!CONFIG.enabled || !CONFIG.url) {
        return;
    }

    const urlParts = parseUrl(CONFIG.url);
    if (!urlParts) {
        return;
    }

    const payload = JSON.stringify(logEntry);

    const options = {
        hostname: urlParts.hostname,
        port: urlParts.port,
        path: urlParts.path,
        method: 'POST',
        timeout: CONFIG.timeout,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...(CONFIG.apiKey && { 'Authorization': `Bearer ${CONFIG.apiKey}` })
        }
    };

    // Fire-and-forget request
    const req = urlParts.protocol.request(options, (res) => {
        // Consume response to free up resources
        res.resume();
    });

    // Handle errors silently - NEVER throw or affect the main app
    req.on('error', () => {
        // Silently ignore - log analyzer is optional
    });

    req.on('timeout', () => {
        req.destroy();
    });

    // Send the payload
    req.write(payload);
    req.end();
}

/**
 * Send batch of logs (for high-volume scenarios)
 */
function sendBatch(logs) {
    if (!CONFIG.enabled || !CONFIG.url || logs.length === 0) {
        return;
    }

    const urlParts = parseUrl(CONFIG.url);
    if (!urlParts) {
        return;
    }

    const payload = JSON.stringify({ logs });

    const options = {
        hostname: urlParts.hostname,
        port: urlParts.port,
        path: urlParts.path.replace('/ingest', '/ingest/batch'),
        method: 'POST',
        timeout: CONFIG.timeout,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...(CONFIG.apiKey && { 'Authorization': `Bearer ${CONFIG.apiKey}` })
        }
    };

    const req = urlParts.protocol.request(options, (res) => {
        res.resume();
    });

    req.on('error', () => { });
    req.on('timeout', () => req.destroy());

    req.write(payload);
    req.end();
}

/**
 * Flush queued logs
 */
function flushQueue() {
    if (logQueue.length === 0) return;

    const logsToSend = logQueue.splice(0, logQueue.length);
    sendBatch(logsToSend);
}

/**
 * Schedule queue flush
 */
function scheduleFlush() {
    if (flushTimeout) return;

    flushTimeout = setTimeout(() => {
        flushQueue();
        flushTimeout = null;
    }, CONFIG.batchFlushInterval);
}

/**
 * Create a log entry with the mandatory format
 */
function createLogEntry(level, message, meta = {}) {
    return {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        service: CONFIG.serviceName,
        route: meta.route || null,
        message: String(message),
        meta: {
            userId: meta.userId || null,
            requestId: meta.requestId || null,
            ...meta
        }
    };
}

// ============================================================
// Public API
// ============================================================

const logAdapter = {
    /**
     * Log an error message
     * @param {string} message - Human-readable error message
     * @param {object} meta - Optional metadata (route, userId, requestId, etc.)
     */
    error(message, meta = {}) {
        try {
            const entry = createLogEntry('ERROR', message, meta);
            setImmediate(() => sendLog(entry));
        } catch (e) {
            // Never throw - silently ignore
        }
    },

    /**
     * Log a warning message
     * @param {string} message - Human-readable warning message
     * @param {object} meta - Optional metadata
     */
    warn(message, meta = {}) {
        try {
            const entry = createLogEntry('WARN', message, meta);
            setImmediate(() => sendLog(entry));
        } catch (e) {
            // Never throw
        }
    },

    /**
     * Log an info message
     * @param {string} message - Human-readable info message
     * @param {object} meta - Optional metadata
     */
    info(message, meta = {}) {
        try {
            const entry = createLogEntry('INFO', message, meta);
            setImmediate(() => sendLog(entry));
        } catch (e) {
            // Never throw
        }
    },

    /**
     * Log a debug message (only sent if DEBUG level is enabled)
     * @param {string} message - Debug message
     * @param {object} meta - Optional metadata
     */
    debug(message, meta = {}) {
        try {
            const entry = createLogEntry('DEBUG', message, meta);
            setImmediate(() => sendLog(entry));
        } catch (e) {
            // Never throw
        }
    },

    /**
     * Queue a log for batch sending (more efficient for high-volume)
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {object} meta - Optional metadata
     */
    queue(level, message, meta = {}) {
        try {
            const entry = createLogEntry(level, message, meta);
            logQueue.push(entry);

            if (logQueue.length >= CONFIG.batchSize) {
                flushQueue();
            } else {
                scheduleFlush();
            }
        } catch (e) {
            // Never throw
        }
    },

    /**
     * Flush any queued logs immediately
     */
    flush() {
        try {
            flushQueue();
        } catch (e) {
            // Never throw
        }
    },

    /**
     * Check if the adapter is enabled and configured
     * @returns {boolean}
     */
    isEnabled() {
        return CONFIG.enabled && !!CONFIG.url;
    },

    /**
     * Get current configuration (for debugging)
     * @returns {object}
     */
    getConfig() {
        return {
            enabled: CONFIG.enabled,
            configured: !!CONFIG.url,
            serviceName: CONFIG.serviceName,
            timeout: CONFIG.timeout
        };
    }
};

// ============================================================
// Express Middleware (Optional)
// ============================================================

/**
 * Express middleware that automatically logs requests
 * Use: app.use(logAdapter.middleware())
 */
logAdapter.middleware = function (options = {}) {
    const { logLevel = 'info', skipPaths = [] } = options;

    return function (req, res, next) {
        // Skip certain paths
        if (skipPaths.some(p => req.path.startsWith(p))) {
            return next();
        }

        const startTime = Date.now();

        // Log after response
        res.on('finish', () => {
            try {
                const duration = Date.now() - startTime;
                const level = res.statusCode >= 500 ? 'error' :
                    res.statusCode >= 400 ? 'warn' : logLevel;

                const message = `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;

                logAdapter[level](message, {
                    route: req.path,
                    method: req.method,
                    statusCode: res.statusCode,
                    duration,
                    userId: req.user?.id || null,
                    requestId: req.headers['x-request-id'] || null
                });
            } catch (e) {
                // Never throw
            }
        });

        next();
    };
};

// ============================================================
// Graceful Shutdown
// ============================================================

// Flush logs before process exits
process.on('beforeExit', () => {
    try {
        flushQueue();
    } catch (e) {
        // Ignore
    }
});

module.exports = logAdapter;
