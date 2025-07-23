const {sql, poolPromise} = require('../config/dbConfig')
const tf = require('@tensorflow/tfjs-node'); 


let model ; 
async function loadModel() {
  try {
    model = await tf.loadLayersModel('file://model/labour-salary-model/model.json');
    console.log('✅ Model loaded successfully');
  } catch (err) {
    console.error('❌ Failed to load model:', err);
  }
}

async function prediectSalaryMatrix(labourI){
    const pool = await poolPromise;
    
}
