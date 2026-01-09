'use strict';

const { Contract } = require('fabric-contract-api');

class vehicleContract extends Contract {
  async registerVehicle(ctx,vehicleId){
    const exists = await this.vehicleExists(ctx,vehicleId);

    if(exists){
      throw new Error(`Vehicle with the id : ${vehicleId} already exists`);
    }

    const vehicle = {
      vehcileId,
      reputation : 50,
      totalReports : 0,
      falseReports : 0
    }

    await ctx.stub.putState(vehicleId,Buffer.from(JSON.stringify(vehicle)));

    return JSON.stringify(vehicle);
  }

  async submitReport(ctx,reportId,vehicleId,eventType,location){
    const report = {
      reportId,
      vehcileId,
      eventType,
      location,
      timeStamp : new Date().toISOString(),
      status : 'PENDING'
    };

    await ctx.stub.putState(reportId,Buffer.from(JSON.stringify(report)));

    const vehicleBytes = await ctx.stub.getState(vehicleId);

    const vehicle = JSON.parse(vehicleBytes.toString());

    vehicle.totalReports += 1;

    await ctx.stub.putState(vehicleId,Buffer.from(JSON.stringify(vehicle)));

    return JSON.stringify(report);
  }

  async verifyReport(ctx,reportId,isValid){
    const reportBytes = await ctx.stub.getState(reportId);

    const report = JSON.parse(reportBytes.toString());

    const vehicleBytes = await ctx.stub.getState(report.vehcileId);

    const vehicle = JSON.parse(vehicleBytes.toString());

    if(isValid){
      vehicle.reputation += 5;
      report.status='VALID';
    }else{
      vehicle.reputation -= 10;
      vehicle.falseReports += 1;
      report.status='FALSE';
    }

    await ctx.stub.putState(reportId,Buffer.from(JSON.stringify(report)));
    await ctx.stub.putState(report.vehcileId,Buffer.from(JSON.stringify(vehicle)));

    return JSON.stringify({vehicle,report});
  }
}