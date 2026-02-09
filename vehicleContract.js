'use strict';

const { Contract } = require('fabric-contract-api');

class VehicleContract extends Contract {
  
  // Proof of Authority - Initialize RSU (Road Side Unit) registry
  async initAuthorities(ctx) {
    const authoritiesKey = 'RSU_REGISTRY';
    const exists = await ctx.stub.getState(authoritiesKey);
    
    if (exists && exists.length > 0) {
      throw new Error('RSU registry already initialized');
    }
    
    // Get the identity of the transaction submitter (network admin)
    const clientIdentity = ctx.clientIdentity;
    const adminMSPID = clientIdentity.getMSPID();
    const adminID = clientIdentity.getID();
    
    const rsuRegistry = {
      rsus: {},
      count: 0,
      lastUpdated: new Date().toISOString()
    };
    
    await ctx.stub.putState(authoritiesKey, Buffer.from(JSON.stringify(rsuRegistry)));
    return JSON.stringify({ message: 'RSU registry initialized', rsuRegistry });
  }
  
  // Register a new RSU (Road Side Unit) as PoA validator
  async registerRSU(ctx, rsuId, rsuMSPID, location, latitude, longitude) {
    // Get caller identity
    const clientIdentity = ctx.clientIdentity;
    const callerID = clientIdentity.getID();
    const callerMSP = clientIdentity.getMSPID();
    
    const authoritiesKey = 'RSU_REGISTRY';
    const authoritiesBytes = await ctx.stub.getState(authoritiesKey);
    
    if (!authoritiesBytes || authoritiesBytes.length === 0) {
      throw new Error('RSU registry not initialized. Call initAuthorities first.');
    }
    
    const rsuRegistry = JSON.parse(authoritiesBytes.toString());
    
    // Check if RSU already exists
    if (rsuRegistry.rsus[rsuId]) {
      throw new Error(`RSU ${rsuId} already registered`);
    }
    
    // Register the RSU with location data
    rsuRegistry.rsus[rsuId] = {
      rsuId,
      mspID: rsuMSPID,
      identity: rsuId, // RSU identity for validation
      location,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      registeredAt: new Date().toISOString(),
      registeredBy: callerID,
      validationCount: 0,
      status: 'ACTIVE'
    };
    
    rsuRegistry.count += 1;
    rsuRegistry.lastUpdated = new Date().toISOString();
    
    await ctx.stub.putState(authoritiesKey, Buffer.from(JSON.stringify(rsuRegistry)));
    return JSON.stringify({ message: 'RSU registered successfully', rsu: rsuRegistry.rsus[rsuId] });
  }
  
  // Legacy function for backward compatibility
  async addAuthority(ctx, authorityMSPID, authorityID, location = 'Unknown', latitude = 0, longitude = 0) {
    return await this.registerRSU(ctx, authorityID, authorityMSPID, location, latitude, longitude);
  }
  
  // Deactivate an RSU
  async deactivateRSU(ctx, rsuId) {
    const authoritiesKey = 'RSU_REGISTRY';
    const authoritiesBytes = await ctx.stub.getState(authoritiesKey);
    
    if (!authoritiesBytes || authoritiesBytes.length === 0) {
      throw new Error('RSU registry not initialized');
    }
    
    const rsuRegistry = JSON.parse(authoritiesBytes.toString());
    
    if (!rsuRegistry.rsus[rsuId]) {
      throw new Error(`RSU ${rsuId} not found in registry`);
    }
    
    rsuRegistry.rsus[rsuId].status = 'INACTIVE';
    rsuRegistry.rsus[rsuId].deactivatedAt = new Date().toISOString();
    rsuRegistry.lastUpdated = new Date().toISOString();
    
    await ctx.stub.putState(authoritiesKey, Buffer.from(JSON.stringify(rsuRegistry)));
    return JSON.stringify({ message: 'RSU deactivated successfully', rsu: rsuRegistry.rsus[rsuId] });
  }
  
  // Legacy function
  async removeAuthority(ctx, authorityID) {
    return await this.deactivateRSU(ctx, authorityID);
  }
  
