function PPU(nes) {
    nes.ppu = this;
    this.nes = nes;
    this.mem = new Uint8Array(0x1000);
    this.palettes = new Uint8Array(0x20);
    this.pixels = new Uint8Array(256 * 240); // NES color
    this.oamMemory = new Uint8Array(256);
    this.register = {
        v: 0, 
        t: 0, 
        x: 0, 
        w: 0
    };
    this.shiftRegister = {};
    this.latchs = {};
    this.nmiDelay = 0;
    // The PPUDATA read buffer (post-fetch): https://wiki.nesdev.com/w/index.php/PPU_registers#The_PPUDATA_read_buffer_.28post-fetch.29
    this.readBuffer = 0;
    this.frame = 0; // Frame counter
    this.scanLine = 240; // 0 ~ 261
    this.cycle = 340; // 0 ~ 340
    this.oamAddress = 0;
    this.secondaryOam = [{}, {}, {}, {}, {}, {}, {}, {}];
    this.spritePixels = new Array(256);
    // Least significant bits previously written into a PPU register
    this.previousData = 0;
    this.controller = {
        baseNTAddr: 0,
        vramAddrInc: 0,
        spritePTAddr: 0,
        backgroundPTAddr: 0,
        spriteSize: 0,
        generateNMI: 0
    };
    this.mask = {
        greyscale: 0,
        showBackgroundLeft8px: 0,
        showSpriteLeft8px: 0,
        showBackground: 0,
        showSprite: 0,
        emphasizeRed: 0,
        emphasizeGreen: 0,
        emphasizeBlue: 0
    };
    this.status = {
        spriteOverflow: 0,
        sprite0Hit: 0,
        vblankStarted: 0
    };
}

