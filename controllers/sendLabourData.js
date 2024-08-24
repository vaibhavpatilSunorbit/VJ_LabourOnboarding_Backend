
// module.exports = sendLaborData;
// employeeController.js
const axios = require('axios');
const xml2js = require('xml2js');

const addEmployee = async (req, res) => {
  const { APIKey, EmployeeCode, EmployeeName, CardNumber, SerialNumber, UserName, UserPassword, CommandId } = req.body;

  const xmlBuilder = new xml2js.Builder({ rootName: 'soap:Envelope', headless: true });
  const xmlRequest = xmlBuilder.buildObject({
    $: {
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
      'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/'
    },
    'soap:Body': {
      AddEmployee: {
        $: {
          xmlns: 'http://tempuri.org/'
        },
        APIKey: APIKey,
        EmployeeCode: EmployeeCode,
        EmployeeName: EmployeeName,
        CardNumber: CardNumber,
        SerialNumber: SerialNumber,
        UserName: UserName,
        UserPassword: UserPassword,
        CommandId: CommandId
      }
    }
  });

  try {
    const response = await axios.post('http://essl.vjerp.com:8530/iclock/WebAPIService.asmx', xmlRequest, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://tempuri.org/AddEmployee'
      }
    });

    const xmlResponse = response.data;
    xml2js.parseString(xmlResponse, { explicitArray: false }, (err, result) => {
      if (err) {
        return res.status(500).send('Error parsing XML response');
      }
      const addEmployeeResponse = result['soap:Envelope']['soap:Body']['AddEmployeeResponse'];
      res.send(addEmployeeResponse);
    });
  } catch (error) {
    res.status(500).send('Error calling web service: ' + error.message);
  }
};

module.exports = { addEmployee };