  // Check if caller is an active RSU
  async isAuthority(ctx) {
    const authoritiesKey = 'RSU_REGISTRY';
    const authoritiesBytes = await ctx.stub.getState(authoritiesKey);
    
    if (!authoritiesBytes || authoritiesBytes.length === 0) {
      return false;
    }
    
    const rsuRegistry = JSON.parse(authoritiesBytes.toString());
    const clientIdentity = ctx.clientIdentity;
    const callerID = clientIdentity.getID();
    
    // Check if caller matches any active RSU
    for (const rsuId in rsuRegistry.rsus) {
      const rsu = rsuRegistry.rsus[rsuId];
      if (rsu.identity === callerID && rsu.status === 'ACTIVE') {
        return true;
      }
    }
    
    return false;
  }
  
  // Get RSU ID from caller identity
  async getRSUFromCaller(ctx) {
    const authoritiesKey = 'RSU_REGISTRY';
    const authoritiesBytes = await ctx.stub.getState(authoritiesKey);
    
    if (!authoritiesBytes || authoritiesBytes.length === 0) {
      return null;
    }
    
    const rsuRegistry = JSON.parse(authoritiesBytes.toString());
    const clientIdentity = ctx.clientIdentity;
    const callerID = clientIdentity.getID();
    
    for (const rsuId in rsuRegistry.rsus) {
      const rsu = rsuRegistry.rsus[rsuId];
      if (rsu.identity === callerID && rsu.status === 'ACTIVE') {
        return rsu;
      }
    }
    
    return null;
  }
  
  // Require that the caller is an active RSU (throw error if not)
  async requireAuthority(ctx) {
    const isAuth = await this.isAuthority(ctx);
    if (!isAuth) {
      const callerID = ctx.clientIdentity.getID();
      throw new Error(`Unauthorized: ${callerID} is not an active RSU. Only registered RSUs can perform validation.`);
    }
  }
  
  // List all RSUs
  async listRSUs(ctx) {
    const authoritiesKey = 'RSU_REGISTRY';
    const authoritiesBytes = await ctx.stub.getState(authoritiesKey);
    
    if (!authoritiesBytes || authoritiesBytes.length === 0) {
      return JSON.stringify({ rsus: {}, count: 0, message: 'No RSUs registered' });
    }
    
    return authoritiesBytes.toString();
  }
  
  // Legacy function
  async listAuthorities(ctx) {
    return await this.listRSUs(ctx);
  }
  async registerVehicle(ctx, vehicleId) {
    const exists = await this.vehicleExists(ctx, vehicleId);
    if (exists) {
      throw new Error(`Vehicle with id ${vehicleId} already exists`);
    }

    const vehicle = {
      vehicleId,
      reputation: 50,
      totalReports: 0,
      falseReports: 0
    };

    await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
    return JSON.stringify(vehicle);
  }

