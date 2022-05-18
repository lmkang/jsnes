var Mappers = {};

Mappers[0] = function() {
    
};

Mappers[0].prototype.load = function(nes) {
    var cpu = nes.cpu;
    var ppu = nes.ppu;
    var prgBuf = nes.prgBuf;
    var chrBuf = nes.chrBuf;
    // load PRG-ROM
    if(nes.prgCount > 1) {
        cpu.mem.set(prgBuf, 0x8000);
    } else {
        cpu.mem.set(prgBuf, 0x8000);
        cpu.mem.set(prgBuf, 0xc000);
    }
    // load CHR-ROM
    if(nes.chrCount > 0) {
        if(nes.chrCount > 1) {
            ppu.mem.set(chrBuf, 0x0000);
        } else {
            ppu.mem.set(chrBuf, 0x0000);
            ppu.mem.set(chrBuf, 0x1000);
        }
    } else {
        console.log('There are not any CHR-ROM banks');
    }
};

Mappers[2] = function() {
    
};

Mappers[2].prototype.load = function(nes) {
    var cpu = nes.cpu;
    var ppu = nes.ppu;
    var prgBuf = nes.prgBuf;
    var chrBuf = nes.chrBuf;
    console.log(nes.prgCount, nes.chrCount);
    // load PRG-ROM
    cpu.mem.set(prgBuf.subarray(0, 16384), 0x8000);
    // load CHR-ROM
    if(nes.chrCount > 0) {
        if(nes.chrCount > 1) {
            ppu.mem.set(chrBuf, 0x0000);
        } else {
            ppu.mem.set(chrBuf, 0x0000);
            ppu.mem.set(chrBuf, 0x1000);
        }
    } else {
        console.log('There are not any CHR-ROM banks');
    }
};

function NES() {
    
}

NES.prototype.load = function(buf) {
    if(buf[0] !== 0x4e
        || buf[1] !== 0x45
        || buf[2] !== 0x53
        || buf[3] !== 0x1a) {
        throw new Error('Not a valid nes');
    }
    
    // PRG-ROM count(16KB)
    this.prgCount = buf[4];
    // CHR-ROM count(8KB)
    this.chrCount = buf[5];
    // 0-horizontal, 1-vertical
    this.mirroring = buf[6] & 1 > 0 ? 1 : 0;
    this.batteryRAM = buf[6] & 2 > 0 ? 1 : 0;
    this.trainer = buf[6] & 4 > 0 ? 1 : 0;
    this.fourScreen = buf[6] & 8 > 0 ? 1 : 0;
    this.mapperType = (buf[6] >> 4) | (buf[7] & 0xf0);
    
    console.log('mirroring: ' + this.mirroring);
    console.log('batteryRAM: ' + this.batteryRAM);
    console.log('trainer: ' + this.trainer);
    console.log('fourScreen: ' + this.fourScreen);
    console.log('mapperType: ' + this.mapperType);
    
    var offset = 16;
    if(this.trainer) {
        offset += 512;
    }
    this.prgBuf = buf.slice(offset, offset + this.prgCount * 16384);
    offset += this.prgBuf.length;
    this.chrBuf = buf.slice(offset, offset + this.prgCount * 8192);
    
    this.mapper = new Mappers[this.mapperType]();
    this.mapper.load(this);
};

function httpGet(url, responseType, callback) {
    var xhr = new XMLHttpRequest();
    xhr.responseType = responseType;
    xhr.onload = function () {
        if(xhr.status === 200) {
            if(responseType == 'text') {
                callback(xhr.responseText);
            } else {
                callback(xhr.response);
            }
        } else {
            callback(null);
        }
    };
    xhr.open('get', url, true);
    xhr.send();
}

function checkResult(line, result) {
    var values = /([0-9A-F]{4})([\S\s]+?)A:([0-9A-F]+)\s+X:([0-9A-F]+)\s+Y:([0-9A-F]+)\s+P:([0-9A-F]+)\s+SP:([0-9A-F]+)\s+PPU:\s*([0-9,\s]+)\s+CYC:([0-9]+)/.exec(line);
    var addr = parseInt('0x' + values[1]);
    var strs = values[2].trim().split(' ');
    var inst = [];
    for(var i = 0; i < result.inst.length; i++) {
        inst.push(parseInt('0x' + strs[i]));
    }
    var a = parseInt('0x' + values[3]);
    var x = parseInt('0x' + values[4]);
    var y = parseInt('0x' + values[5]);
    var p = parseInt('0x' + values[6]);
    var sp = parseInt('0x' + values[7]);
    //var ppu = values[8].replace(/\s/g, '');
    var cyc = parseInt(values[9]);
    var err = {
        addr: addr !== result.addr,
        inst: false,
        A: a !== result.A,
        X: x !== result.X,
        Y: y !== result.Y,
        P: p !== result.P,
        SP: sp !== result.SP,
        //PPU: ppu !== result.ppu,
        CYC: cyc !== result.CYC
    };
    for(var i = 0; i < inst.length; i++) {
        if(inst[i] !== result.inst[i]) {
            err.inst = true;
            break;
        }
    }
    for(var i = 0, keys = Object.keys(err); i < keys.length; i++) {
        if(err[keys[i]]) {
            printResult(result, err);
            break;
        }
    }
    //printResult(result, err);
}

