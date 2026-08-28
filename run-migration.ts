import handler from './api/migrate-income.js';
const req = { headers: { authorization: 'Bearer wy9p5q4Vm1_qGdBT' } };
const res = {
  status: (code) => ({
    json: (data) => { console.log("Status:", code); console.log("Data:", JSON.stringify(data, null, 2)); }
  })
};
process.env.CRON_SECRET = 'wy9p5q4Vm1_qGdBT';
handler(req, res);
