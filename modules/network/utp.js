/*

From https://github.com/mafintosh/utp

*/

const dgram = require('dgram')
const cyclist = require('cyclist')
const util = require('util')
const { EventEmitter } = require('events')
const { Duplex } = require('stream')
const bufferAlloc = require('buffer-alloc')

const EXTENSION = 0;
const VERSION = 1;
const UINT16 = 0xffff;
const ID_MASK = 0xf << 4;
const MTU = 1400;

const PACKET_DATA = 0 << 4;
const PACKET_FIN = 1 << 4;
const PACKET_STATE = 2 << 4;
const PACKET_RESET = 3 << 4;
const PACKET_SYN = 4 << 4;

const MIN_PACKET_SIZE = 20;
const DEFAULT_WINDOW_SIZE = 1 << 18;
const CLOSE_GRACE = 5000;

const BUFFER_SIZE = 512;

const uint32 = n => n >>> 0;

const uint16 = n => n & UINT16;

const timestamp = (() => {
  const offset = process.hrtime();
  const then = Date.now() * 1000;

  return () => {
    const diff = process.hrtime(offset);
    return uint32(then + 1000000 * diff[0] + ((diff[1] / 1000) | 0));
  };
})();

const bufferToPacket = buffer => {
  const packet = {};
  packet.id = buffer[0] & ID_MASK;
  packet.connection = buffer.readUInt16BE(2);
  packet.timestamp = buffer.readUInt32BE(4);
  packet.timediff = buffer.readUInt32BE(8);
  packet.window = buffer.readUInt32BE(12);
  packet.seq = buffer.readUInt16BE(16);
  packet.ack = buffer.readUInt16BE(18);
  packet.data = buffer.length > 20 ? buffer.slice(20) : null;
  return packet;
};

const packetToBuffer = packet => {
  const buffer = bufferAlloc(20 + (packet.data ? packet.data.length : 0));
  buffer[0] = packet.id | VERSION;
  buffer[1] = EXTENSION;
  buffer.writeUInt16BE(packet.connection, 2);
  buffer.writeUInt32BE(packet.timestamp, 4);
  buffer.writeUInt32BE(packet.timediff, 8);
  buffer.writeUInt32BE(packet.window, 12);
  buffer.writeUInt16BE(packet.seq, 16);
  buffer.writeUInt16BE(packet.ack, 18);
  if (packet.data) packet.data.copy(buffer, 20);
  return buffer;
};

const createPacket = ({
  _recvId,
  _sendId,
  _seq,
  _ack
}, id, data) => ({
  id,
  connection: id === PACKET_SYN ? _recvId : _sendId,
  seq: _seq,
  ack: _ack,
  timestamp: timestamp(),
  timediff: 0,
  window: DEFAULT_WINDOW_SIZE,
  data,
  sent: 0
});

class Connection extends Duplex {
  constructor(port, host, socket, syn) {
    super();
    const self = this;

    this.port = port;
    this.host = host;
    this.socket = socket;

    this._outgoing = cyclist(BUFFER_SIZE);
    this._incoming = cyclist(BUFFER_SIZE);
    this._closed = false;

    this._inflightPackets = 0;
    this._closed = false;
    this._alive = false;

    if (syn) {
      this._connecting = false;
      this._recvId = uint16(syn.connection + 1);
      this._sendId = syn.connection;
      this._seq = (Math.random() * UINT16) | 0;
      this._ack = syn.seq;
      this._synack = createPacket(this, PACKET_STATE, null);

      this._transmit(this._synack);
    } else {
      this._connecting = true;
      this._recvId = 0; // tmp value for v8 opt
      this._sendId = 0; // tmp value for v8 opt
      this._seq = (Math.random() * UINT16) | 0;
      this._ack = 0;
      this._synack = null;

      socket.on('listening', () => {
        self._recvId = socket.address().port; // using the port gives us system wide clash protection
        self._sendId = uint16(self._recvId + 1);
        self._sendOutgoing(createPacket(self, PACKET_SYN, null));
      });

      socket.on('error', err => {
        self.emit('error', err);
      });

      socket.bind();
    }

    const resend = setInterval(this._resend.bind(this), 500);
    const keepAlive = setInterval(this._keepAlive.bind(this), 10 * 1000);
    let tick = 0;

    const closed = () => {
      if (++tick === 2) self._closing();
    };

    const sendFin = () => {
      if (self._connecting) return self.once('connect', sendFin);
      self._sendOutgoing(createPacket(self, PACKET_FIN, null));
      self.once('flush', closed);
    };

    this.once('finish', sendFin);
    this.once('close', () => {
      if (!syn) setTimeout(socket.close.bind(socket), CLOSE_GRACE);
      clearInterval(resend);
      clearInterval(keepAlive);
    });
    this.once('end', () => {
      process.nextTick(closed);
    });
  }

  setTimeout() {
    // TODO: impl me
  }

  destroy() {
    this.end();
  }

  address() {
    return {
      port: this.port,
      address: this.host
    };
  }

  _read() {
    // do nothing...
  }

  _write(data, enc, callback) {
    if (this._connecting) return this._writeOnce('connect', data, enc, callback);

    while (this._writable()) {
      const payload = this._payload(data);

      this._sendOutgoing(createPacket(this, PACKET_DATA, payload));

      if (payload.length === data.length) return callback();
      data = data.slice(payload.length);
    }

    this._writeOnce('flush', data, enc, callback);
  }