function printResult(result, err) {
    var inst = '';
    for(var i = 0; i < result.inst.length; i++) {
        inst +=  result.inst[i].toString(16).toUpperCase();
        if(i < result.inst.length - 1) {
            inst += ' ';
        }
    }
    var colors = [];
    for(var k in err) {
        colors.push(err[k] ? 'color: red' : 'color: black');
    }
    console.log(
        '%c' + result.addr.toString(16).toUpperCase() + '  '
        + '%c' + inst + '  '
        + '%cA:' + result.A.toString(16).toUpperCase() + '  '
        + '%cX:' + result.X.toString(16).toUpperCase() + '  '
        + '%cY:' + result.Y.toString(16).toUpperCase() + '  '
        + '%cP:' + result.P.toString(16).toUpperCase() + '  '
        + '%cSP:' + result.SP.toString(16).toUpperCase() + '  '
        + '%cCYC:' + result.CYC,
        ...colors
    );
}

var TABLE = [
    0x808080, 0x0000BB, 0x3700BF, 0x8400A6,
    0xBB006A, 0xB7001E, 0xB30000, 0x912600,
    0x7B2B00, 0x003E00, 0x00480D, 0x003C22,
    0x002F66, 0x000000, 0x050505, 0x050505,
    
    0xC8C8C8, 0x0059FF, 0x443CFF, 0xB733CC,
    0xFF33AA, 0xFF375E, 0xFF371A, 0xD54B00,
    0xC46200, 0x3C7B00, 0x1E8415, 0x009566,
    0x0084C4, 0x111111, 0x090909, 0x090909,
    
    0xFFFFFF, 0x0095FF, 0x6F84FF, 0xD56FFF,
    0xFF77CC, 0xFF6F99, 0xFF7B59, 0xFF915F,
    0xFFA233, 0xA6BF00, 0x51D96A, 0x4DD5AE,
    0x00D9FF, 0x666666, 0x0D0D0D, 0x0D0D0D,
    
    0xFFFFFF, 0x84BFFF, 0xBBBBFF, 0xD0BBFF,
    0xFFBFEA, 0xFFBFCC, 0xFFC4B7, 0xFFCCAE,
    0xFFD9A2, 0xCCE199, 0xAEEEB7, 0xAAF7EE,
    0xB3EEFF, 0xDDDDDD, 0x111111, 0x111111,
];

function getColor(index) {
    return TABLE[index];
}

function parsePalettePixels(buf) {
    var r = new Uint32Array(buf.length);
    for(var i = 0; i < buf.length; i++) {
        r[i] = getColor(buf[i]);
    }
    return r;
}

httpGet('./contra.nes', 'arraybuffer', function(res) {
    var canvas = document.createElement('canvas');
    canvas.style = 'width: 256px; height: 240px;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var imgData = ctx.createImageData(256, 240);
    var buf = new Uint8Array(res);
    var nes = new NES();
    nes.onFrame = function(buf) {
        var pixels = parsePalettePixels(buf);
        var ptr = 0;
        for(var y = 0; y < 240; y++) {
            for(var x = 0; x < 256; x++) {
                var offset = y * 256 + x;
                imgData.data[ptr++] = pixels[offset] >> 16 & 0xff;
                imgData.data[ptr++] = pixels[offset] >> 8 & 0xff;
                imgData.data[ptr++] = pixels[offset] & 0xff;
                imgData.data[ptr++] = 0xff;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    };
    var cpu = new CPU(nes);
    var ppu = new PPU(nes);
    var controller1 = new Controller();
    var controller2 = new Controller();
    nes.controller1 = controller1;
    nes.controller2 = controller2;
    nes.load(buf);
    cpu.reset();
    function handleKeyboard(e) {
        var keyMap = {
            'KeyW': 0x08,
            'KeyS': 0x04,
            'KeyA': 0x02,
            'KeyD': 0x01,
            'Enter': 0x10,
            'ShiftRight': 0x20,
            'KeyL': 0x80,
            'KeyK': 0x40
        };
        var value = keyMap[e.code];
        controller1.pressButton(value, e.type === 'keydown');
        controller2.pressButton(value, e.type === 'keydown');
    }
    document.addEventListener('keydown', handleKeyboard);
    document.addEventListener('keyup', handleKeyboard);
    requestAnimationFrame(function loop() {
        var frame = ppu.frame;
        while(1) {
            cpu.clock();
            ppu.clock();
            if(frame !== ppu.frame) {
                break;
            }
        }
        requestAnimationFrame(loop);
    });
});





















































































































































