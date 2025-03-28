// Auto-import this file by doing `node -r helpers/js_helper.js your_script.js`.
// It will make the `readline` function available in your script and maintain parity with Codingame.

// This code helps circumvent the `ReferenceError: readline is not defined` error

const fs = require("fs");
// Variable used to store the remain of stdin (happen if several lines have been read at once by getStdin)
let stdin = "";
// File descriptor for stdin
let fd = null;
// Read stdin until endByte of end of file is reached
// Beware that endByte is not necessarly the last character!
function getStdin(endByte) {
    const BUFSIZE = 256;
    let buf = Buffer.allocUnsafe(BUFSIZE);
    let totalBuf = Buffer.allocUnsafe(0);
    let bytesRead;
    let endBytePos;
    if (fd === null) {
        fd = process.stdin.fd;
    }
    do {
        bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
        totalBuf = Buffer.concat([totalBuf, buf], totalBuf.length + bytesRead);
        endBytePos = buf.indexOf(endByte);
    } while (bytesRead > 0 && (endBytePos < 0 || endBytePos >= bytesRead));
    return totalBuf;
}

global.readline = function readline() {
    if (stdin.indexOf("\n") === -1) {
        stdin = stdin + getStdin("\n".charCodeAt(0)).toString("utf-8");
    }
    // If still empty then EOF reached. Return null to keep the same behaviour as SpiderMonkey.
    if (stdin.length === 0) {
        return null;
    }
    // At this point, either stdin contains '\n' or it's the end of the file: we have something to return
    const newline = stdin.indexOf("\n");
    if (newline !== -1) {
        const line = stdin.slice(0, newline);
        stdin = stdin.slice(newline + 1);
        return line;
    } else {
        const line = stdin;
        stdin = "";
        return line;
    }
};
