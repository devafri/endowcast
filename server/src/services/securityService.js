const axios = require('axios');

class SecurityService {
  constructor() {
    this.recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    this.suspiciousPatterns = [
      /^\d+@\d+\.\w+$/,  // Numbers only in email
      /^[a-zA-Z]+\d+@/,  // Sequential pattern
      /test.*test/i,      // Test accounts
      /spam|bot|fake/i,   // Obvious spam
    ];
  }

  /**
   * Verify reCAPTCHA v2 token
   */
  async verifyRecaptcha(token, remoteIp = null) {
    if (!this.recaptchaSecret) {
      console.warn('reCAPTCHA secret not configured');
      return { success: false, error: 'reCAPTCHA not configured' };
    }

    if (!token) {
      return { success: false, error: 'reCAPTCHA token required' };
    }

    try {
      const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        params: {
          secret: this.recaptchaSecret,
          response: token,
          remoteip: remoteIp
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      const { success, score, action, 'error-codes': errorCodes } = response.data;

      if (!success) {
        console.log('reCAPTCHA verification failed:', errorCodes);
        return { 
          success: false, 
          error: 'reCAPTCHA verification failed',
          errorCodes 
        };
      }

      // For reCAPTCHA v3, check score (v2 doesn't have score)
      if (score !== undefined && score < 0.5) {
        console.log('reCAPTCHA score too low:', score);
        return { 
          success: false, 
          error: 'Suspicious activity detected',
          score 
        };
      }

      return { 
        success: true, 
        score, 
        action,
        message: 'reCAPTCHA verified successfully' 
      };

    } catch (error) {
      console.error('reCAPTCHA verification error:', error.message);
      return { 
        success: false, 
        error: 'reCAPTCHA service unavailable',
        details: error.message 
      };
    }
  }

  /**
   * Detect suspicious registration patterns
   */
  detectSuspiciousActivity(email, firstName, lastName, organization, userAgent, ip) {
    const suspiciousSignals = [];

    // Check email patterns
    const emailPattern = this.suspiciousPatterns.find(pattern => pattern.test(email));
    if (emailPattern) {
      suspiciousSignals.push('suspicious_email_pattern');
    }

    // Check if email domain is suspicious
    const domain = email.split('@')[1]?.toLowerCase();
    const suspiciousDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'throwaway.email', 'temp-mail.org'
    ];
    if (suspiciousDomains.includes(domain)) {
      suspiciousSignals.push('temporary_email_domain');
    }

    // Check for obvious fake names
    const fakeName = /^(test|fake|spam|bot|admin|null|undefined)$/i;
    if (fakeName.test(firstName) || fakeName.test(lastName)) {
      suspiciousSignals.push('fake_name');
    }

    // Check for repeated characters (bots often do this)
    const repeatedChars = /(.)\1{4,}/;
    if (repeatedChars.test(firstName) || repeatedChars.test(lastName)) {
      suspiciousSignals.push('repeated_characters');
    }

    // Check user agent (if provided)
    if (userAgent) {
      const botUserAgents = /bot|crawler|spider|scraper|curl|wget|python|java/i;
      if (botUserAgents.test(userAgent)) {
        suspiciousSignals.push('bot_user_agent');
      }
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(suspiciousSignals);

    return {
      suspicious: suspiciousSignals.length > 0,
      signals: suspiciousSignals,
      riskScore,
      recommendation: this.getRiskRecommendation(riskScore)
    };
  }

  calculateRiskScore(signals) {
    const weights = {
      'suspicious_email_pattern': 30,
      'temporary_email_domain': 40,
      'fake_name': 25,
      'repeated_characters': 20,
      'bot_user_agent': 35
    };

    return signals.reduce((score, signal) => score + (weights[signal] || 10), 0);
  }

  getRiskRecommendation(score) {
    if (score >= 50) return 'block';
    if (score >= 25) return 'manual_review';
    return 'allow';
  }

  /**
   * Rate limiting helper
   */
  generateRateLimitKey(type, identifier) {
    return `rate_limit:${type}:${identifier}`;
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const issues = [];

    if (password.length < 8) {
      issues.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      issues.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      issues.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      issues.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push('Password must contain at least one special character');
    }

    // Common passwords check
    const commonPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      issues.push('Password is too common');
    }

    // Check for repeated patterns
    if (/(.{3,})\1/.test(password)) {
      issues.push('Password contains repeated patterns');
    }

    return {
      valid: issues.length === 0,
      issues,
      strength: this.calculatePasswordStrength(password)
    };
  }

  calculatePasswordStrength(password) {
    let score = 0;

    // Length bonus
    score += Math.min(password.length * 2, 20);

    // Character variety
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;

    // Penalty for patterns
    if (/(.)\1{2,}/.test(password)) score -= 10;
    if (/123|abc|qwe/i.test(password)) score -= 10;

    if (score < 30) return 'weak';
    if (score < 60) return 'medium';
    return 'strong';
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length = 32) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash IP address for privacy-compliant logging
   */
  hashIpAddress(ip) {
    const crypto = require('crypto');
    const salt = process.env.IP_SALT || 'endowcast-ip-salt';
    return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize input to prevent XSS
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }
}

module.exports = new SecurityService();