// PPU timing: https://wiki.nesdev.com/w/images/4/4f/Ppu.svg
PPU.prototype.clock = function () {
    if (this.scanLine === 261 && this.cycle === 339 
        && (this.frame & 0x01) 
        && (this.mask.showBackground || this.mask.showSprite)) {
        this.updateCycle();
    }
    this.updateCycle();
    if (!this.mask.showBackground && !this.mask.showSprite) {
        return;
    }
    // Scanline 0 - 239: visible lines
    if (0 <= this.scanLine && this.scanLine <= 239) {
        // Cycle 0: do nothing
        // Cycle 1 - 64: Clear secondary OAM
        if (1 === this.cycle && this.mask.showSprite) {
            for(var i = 0; i < this.secondaryOam.length; i++) {
                this.secondaryOam[i].y = 0xff;
                this.secondaryOam[i].tileIndex = 0xff;
                this.secondaryOam[i].attributes = 0xff;
                this.secondaryOam[i].x = 0xff;
            }
        }
        // Cycle 65 - 256: Sprite evaluation for next scanline
        if (65 === this.cycle && this.mask.showSprite) {
            var spriteCount = 0;
            var spriteSize = this.controller.spriteSize ? 16 : 8;
            // Find eligible sprites
            for (var i = 0; i < 64; i++) {
                var y = this.oamMemory[i * 4];
                if (this.scanLine < y || (this.scanLine >= y + spriteSize)) {
                    continue;
                }
                // Overflow?
                if (spriteCount === 8) {
                    this.status.spriteOverflow = 1;
                    break;
                }
                var oam = this.secondaryOam[spriteCount++];
                oam.y = y;
                oam.tileIndex = this.oamMemory[i * 4 + 1];
                oam.attributes = this.oamMemory[i * 4 + 2];
                oam.x = this.oamMemory[i * 4 + 3];
                oam.isZero = i === 0;
            }
        }
        // Cycle 1 - 256: fetch NT, AT, tile
        if (1 <= this.cycle && this.cycle <= 256) {
            this.shiftBackground();
            this.renderPixel();
            this.fetchTileRelatedData();
        }
        // Cycle 256
        if (this.cycle === 256) {
            this.incrementVerticalPosition();
        }
        // Cycle 257
        if (this.cycle === 257) {
            this.copyHorizontalBits();
        }
        // Cycle 257 - 320: Sprite fetches
        if (this.cycle === 257 && this.mask.showSprite) {
            for(var i = 0; i < this.spritePixels.length; i++) {
                this.spritePixels[i] = 0;
            }
            //for (var _i = 0, _a = this.secondaryOam.reverse(); _i < _a.length; _i++) {
            for(var _i = this.secondaryOam.length - 1; _i >= 0; _i--) {
                var sprite = this.secondaryOam[_i];
                // Hidden sprite?
                if (sprite.y >= 0xEF) {
                    continue;
                }
                var isBehind = sprite.attributes & 0x20;
                var isZero = sprite.isZero;
                var isFlipH = sprite.attributes & 0x40;
                var isFlipV = sprite.attributes & 0x80;
                // Caculate tile address
                var address;
                if (this.controller.spriteSize === 0) {
                    var baseAddress = (this.controller.spritePTAddr ? 0x1000 : 0) + (sprite.tileIndex << 4);
                    var offset = isFlipV ? (7 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
                    address = baseAddress + offset;
                }
                else {
                    var baseAddress = ((sprite.tileIndex & 0x01) ? 0x1000 : 0x0000) + ((sprite.tileIndex & 0xFE) << 4);
                    var offset = isFlipV ? (15 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
                    address = baseAddress + offset % 8 + Math.floor(offset / 8) * 16;
                }
                // Fetch tile data
                var tileL = this.readByte(address);
                var tileH = this.readByte(address + 8);
                // Generate sprite pixels
                for (var i = 0; i < 8; i++) {
                    var b = isFlipH ? 0x01 << i : 0x80 >> i;
                    var bit0 = tileL & b ? 1 : 0;
                    var bit1 = tileH & b ? 1 : 0;
                    var bit2 = sprite.attributes & 0x01 ? 1 : 0;
                    var bit3 = sprite.attributes & 0x02 ? 1 : 0;
                    var index = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0;
                    if (index % 4 === 0 && (this.spritePixels[sprite.x + i] & 0x3f) % 4 !== 0) {
                        continue;
                    }
                    this.spritePixels[sprite.x + i] = index |
                        (isBehind ? 0x40 : 0) |
                        (isZero ? 0x80 : 0);
                }
            }
        }
        // Cycle 321 - 336: fetch NT, AT, tile
        if (321 <= this.cycle && this.cycle <= 336) {
            this.shiftBackground();
            this.fetchTileRelatedData();
        }
        // Cycle 337 - 340: unused NT fetches
    }
    // Scanline 240 - 260: Do nothing
    // Scanline 261: pre render line
    if (this.scanLine === 261) {
        // Cycle 0: do nothing
        // Cycle 1 - 256: fetch NT, AT, tile
        if (1 <= this.cycle && this.cycle <= 256) {
            this.shiftBackground();
            this.fetchTileRelatedData();
        }
        // Cycle 256
        if (this.cycle === 256) {
            this.incrementVerticalPosition();
        }
        // Cycle 257
        if (this.cycle === 257) {
            this.copyHorizontalBits();
        }
        // Cycle 257 - 320: do nothing
        // Cycle 280
        if (this.cycle === 280) {
            this.copyVerticalBits();
        }
        // Cycle 321 - 336: fetch NT, AT, tile
        if (321 <= this.cycle && this.cycle <= 336) {
            this.shiftBackground();
            this.fetchTileRelatedData();
        }
    }
};

PPU.prototype.updateCycle = function () {
    if (this.status.vblankStarted && this.controller.generateNMI && this.nmiDelay-- === 0) {
        this.nes.cpu.nmi();
    }
    this.cycle++;
    if (this.cycle > 340) {
        this.cycle = 0;
        this.scanLine++;
        if (this.scanLine > 261) {
            this.scanLine = 0;
            this.frame++;
            this.nes.onFrame(this.pixels);
        }
    }
    // Set VBlank flag
    if (this.scanLine === 241 && this.cycle === 1) {
        this.status.vblankStarted = 1;
        // Trigger NMI
        if (this.controller.generateNMI) {
            this.nmiDelay = 15;
        }
    }
    // Clear VBlank flag and Sprite0 Overflow
    if (this.scanLine === 261 && this.cycle === 1) {
        this.status.vblankStarted = 0;
        this.status.sprite0Hit = 0;
        this.status.spriteOverflow = 0;
    }
    if (this.mask.showBackground || this.mask.showSprite) {
        this.nes.mapper.handlePPUClock(this.scanLine, this.cycle);
    }
};

PPU.prototype.shiftBackground = function () {
    if (!this.mask.showBackground) {
        return;
    }
    this.shiftRegister.lowBackgorundTailBytes <<= 1;
    this.shiftRegister.highBackgorundTailBytes <<= 1;
    this.shiftRegister.lowBackgroundAttributeByes <<= 1;
    this.shiftRegister.highBackgroundAttributeByes <<= 1;
};

PPU.prototype.renderPixel = function () {
    var x = this.cycle - 1;
    var y = this.scanLine;
    var offset = 0x8000 >> this.register.x;
    var bit0 = this.shiftRegister.lowBackgorundTailBytes & offset ? 1 : 0;
    var bit1 = this.shiftRegister.highBackgorundTailBytes & offset ? 1 : 0;
    var bit2 = this.shiftRegister.lowBackgroundAttributeByes & offset ? 1 : 0;
    var bit3 = this.shiftRegister.highBackgroundAttributeByes & offset ? 1 : 0;
    var paletteIndex = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0 << 0;
    var spritePaletteIndex = this.spritePixels[x] & 0x3f;
    var isTransparentSprite = spritePaletteIndex % 4 === 0 || !this.mask.showSprite;
    var isTransparentBackground = paletteIndex % 4 === 0 || !this.mask.showBackground;
    var address = 0x3F00;
    if (isTransparentBackground) {
        if (isTransparentSprite) {
            // Do nothing
        }
        else {
            address = 0x3F10 + spritePaletteIndex;
        }
    }
    else {
        if (isTransparentSprite) {
            address = 0x3F00 + paletteIndex;
        }
        else {
            if (this.spritePixels[x] & 0x80) {
                if ((!this.mask.showBackground || !this.mask.showSprite) ||
                    (0 <= x && x <= 7 && (!this.mask.showSpriteLeft8px || !this.mask.showBackgroundLeft8px)) ||
                    x === 255) {
                    // Sprite 0 hit does not happen
                }
                else {
                    this.status.sprite0Hit = 1;
                }
            }
            address = this.spritePixels[x] & 0x40 ? 0x3F00 + paletteIndex : 0x3F10 + spritePaletteIndex;
        }
    }
    this.pixels[x + y * 256] = this.readByte(address);
};

PPU.prototype.fetchTileRelatedData = function () {
    if (!this.mask.showBackground) {
        return;
    }
    var address;
    var offset;
    switch (this.cycle & 0x07) {
        case 0:
            this.incrementHorizontalPosition();
            break;
        case 1:
            // load background
            this.shiftRegister.lowBackgorundTailBytes |= this.latchs.lowBackgorundTailByte;
            this.shiftRegister.highBackgorundTailBytes |= this.latchs.highBackgorundTailByte;
            this.shiftRegister.lowBackgroundAttributeByes |= (this.latchs.attributeTable & 0x01) ? 0xFF : 0;
            this.shiftRegister.highBackgroundAttributeByes |= (this.latchs.attributeTable & 0x02) ? 0xFF : 0;
            // fetch name table
            address = 0x2000 | (this.register.v & 0x0FFF);
            this.latchs.nameTable = this.readByte(address);
            break;
        case 3:
            address = 0x23C0 |
            (this.register.v & 0x0C00) |
            ((this.register.v >> 4) & 0x38) |
            ((this.register.v >> 2) & 0x07);
            offset = ((this.register.v & 0x40) ? 0x02 : 0) | ((this.register.v & 0x02) ? 0x01 : 0);
            this.latchs.attributeTable = this.readByte(address) >> (offset << 1) & 0x03;
            break;
        case 5:
            address = (this.controller.backgroundPTAddr ? 0x1000 : 0) +
            this.latchs.nameTable * 16 +
            (this.register.v >> 12 & 0x07);
            this.latchs.lowBackgorundTailByte = this.readByte(address);
            break;
        case 7:
            address = (this.controller.backgroundPTAddr ? 0x1000 : 0) +
            this.latchs.nameTable * 16 +
            (this.register.v >> 12 & 0x07) + 8;
            this.latchs.highBackgorundTailByte = this.readByte(address);
            break;
    }
};

// Between cycle 328 of a scanline, and 256 of the next scanline
PPU.prototype.incrementHorizontalPosition = function () {
    if ((this.register.v & 0x001F) === 31) {
        this.register.v &= ~0x001F;
        this.register.v ^= 0x0400;
    }
    else {
        this.register.v += 1;
    }
};

// At cycle 256 of each scanline
PPU.prototype.incrementVerticalPosition = function () {
    if ((this.register.v & 0x7000) !== 0x7000) {
        this.register.v += 0x1000;
    }
    else {
        this.register.v &= ~0x7000;
        var y = (this.register.v & 0x03E0) >> 5;
        if (y === 29) {
            y = 0;
            this.register.v ^= 0x0800;
        }
        else if (y === 31) {
            y = 0;
        }
        else {
            y += 1;
        }
        this.register.v = (this.register.v & ~0x03E0) | (y << 5);
    }
};

// At cycle 257 of each scanline
PPU.prototype.copyHorizontalBits = function () {
    // v: ....F.. ...EDCBA = t: ....F.. ...EDCBA
    this.register.v = (this.register.v & 64480) | (this.register.t & ~64480) & 0x7FFF;
};

// During cycles 280 to 304 of the pre-render scanline (end of vblank)
PPU.prototype.copyVerticalBits = function () {
    // v: IHGF.ED CBA..... = t: IHGF.ED CBA.....
    this.register.v = (this.register.v & 33823) | (this.register.t & ~33823) & 0x7FFF;
};

PPU.prototype.setController = function(value) {
    this.controller.baseNTAddr = value & 0x03;
    this.controller.vramAddrInc = (value >> 2) & 1;
    this.controller.spritePTAddr = (value >> 3) & 1;
    this.controller.backgroundPTAddr = (value >> 4) & 1;
    this.controller.spriteSize = (value >> 5) & 1;
    this.controller.generateNMI = (value >> 7) & 1;
};

PPU.prototype.getController = function() {
    return this.controller.baseNTAddr
        | (this.controller.vramAddrInc << 2)
        | (this.controller.spritePTAddr << 3)
        | (this.controller.backgroundPTAddr << 4)
        | (this.controller.spriteSize << 5)
        | (this.controller.generateNMI << 7);
};

PPU.prototype.setMask = function(value) {
    this.mask.greyscale = value & 1;
    this.mask.showBackgroundLeft8px = (value >> 1) & 1;
    this.mask.showSpriteLeft8px = (value >> 2) & 1;
    this.mask.showBackground = (value >> 3) & 1;
    this.mask.showSprite = (value >> 4) & 1;
    this.mask.emphasizeRed = (value >> 5) & 1;
    this.mask.emphasizeGreen = (value >> 6) & 1;
    this.mask.emphasizeBlue = (value >> 7) & 1;
};

PPU.prototype.getMask = function() {
    return this.mask.greyscale
        | (this.mask.showBackgroundLeft8px << 1)
        | (this.mask.showSpriteLeft8px << 2)
        | (this.mask.showBackground << 3)
        | (this.mask.showSprite << 4)
        | (this.mask.emphasizeRed << 5)
        | (this.mask.emphasizeGreen << 6)
        | (this.mask.emphasizeBlue << 7);
};

PPU.prototype.getStatus = function() {
    return (this.status.spriteOverflow << 5)
        | (this.status.sprite0Hit << 6)
        | (this.status.vblankStarted << 7)
};

PPU.prototype.readReg = function (address) {
    var data;
    var tmp;
    switch (address) {
        case 0x2000:
            return this.getController();
        case 0x2001:
            return this.getMask();
        case 0x2002:
            data = this.getStatus() | this.previousData;
            // Clear VBlank flag
            this.status.vblankStarted = 0;
            // w:                  = 0
            this.register.w = 0;
            return data;
        case 0x2003:
            return 0;
        case 0x2004:
            return this.oamMemory[this.oamAddress];
        case 0x2005:
            return 0;
        case 0x2006:
            return 0;
        case 0x2007:
            data = this.readByte(this.register.v);
            if (this.register.v <= 0x3EFF) { // Buffered read
                tmp = this.readBuffer;
                this.readBuffer = data;
                data = tmp;
            }
            else {
                this.readBuffer = this.readByte(this.register.v - 0x1000);
            }
            this.register.v += this.controller.vramAddrInc ? 32 : 1;
            this.register.v &= 0x7FFF;
            return data;
    }
};

PPU.prototype.writeReg = function (address, data) {
    data &= 0xFF;
    this.previousData = data & 0x1F;
    switch (address) {
        case 0x2000:
            this.setController(data);
            // t: ....BA.. ........ = d: ......BA
            this.register.t = this.register.t & 0xF3FF | (data & 0x03) << 10;
            break;
        case 0x2001:
            this.setMask(data);
            break;
        case 0x2002:
            break;
        case 0x2003:
            this.oamAddress = data;
            break;
        case 0x2004:
            this.oamMemory[this.oamAddress++ & 0xFF] = data;
            break;
        case 0x2005:
            if (this.register.w === 0) {
                // t: ....... ...HGFED = d: HGFED...
                // x:              CBA = d: .....CBA
                // w:                  = 1
                this.register.t = this.register.t & 0xFFE0 | data >> 3;
                this.register.x = data & 0x07;
                this.register.w = 1;
            }
            else {
                // t: CBA..HG FED..... = d: HGFEDCBA
                // w:                  = 0
                this.register.t = this.register.t & 0x0C1F | (data & 0x07) << 12 | (data & 0xF8) << 2;
                this.register.w = 0;
            }
            break;
        case 0x2006:
            if (this.register.w === 0) {
                // t: .FEDCBA ........ = d: ..FEDCBA
                // t: X...... ........ = 0
                // w:                  = 1
                this.register.t = this.register.t & 0x80FF | (data & 0x3F) << 8;
                this.register.w = 1;
            }
            else {
                // t: ....... HGFEDCBA = d: HGFEDCBA
                // v                   = t
                // w:                  = 0
                this.register.t = this.register.t & 0xFF00 | data;
                this.register.v = this.register.t;
                this.register.w = 0;
            }
            break;
        case 0x2007:
            this.writeByte(this.register.v, data);
            this.register.v += this.controller.vramAddrInc ? 32 : 1;
            break;
    }
};

PPU.prototype.readByte = function(addr) {
    addr &= 0x3fff;
    if(addr < 0x2000) {
        // Pattern table 0-1
        return this.nes.mapper.readByte(addr);
    } else if(addr < 0x3000) {
        // Nametable 0-3
        return this.mem[this.parseMirrorAddr(addr) - 0x2000];
    } else if(addr < 0x3f00) {
        // Mirrors of $2000-$2EFF
        return this.mem[this.parseMirrorAddr(addr - 0x1000) - 0x2000];
    } else {
        // Palette RAM indexes
        addr &= 0x3f1f;
        if(addr >= 0x3f10 && !(addr & 0x03)) {
            addr -= 0x10;
        }
        return this.palettes[addr - 0x3f00];
    }
};

PPU.prototype.writeByte = function(addr, value) {
    addr &= 0x3fff;
    if(addr < 0x2000) {
        // Pattern table 0-1
        this.nes.mapper.writeByte(addr, value);
    } else if(addr < 0x3000) {
        // Nametable 0-3
        this.mem[this.parseMirrorAddr(addr) - 0x2000] = value;
    } else if(addr < 0x3f00) {
        // Mirrors of $2000-$2EFF
        this.mem[this.parseMirrorAddr(addr - 0x1000) - 0x2000] = value;
    } else {
        // Palette RAM indexes
        addr &= 0x3f1f;
        if(addr >= 0x3f10 && !(addr & 0x03)) {
            addr -= 0x10;
        }
        this.palettes[addr - 0x3f00] = value;
    }
};

PPU.prototype.parseMirrorAddr = function (addr) {
    if(this.nes.fourScreen) {
        return addr;
    } else {
        if(this.nes.mirroring) {
            return addr & 0x27ff;
        } else {
            return (addr & 0x23ff) | (addr & 0x0800 ? 0x0400 : 0);
        }
    }
};

PPU.prototype.writeOAM = function (data) {
    for (var i = 0; i < this.oamMemory.length; i++) {
        this.oamMemory[(i + this.oamAddress) & 0xFF] = data[i];
    }
};
