var Readable = require('stream').Readable,
util = require('util');

util.inherits(ReadStream, Readable);

/**
 * GridFS ReadStream
 *
 * Returns a stream interface for the **file**.
 *
 * Events
 *  - **readable** {function() {}} the readable event fires when a document is ready.
 *  - **data** {function(item) {}} the data event fires when a document is a available.
 *  - **end** {function() {}} the end event fires when there are no more documents.
 *  - **close** {function() {}} the close event fires when the underlying file has been closed, or we will no longer access it, though the stream itself may still contain documents to be retrieved.
 *  - **error** {function(err) {}} the error event triggers in the case of an error.
 *
 * @class Represents a GridFS File Stream.
 * @param {Boolean} autoclose automatically close the file when the stream reaches the end.
 * @param {GrisStore} cursor a cursor object that the stream wraps.
 * @return {ReadStream}
 */
function ReadStream(autoclose, gstore) {
  Readable.call(this, { objectMode: true });

  this.autoclose = autoclose != null ? autoclose : false;
  this.gstore = gstore;

  // The total number of chunks
  this.numberOfChunks = Math.ceil(gstore.length/gstore.chunkSize);
  this.currentChunkNumber = gstore.currentChunk.chunkNumber;

  // The seek start position inside the current chunk
  this.seekStartPosition = gstore.position - (this.currentChunkNumber * gstore.chunkSize);

  this._destroyed = null;
  this._closed = null;
  this.lastRead = -1;
};


/**
 * @ignore
 * @api private
 */
ReadStream.prototype._advance = function(callback) {
  if (this._destroyed || this._closed) return;

  // do we need to advance?
  if (this.lastRead != this.currentChunkNumber) {
    callback(null);
    return;
  }

  // set up the object for a new read, advance by one chunk
  var self = this;
  this.currentChunkNumber++;
  this.gstore._nthChunk(this.currentChunkNumber, function(err, chunk) {
    if (err) callback(err);
    else {
      self.gstore.currentChunk = chunk;
      callback(null);
    }
  });
}

/**
 * @ignore
 * @api private
 */
ReadStream.prototype._readChunk = function(callback) {
  if (this._destroyed || this._closed) return;

  var gstore = this.gstore;
  var data = null;
  var self = this;

  // first try to advance
  this._advance(function(err) {
    if (err) callback(err, null);
    else {
      // Read a slice from the current chunk
      if (self.seekStartPosition > 0 && gstore.currentChunk.length() > self.seekStartPosition) {
        data = gstore.currentChunk.readSlice(gstore.currentChunk.length() - self.seekStartPosition);
        self.seekStartPosition = 0;
      } else {
        data = gstore.currentChunk.readSlice(gstore.currentChunk.length());
      }
      self.lastRead = self.currentChunkNumber;
      callback(null, data);
    }
  });
}

ReadStream.prototype._read = function() {
  if (this._destroyed || this._closed) return;

  if (this.currentChunkNumber > this.numberOfChunks) return;

  // get a chunk.
  var self = this;
  this._readChunk(function(err, data) {
    if (err != null) return self.destroy(err);
    else {
      // if it's null... why?  
      // if it's not null, push it.
      if (data != null) self.push(data);

      // if we are at the end, push null and shutdown
      if (self.currentChunkNumber >= self.numberOfChunks) {
        self._shutdown();
      }
    }
  });
}

/** 
 * Close the stream, push no more data, but allow any unconsumed data to be consumed.
 * @ignore
 * @api private
 */
ReadStream.prototype._shutdown = function(err) {
  if (this._closed) return;
  this._closed = true;

  if (err) this.emit('error', err);
  this.push(null);

  // if autoclose, close underlying file
  var self = this;
  if (this.autoclose) {
    if(self.gstore.mode[0] == "w") {
      self.gstore.close(function(err, doc) {
        if (err) self.emit("error", err);
	self.emit('close', doc); // why this doc here?
      });
    } else {
      self.emit('close');
    }
  } else {
    self.emit('close');
  }
};


/**
 * Kill the stream now, stop emitting 'data'/'readable' events. Close underlying file if autoclose.
 *
 * @param {err} err an error object.
 * @return {null}
 * @api public
 */
ReadStream.prototype.destroy = function(err) {
  if (this._destroyed) return;
  this._destroyed = true;

  this.pause();
  this._shutdown(err);
};

exports.ReadStream = ReadStream;
