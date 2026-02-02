'use strict';

const { Contract } = require('fabric-contract-api');

class VehicleContract extends Contract {
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

  async submitReport(ctx, reportId, vehicleId, eventType, location) {
    const reportExists = await this.reportExists(ctx, reportId);
    if (reportExists) {
      throw new Error(`Report with id ${reportId} already exists`);
    }

    const vehicleExists = await this.vehicleExists(ctx, vehicleId);
    if (!vehicleExists) {
      throw new Error(`Vehicle with id ${vehicleId} does not exist`);
    }

    const timestamp = ctx.stub.getTxTimestamp();
    const seconds = timestamp.seconds.low !== undefined ? timestamp.seconds.low : timestamp.seconds;
    const reportDate = new Date(seconds * 1000);

    const report = {
      reportId,
      vehicleId,
      eventType,
      location,
      timeStamp: reportDate.toISOString(),
      status: 'PENDING'
    };

    await ctx.stub.putState(reportId, Buffer.from(JSON.stringify(report)));

    const vehicleBytes = await ctx.stub.getState(vehicleId);
    const vehicle = JSON.parse(vehicleBytes.toString());
    vehicle.totalReports += 1;
    await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));

    return JSON.stringify(report);
  }

  async verifyReport(ctx, reportId, isValid) {
    const reportBytes = await ctx.stub.getState(reportId);
    if (!reportBytes || reportBytes.length === 0) {
      throw new Error(`Report with id ${reportId} does not exist`);
    }
    const report = JSON.parse(reportBytes.toString());

    if (report.status !== 'PENDING') {
      throw new Error(`Report with id ${reportId} has already been verified`);
    }

    const vehicleBytes = await ctx.stub.getState(report.vehicleId);
    if (!vehicleBytes || vehicleBytes.length === 0) {
      throw new Error(`Vehicle with id ${report.vehicleId} does not exist for this report`);
    }
    const vehicle = JSON.parse(vehicleBytes.toString());

    // Handle boolean input even if it comes as a string from CLI
    const isReportValid = (String(isValid) === 'true');

    if (isReportValid) {
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

  async reportExists(ctx, reportId) {
    const reportBytes = await ctx.stub.getState(reportId);
    return reportBytes && reportBytes.length > 0;
  }

  async vehicleExists(ctx, vehicleId) {
    const vehicleBytes = await ctx.stub.getState(vehicleId);
    return vehicleBytes && vehicleBytes.length > 0;
  }

  async getVehicle(ctx, vehicleId) {
    const vehicleBytes = await ctx.stub.getState(vehicleId);
    return vehicleBytes.toString();
  }
}

module.exports = VehicleContract;