  _writeOnce(event, data, enc, callback) {
    this.once(event, function () {
      this._write(data, enc, callback);
    });
  }

  _writable() {
    return this._inflightPackets < BUFFER_SIZE - 1;
  }

  _payload(data) {
    if (data.length > MTU) return data.slice(0, MTU);
    return data;
  }

  _resend() {
    const offset = this._seq - this._inflightPackets;
    const first = this._outgoing.get(offset);
    if (!first) return;

    const timeout = 500000;
    const now = timestamp();

    if (uint32(first.sent - now) < timeout) return;

    for (let i = 0; i < this._inflightPackets; i++) {
      const packet = this._outgoing.get(offset + i);
      if (uint32(packet.sent - now) >= timeout) this._transmit(packet);
    }
  }

  _keepAlive() {
    if (this._alive) return this._alive = false;
    this._sendAck();
  }

  _closing() {
    if (this._closed) return;
    this._closed = true;
    process.nextTick(this.emit.bind(this, 'close'));
  }

  // packet handling

  _recvAck(ack) {
    const offset = this._seq - this._inflightPackets;
    const acked = uint16(ack - offset) + 1;

    if (acked >= BUFFER_SIZE) return; // sanity check

    for (let i = 0; i < acked; i++) {
      this._outgoing.del(offset + i);
      this._inflightPackets--;
    }

    if (!this._inflightPackets) this.emit('flush');
  }

  _recvIncoming(packet) {
    if (this._closed) return;

    if (packet.id === PACKET_SYN && this._connecting) {
      this._transmit(this._synack);
      return;
    }
    if (packet.id === PACKET_RESET) {
      this.push(null);
      this.end();
      this._closing();
      return;
    }
    if (this._connecting) {
      if (packet.id !== PACKET_STATE) return this._incoming.put(packet.seq, packet);

      this._ack = uint16(packet.seq - 1);
      this._recvAck(packet.ack);
      this._connecting = false;
      this.emit('connect');

      packet = this._incoming.del(packet.seq);
      if (!packet) return;
    }

    if (uint16(packet.seq - this._ack) >= BUFFER_SIZE) return this._sendAck(); // old packet

    this._recvAck(packet.ack); // TODO: other calcs as well

    if (packet.id === PACKET_STATE) return;
    this._incoming.put(packet.seq, packet);

    while (packet = this._incoming.del(this._ack + 1)) {
      this._ack = uint16(this._ack + 1);

      if (packet.id === PACKET_DATA) this.push(packet.data);
      if (packet.id === PACKET_FIN) this.push(null);
    }

    this._sendAck();
  }

  _sendAck() {
    this._transmit(createPacket(this, PACKET_STATE, null)); // TODO: make this delayed
  }

  _sendOutgoing(packet) {
    this._outgoing.put(packet.seq, packet);
    this._seq = uint16(this._seq + 1);
    this._inflightPackets++;
    this._transmit(packet);
  }

  _transmit(packet) {
    packet.sent = packet.sent === 0 ? packet.timestamp : timestamp();
    const message = packetToBuffer(packet);
    this._alive = true;
    this.socket.send(message, 0, message.length, this.port, this.host);
  }
}

class Server extends EventEmitter {
  constructor() {
    super();
    this._socket = null;
    this._connections = {};
  }

  address() {
    return this._socket.address();
  }

  listenSocket(socket, onlistening) {
    this._socket = socket;

    const connections = this._connections;
    const self = this;

    socket.on('message', (message, {
      address,
      port
    }) => {
      if (message.length < MIN_PACKET_SIZE) return;
      const packet = bufferToPacket(message);
      const id = `${address}:${packet.id === PACKET_SYN ? uint16(packet.connection+1) : packet.connection}`;

      if (connections[id]) return connections[id]._recvIncoming(packet);
      if (packet.id !== PACKET_SYN || self._closed) return;

      connections[id] = new Connection(port, address, socket, packet);
      connections[id].on('close', () => {
        delete connections[id];
      });

      self.emit('connection', connections[id]);
    });

    socket.once('listening', () => {
      self.emit('listening');
    });

    if (onlistening) self.once('listening', onlistening);
  }

  listen(port, onlistening) {
    if (typeof port === 'object' && typeof port.on === 'function') return this.listenSocket(port, onlistening);
    const socket = dgram.createSocket('udp4');
    this.listenSocket(socket, onlistening);
    socket.bind(port);
  }

  close(cb) {
    const self = this;
    let openConnections = 0;
    this._closed = true;

    function onClose() {
      if (--openConnections === 0) {
        if (self._socket) self._socket.close();
        if (cb) cb();
      }
    }

    for (const id in this._connections) {
      if (this._connections[id]._closed) continue;
      openConnections++;
      this._connections[id].once('close', onClose);
      this._connections[id].end();
    }
  }
}

exports.createServer = (onconnection) => {
  const server = new Server();
  if (onconnection) server.on('connection', onconnection);
  return server;
}

exports.connect = (port, host) => {
  const socket = dgram.createSocket('udp4');
  const connection = new Connection(port, host || '127.0.0.1', socket, null);

  socket.on('message', message => {
    if (message.length < MIN_PACKET_SIZE) return;
    const packet = bufferToPacket(message);

    if (packet.id === PACKET_SYN) return;
    if (packet.connection !== connection._recvId) return;

    connection._recvIncoming(packet);
  });

  return connection;
}