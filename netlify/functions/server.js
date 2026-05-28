import defaultExport from '../../dist/server/server.js';

export async function handler(req, context) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const url = `${protocol}://${host}${req.path}${req.queryStringParameters ? '?' + new URLSearchParams(req.queryStringParameters).toString() : ''}`;
  
  let body = null;
  if (req.httpMethod !== 'GET' && req.httpMethod !== 'HEAD' && req.body) {
    body = req.isBase64Encoded ? Buffer.from(req.body, 'base64') : req.body;
  }

  const webRequest = new Request(url, {
    method: req.httpMethod,
    headers: req.headers,
    body: body
  });

  try {
    const webResponse = await defaultExport.fetch(webRequest);
    
    const headers = {};
    webResponse.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const responseBody = await webResponse.arrayBuffer();
    
    return {
      statusCode: webResponse.status,
      headers: headers,
      body: Buffer.from(responseBody).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error handling request:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error'
    };
  }
}
