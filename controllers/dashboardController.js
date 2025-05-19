const { sql, poolPromise2 } = require('../config/dbConfig2');
const { poolPromise3 } = require('../config/dbConfig3');
const { poolPromise } = require('../config/dbConfig');
const path = require('path');
const fs = require('fs');
const axios = require('axios')
const multer = require('multer');
const { upload } = require('../server');
const xml2js = require('xml2js');
const labourModel = require('../models/insentiveModel');
const cron = require('node-cron');
const logger = require('../logger'); // Assuming logger is defined in logger.js   
const { createLogger, format, transports } = require('winston');
const { isHoliday } = require('../models/labourModel');
const xlsx = require('xlsx');
// const labourModel = require('../models/labourModel')


const getAllLaboursCount = async (req, res) => {
    const filters = req.query;
  
    try {
      const pool = await poolPromise;
      const request = pool.request();
  
      let query = `
        SELECT 
          status, 
          COUNT(*) AS count 
        FROM labourOnboarding 
        WHERE status IN ('Approved', 'Disable', 'Pending', 'Rejected', 'Resubmitted')
      `;
  
      // 🔍 Handle ProjectID filter (comma-separated)
      if (filters.ProjectID) {
        const projectIDs = filters.ProjectID.split(',').map(id => parseInt(id.trim())).filter(Boolean);
        if (projectIDs.length > 0) {
          const projectParams = projectIDs.map((val, idx) => {
            const param = `projectID${idx}`;
            request.input(param, val);
            return `@${param}`;
          });
          query += ` AND projectName IN (${projectParams.join(', ')})`;
        }
      }
  
      // 🔍 Add GROUP BY for aggregation
      query += ` GROUP BY status`;
  
      const result = await request.query(query);
  
      const statusCounts = {
        Approved: 0,
        Disable: 0,
        Pending: 0,
        Rejected: 0,
        Resubmitted: 0
      };
  
      result.recordset.forEach(row => {
        statusCounts[row.status] = row.count;
      });
  
      res.json({ success: true, data: statusCounts });
  
    } catch (err) {
      console.error('Error fetching labour counts:', err);
      res.status(500).send('Server error');
    }
  };
  

  const getAllWagesCount = async (req, res) => {
    const filters = req.query;
  
    try {
      const pool = await poolPromise;
      const request = pool.request();
  
      let query = `
        SELECT ApprovalStatusWages AS status, COUNT(*) AS count
        FROM [LabourMonthlyWages]
      `;
  
      const conditions = [];
  
      // Handle ProjectID filter (comma-separated)
      if (filters.ProjectID) {
        const projectIDs = filters.ProjectID.split(',').map(id => parseInt(id.trim())).filter(Boolean);
        if (projectIDs.length > 0) {
          const projectParams = projectIDs.map((val, idx) => {
            const param = `projectID${idx}`;
            request.input(param, val);
            return `@${param}`;
          });
          conditions.push(`ProjectName IN (${projectParams.join(', ')})`);
        }
      }
  
      // Add WHERE clause if there are conditions
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
  
      // Add GROUP BY
      query += ' GROUP BY ApprovalStatusWages';
  
      const result = await request.query(query);
  
      // Build a default object with all statuses initialized to 0
      const statusCounts = {
        Approved: 0,
        Pending: 0,
        Rejected : 0 
        
      };
  
      result.recordset.forEach(row => {
        statusCounts[row.status] = row.count;
      });
  
      res.json({ success: true, data: statusCounts });
  
    } catch (err) {
      console.error('Error fetching labour wages status count:', err);
      res.status(500).send('Server error');
    }
  };
  
  const getAllSiteTransferCount = async (req, res) => {
    const filters = req.query;
  
    try {
      const pool = await poolPromise;
      const request = pool.request();
  
      let query = `
        SELECT adminStatus AS status, COUNT(*) AS count
        FROM [dbo].[AdminSiteTransferApproval]
      `;
  
      const conditions = [];
  
      // Handle ProjectID filter (if "currentSite" or similar represents the project)
      if (filters.ProjectID) {
        const projectIDs = filters.ProjectID.split(',').map(id => parseInt(id.trim())).filter(Boolean);
        if (projectIDs.length > 0) {
          const projectParams = projectIDs.map((val, idx) => {
            const param = `projectID${idx}`;
            request.input(param, val);
            return `@${param}`;
          });
          conditions.push(`currentSite IN (${projectParams.join(', ')})`);
        }
      }
  
      // Add WHERE clause if any filter was added
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
  
      // Group by the correct column
      query += ' GROUP BY adminStatus';
  
      const result = await request.query(query);
  
      const statusCounts = {
        Approved: 0,
        Pending: 0,
        Rejected: 0,
      };
  
      result.recordset.forEach(row => {
        statusCounts[row.status] = row.count;
      });
  
      res.json({ success: true, data: statusCounts });
  
    } catch (err) {
      console.error('Error fetching site transfer status count:', err);
      res.status(500).send('Server error');
    }
  };
  
  const getAllVariablePayCount = async (req, res) => {
    const filters = req.query;
  
    try {
      const pool = await poolPromise;
      const request = pool.request();
  
      let query = `
        SELECT ApprovalStatusPay AS status, COUNT(*) AS count
        FROM [VariablePay]
      `;
  
      const conditions = [];
  
      // Handle ProjectID filter
      if (filters.ProjectID) {
        const projectIDs = filters.ProjectID.split(',').map(id => parseInt(id.trim())).filter(Boolean);
        if (projectIDs.length > 0) {
          const projectParams = projectIDs.map((val, idx) => {
            const param = `projectID${idx}`;
            request.input(param, val);
            return `@${param}`;
          });
          conditions.push(`currentSite IN (${projectParams.join(', ')})`);
        }
      }
  
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
  
      query += ' GROUP BY ApprovalStatusPay';
  
      const result = await request.query(query);
  
      const statusCounts = {
        Approved: 0,
        AdminPending: 0,
        Rejected: 0,
      };
  
      result.recordset.forEach(row => {
        statusCounts[row.status] = row.count;
      });
  
      res.json({ success: true, data: statusCounts });
  
    } catch (err) {
      console.error('Error fetching variable pay status count:', err);
      res.status(500).send('Server error');
    }
  };


  
  


module.exports={
    getAllLaboursCount,
    getAllWagesCount,
    getAllSiteTransferCount,
    getAllVariablePayCount,
}