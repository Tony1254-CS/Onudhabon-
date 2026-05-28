import defaultExport from '../dist/server/server.js';

export default async function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = `${protocol}://${host}${req.url}`;
  
  let body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }

  const webRequest = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: body
  });

  try {
    const webResponse = await defaultExport.fetch(webRequest);
    
    res.statusCode = webResponse.status;
    webResponse.headers.forEach((value, key) => {
      // Avoid duplicate set-cookie headers or header issues
      if (key.toLowerCase() === 'set-cookie') {
        res.setHeader(key, webResponse.headers.getSetCookie());
      } else {
        res.setHeader(key, value);
      }
    });

    const responseBody = await webResponse.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (error) {
    console.error('Error handling request:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
