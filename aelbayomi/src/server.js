const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 3000; 
const publicDir = path.join(__dirname, '..', 'public');
const dataDir = path.join(__dirname, '..', 'data');


const allowedRoomTypes = ['Single', 'Double', 'Suite'];


class RoomService {
  constructor(filePath) {
    this.filePath = filePath;
  }

  getAllRooms() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error("Error reading rooms file:", err);
      return [];
    }
  }


  getRoomByType(roomType) {
    const rooms = this.getAllRooms();
    return rooms.find(room => room.type.toLowerCase() === roomType.toLowerCase());
  }
}


const roomService = new RoomService(path.join(dataDir, 'rooms.json'));


function serveStaticFile(filePath, contentType, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

// start the server and serve classes
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    serveStaticFile(path.join(publicDir, 'index.html'), 'text/html', res);
    return;
  }
 
  if (req.method === 'GET' && pathname === '/styles.css') {
    serveStaticFile(path.join(publicDir, 'styles.css'), 'text/css', res);
    return;
  }

 
  if (req.method === 'GET' && pathname === '/search') {
    const { roomType } = parsedUrl.query;
    if (!roomType) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Error</h1><p>Missing room type.</p>');
      return;
    }

   
    const room = roomService.getRoomByType(roomType);
    if (!room) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<h1>No ${roomType} rooms found</h1>
               <p><button onclick="window.history.back()">Back</button></p>`);
      return;
    }

    
    let html = `<h1>${room.name}</h1>
                <p>Type: ${room.type}</p>
                <p>Price: ${room.price}</p>`;
    if (room.description) {
      html += `<p>Description: ${room.description}</p>`;
    }

    html += `<h2>Book This Room</h2>
             <form method="POST" action="/book">
               <input type="hidden" name="roomId" value="${room.id}" />

               <label for="customerName">Your Name:</label>
               <input type="text" name="customerName" required/><br/><br/>

               <label for="roomType">Room Type:</label>
               <input type="text" name="roomType" value="${room.type}" readonly/><br/><br/>

               <label for="checkIn">Check-In Date:</label>
               <input type="date" name="checkIn" required/><br/><br/>

               <label for="checkOut">Check-Out Date:</label>
               <input type="date" name="checkOut" required/><br/><br/>

               <button type="submit">Confirm Booking</button>
             </form>
             <p><button onclick="window.history.back()">Back</button></p>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

 
  if (req.method === 'POST' && pathname === '/book') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      const postData = querystring.parse(body);
      const { roomId, customerName, roomType, checkIn, checkOut } = postData;

      
      if (!roomId || !customerName || !roomType || !checkIn || !checkOut) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>Missing booking information.</p>');
        return;
      }

     
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (checkInDate >= checkOutDate) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>Check-in must be before check-out.</p>');
        return;
      }

      
      if (!allowedRoomTypes.includes(roomType)) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>Invalid room type.</p>');
        return;
      }

    
      const bookingLine = `${roomId},${customerName},${roomType},${checkIn},${checkOut},${new Date().toISOString()}\n`;
      fs.appendFile(path.join(dataDir, 'bookings.csv'), bookingLine, (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Error</h1><p>Could not save booking.</p>');
          return;
        }
    
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h1>Booking Confirmed</h1>
                 <p>Your booking has been saved.</p>
                 <p><button onclick="window.history.back()">Back</button></p>`);
      });
    });
    return;
  }

  
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('<h1>404 Not Found</h1>');
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
