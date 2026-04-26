

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

function formatLog(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };

  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(logEntry);
  } else {
    return `[${timestamp}] [${level}] ${message}${Object.keys(data).length > 0 ? ' ' + JSON.stringify(data, null, 2) : ''}`;
  }
}

export function logError(message, error = null, context = {}) {
  const errorData = {
    ...context,
    error: error ? {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    } : null
  };
  console.error(formatLog(LOG_LEVELS.ERROR, message, errorData));
}

export function logWarn(message, data = {}) {
  console.warn(formatLog(LOG_LEVELS.WARN, message, data));
}

export function logInfo(message, data = {}) {
  console.log(formatLog(LOG_LEVELS.INFO, message, data));
}

export function logDebug(message, data = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(formatLog(LOG_LEVELS.DEBUG, message, data));
  }
}

export function logRequest(req, res, responseTime = null) {
  const data = {
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    statusCode: res.statusCode,
    userId: req.user?.id || null,
    userRole: req.user?.role || null
  };

  if (responseTime !== null) {
    data.responseTime = `${responseTime}ms`;
  }

  const level = res.statusCode >= 500 ? LOG_LEVELS.ERROR : 
                res.statusCode >= 400 ? LOG_LEVELS.WARN : 
                LOG_LEVELS.INFO;

  const message = `${req.method} ${req.path} ${res.statusCode}`;
  console.log(formatLog(level, message, data));
}

export function logSecurity(activity, req, details = {}) {
  const data = {
    activity,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || null,
    path: req.path,
    method: req.method,
    ...details
  };
  console.warn(formatLog(LOG_LEVELS.WARN, `[SECURITY] ${activity}`, data));
}

export function logDatabase(operation, table, details = {}) {
  const data = {
    operation,
    table,
    ...details
  };
  logInfo(`[DB] ${operation} on ${table}`, data);
}