  async submitReport(ctx, reportId, vehicleId, eventType, location, latitude, longitude) {
    // Check if vehicle exists
    const exists = await this.vehicleExists(ctx, vehicleId);
    if (!exists) {
      throw new Error(`Vehicle with id ${vehicleId} does not exist. Cannot submit report.`);
    }

    const report = {
      reportId,
      vehicleId,
      eventType,
      location,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timeStamp: new Date().toISOString(),
      status: 'PENDING',
      corroboratingReports: [] // List of report IDs that match this location
    };

    // PURE PoA: Check for similar reports (corroboration data for RSU reference only)
    // NO auto-validation - ALL reports must be validated by RSU to prevent Sybil/injection attacks
    const similarReports = await this.findSimilarReports(ctx, report);
    
    // Update vehicle total reports
    const vehicleBytes = await ctx.stub.getState(vehicleId);
    const vehicle = JSON.parse(vehicleBytes.toString());
    vehicle.totalReports += 1;
    
    // Store corroboration information for RSU to review
    if (similarReports.length > 0) {
      report.corroboratingReports = similarReports.map(r => r.reportId);
      report.corroborationCount = similarReports.length;
    } else {
      report.corroboratingReports = [];
      report.corroborationCount = 0;
    }
    
    // ALL reports stay PENDING until RSU validates them (Pure PoA)
    report.status = 'PENDING';
    
    await ctx.stub.putState(reportId, Buffer.from(JSON.stringify(report)));
    await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));

    return JSON.stringify({
      report,
      message: this.getStatusMessage(report, similarReports.length),
      securityNote: 'Pure PoA: All reports require RSU validation to prevent injection attacks'
    });
  }

  async verifyReport(ctx, reportId, isValid) {
    const reportBytes = await ctx.stub.getState(reportId);
    if (!reportBytes || reportBytes.length === 0) {
      throw new Error(`Report with id ${reportId} does not exist`);
    }

    const report = JSON.parse(reportBytes.toString());

    if (report.status !== 'PENDING') {
      throw new Error(`Report ${reportId} has already been verified`);
    }

    const vehicleBytes = await ctx.stub.getState(report.vehicleId);
    if (!vehicleBytes || vehicleBytes.length === 0) {
      throw new Error(`Vehicle ${report.vehicleId} associated with this report does not exist`);
    }
    const vehicle = JSON.parse(vehicleBytes.toString());

    // Handle boolean input from CLI (which might be passed as string)
    const isValidBool = (isValid === true || isValid === 'true');

    if (isValidBool) {
      vehicle.reputation += 5;
      report.status = 'VALID';
    } else {
      vehicle.reputation -= 10;
      vehicle.falseReports += 1;
      report.status = 'FALSE';
    }

    await ctx.stub.putState(reportId, Buffer.from(JSON.stringify(report)));
    await ctx.stub.putState(report.vehicleId, Buffer.from(JSON.stringify(vehicle)));

    return JSON.stringify({ vehicle, report });
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Find reports with similar location and event type
  async findSimilarReports(ctx, currentReport) {
    const DISTANCE_THRESHOLD_KM = 0.5; // 500 meters
    const TIME_WINDOW_MINUTES = 30; // Reports within 30 minutes
    
    const iterator = await ctx.stub.getStateByRange('', '');
    const similarReports = [];
    const currentTime = new Date(currentReport.timeStamp).getTime();

    while (true) {
      const result = await iterator.next();

      if (result.value && result.value.value.toString()) {
        const record = JSON.parse(result.value.value.toString());
        
        // Check if it's a report (has reportId and latitude/longitude)
        if (record.reportId && record.latitude !== undefined && record.reportId !== currentReport.reportId) {
          // Same event type
          if (record.eventType === currentReport.eventType) {
            // Check distance
            const distance = this.calculateDistance(
              currentReport.latitude,
              currentReport.longitude,
              record.latitude,
              record.longitude
            );
            
            // Check time window
            const reportTime = new Date(record.timeStamp).getTime();
            const timeDiffMinutes = Math.abs(currentTime - reportTime) / (1000 * 60);
            
            if (distance <= DISTANCE_THRESHOLD_KM && timeDiffMinutes <= TIME_WINDOW_MINUTES) {
              // Different vehicle (not self-corroboration)
              if (record.vehicleId !== currentReport.vehicleId) {
                similarReports.push(record);
              }
            }
          }
        }
      }

      if (result.done) {
        await iterator.close();
        break;
      }
    }

    return similarReports;
  }

  // Pure PoA validation - ONLY RSUs can validate reports (prevents Sybil/injection attacks)
  async validateReportByRSU(ctx, reportId, isValid) {
    // Require that the caller is an active RSU
    await this.requireAuthority(ctx);
    const rsu = await this.getRSUFromCaller(ctx);
    
    const reportBytes = await ctx.stub.getState(reportId);
    if (!reportBytes || reportBytes.length === 0) {
      throw new Error(`Report with id ${reportId} does not exist`);
    }

    const report = JSON.parse(reportBytes.toString());

    // Pure PoA: Only PENDING reports can be validated (no auto-validation)
    if (report.status !== 'PENDING') {
      throw new Error(`Report ${reportId} has already been validated (status: ${report.status})`);
    }

    const vehicleBytes = await ctx.stub.getState(report.vehicleId);
    const vehicle = JSON.parse(vehicleBytes.toString());

    const isValidBool = (isValid === true || isValid === 'true');

    if (isValidBool) {
      vehicle.reputation += 5;
      report.status = 'VALID';
      report.validatedBy = rsu.rsuId;
      report.validatedByLocation = rsu.location;
      report.validatedAt = new Date().toISOString();
    } else {
      vehicle.reputation -= 10;
      vehicle.falseReports += 1;
      report.status = 'FALSE';
      report.rejectedBy = rsu.rsuId;
      report.rejectedByLocation = rsu.location;
      report.rejectedAt = new Date().toISOString();
    }
    
    // Update RSU validation count
    const authoritiesKey = 'RSU_REGISTRY';
    const rsuRegistryBytes = await ctx.stub.getState(authoritiesKey);
    const rsuRegistry = JSON.parse(rsuRegistryBytes.toString());
    rsuRegistry.rsus[rsu.rsuId].validationCount += 1;
    rsuRegistry.rsus[rsu.rsuId].lastValidation = new Date().toISOString();
    await ctx.stub.putState(authoritiesKey, Buffer.from(JSON.stringify(rsuRegistry)));

    await ctx.stub.putState(reportId, Buffer.from(JSON.stringify(report)));
    await ctx.stub.putState(report.vehicleId, Buffer.from(JSON.stringify(vehicle)));

    return JSON.stringify({ 
      vehicle, 
      report,
      message: `Report ${isValidBool ? 'validated' : 'rejected'} by RSU: ${rsu.rsuId} at ${rsu.location}`
    });
  }
  
  // Legacy function
  async validateReportByAuthority(ctx, reportId, isValid) {
    return await this.validateReportByRSU(ctx, reportId, isValid);
  }

  // Legacy function for backwards compatibility - now requires RSU validation
  async verifyReport(ctx, reportId, isValid) {
    return await this.validateReportByRSU(ctx, reportId, isValid);
  }
  
  // Legacy function for backwards compatibility - now requires RSU validation
  async reviewPendingReport(ctx, reportId, isValid) {
    return await this.validateReportByRSU(ctx, reportId, isValid);
  }

  // Get all reports pending RSU validation (Pure PoA)
  async getPendingReports(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const pendingReports = [];

    while (true) {
      const result = await iterator.next();

      if (result.value && result.value.value.toString()) {
        const record = JSON.parse(result.value.value.toString());
        
        if (record.reportId && record.status === 'PENDING') {
          pendingReports.push(record);
        }
      }

      if (result.done) {
        await iterator.close();
        break;
      }
    }

    return JSON.stringify({
      count: pendingReports.length,
      reports: pendingReports,
      message: 'All reports require RSU validation (Pure PoA)'
    });
  }
  
  // Legacy function - redirects to getPendingReports
  async getReportsNeedingReview(ctx) {
    return await this.getPendingReports(ctx);
  }
  
  // Get pending reports with detailed corroboration info for RSU decision-making
  async getReportValidationInfo(ctx, reportId) {
    const reportBytes = await ctx.stub.getState(reportId);
    if (!reportBytes || reportBytes.length === 0) {
      throw new Error(`Report with id ${reportId} does not exist`);
    }
    
    const report = JSON.parse(reportBytes.toString());
    
    // Get vehicle reputation
    const vehicleBytes = await ctx.stub.getState(report.vehicleId);
    const vehicle = JSON.parse(vehicleBytes.toString());
    
    // Get corroborating reports details
    const corroboratingDetails = [];
    for (const corrobReportId of report.corroboratingReports || []) {
      const corrobBytes = await ctx.stub.getState(corrobReportId);
      if (corrobBytes && corrobBytes.length > 0) {
        const corrobReport = JSON.parse(corrobBytes.toString());
        
        // Get corroborating vehicle info
        const corrobVehicleBytes = await ctx.stub.getState(corrobReport.vehicleId);
        const corrobVehicle = corrobVehicleBytes ? JSON.parse(corrobVehicleBytes.toString()) : null;
        
        corroboratingDetails.push({
          reportId: corrobReport.reportId,
          vehicleId: corrobReport.vehicleId,
          vehicleReputation: corrobVehicle?.reputation || 0,
          vehicleFalseReports: corrobVehicle?.falseReports || 0,
          timestamp: corrobReport.timeStamp,
          status: corrobReport.status
        });
      }
    }
    
    return JSON.stringify({
      report,
      vehicleInfo: {
        vehicleId: vehicle.vehicleId,
        reputation: vehicle.reputation,
        totalReports: vehicle.totalReports,
        falseReports: vehicle.falseReports
      },
      corroboration: {
        count: report.corroborationCount || 0,
        details: corroboratingDetails
      },
      recommendation: this.getValidationRecommendation(report, vehicle, corroboratingDetails)
    });
  }
  
  // Helper to provide validation recommendation for RSUs
  getValidationRecommendation(report, vehicle, corroboratingDetails) {
    let score = 0;
    let reasons = [];
    
    // Vehicle reputation factor
    if (vehicle.reputation >= 70) {
      score += 2;
      reasons.push('High vehicle reputation (≥70)');
    } else if (vehicle.reputation < 30) {
      score -= 2;
      reasons.push('Low vehicle reputation (<30)');
    }
    
    // False reports history
    if (vehicle.falseReports > 3) {
      score -= 3;
      reasons.push('Vehicle has history of false reports (>3)');
    }
    
    // Corroboration factor
    if (corroboratingDetails.length >= 2) {
      // Check if corroborating vehicles are trustworthy
      const trustworthyCount = corroboratingDetails.filter(c => c.vehicleReputation >= 50 && c.vehicleFalseReports <= 2).length;
      if (trustworthyCount >= 2) {
        score += 3;
        reasons.push(`${trustworthyCount} trustworthy vehicles corroborate`);
      } else {
        score += 1;
        reasons.push(`${corroboratingDetails.length} corroborating reports (mixed reputation)`);
      }
    } else if (corroboratingDetails.length === 1) {
      score += 1;
      reasons.push('1 corroborating report');
    } else {
      score -= 1;
      reasons.push('No corroborating reports - isolated incident');
    }
    
    let recommendation = 'NEUTRAL';
    if (score >= 3) {
      recommendation = 'LIKELY VALID';
    } else if (score <= -2) {
      recommendation = 'LIKELY FALSE';
    }
    
    return {
      recommendation,
      confidence: recommendation,
      score,
      reasons,
      note: 'RSU has final authority - this is only a recommendation'
    };
  }

  // Get a specific report
  async getReport(ctx, reportId) {
    const reportBytes = await ctx.stub.getState(reportId);
    if (!reportBytes || reportBytes.length === 0) {
      throw new Error(`Report with id ${reportId} does not exist`);
    }
    return reportBytes.toString();
  }

  // Helper function to generate status messages
  // Helper function to generate status messages (Pure PoA model)
  getStatusMessage(report, similarCount) {
    if (report.status === 'VALID') {
      return `Report VALIDATED by RSU: ${report.validatedBy || 'Unknown'}`;
    } else if (report.status === 'FALSE') {
      return `Report REJECTED by RSU: ${report.rejectedBy || 'Unknown'}`;
    } else {
      // All reports are PENDING until RSU validates
      if (similarCount > 0) {
        return `Report PENDING RSU validation. Found ${similarCount} corroborating report(s) for RSU reference.`;
      } else {
        return `Report PENDING RSU validation. No corroborating reports found - possible isolated incident.`;
      }
    }
  }

  async vehicleExists(ctx, vehicleId) {
    const vehicleBytes = await ctx.stub.getState(vehicleId);
    return vehicleBytes && vehicleBytes.length > 0;
  }

  async getVehicle(ctx, vehicleId) {
    const vehicleBytes = await ctx.stub.getState(vehicleId);
    if (!vehicleBytes || vehicleBytes.length === 0) {
      throw new Error(`Vehicle with id ${vehicleId} does not exist`);
    }
    return vehicleBytes.toString();
  }
}

module.exports = VehicleContract;
