function PPU(nes) {
    nes.ppu = this;
    this.nes = nes;
    this.mem = new Uint8Array(0x4000);
    this.pixels = new Uint8Array(256 * 240);
    this.oamMem = new Uint8Array(256);
    this.oamAddr = 0;
    this.reg = {
        v: 0,
        t: 0,
        x: 0,
        w: 0
    };
    this.shiftReg = {
        lowTailByte: 0,
        highTailByte: 0,
        lowAttributeByte: 0,
        highAttributeByte: 0
    };
    this.latch = {};
    this.nmiDelay = 0;
    this.readBuffer = 0;
    this.frame = 0;
    this.scanline = 240;
    this.cycle = 340;
    this.secondaryOAM = [];
    this.spritePixels = [];
    this.previousData = 0;
    this.controller = {
        baseNTAddr: 0,
        vramAddrInc: 1,
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

PPU.prototype.clock = function() {
    if(this.scanline === 261 && this.cycle === 339
        &&(this.frame & 0x01)
        && (this.mask.showBackground || this.mask.showSprite)) {
        this.updateCycle();
    }
    
    this.updateCycle();
    
    if(!this.mask.showBackground && !this.mask.showSprite) {
        return;
    }
    
    // scanline 0-239: visible lines
    if(this.scanline >= 0 && this.scanline <= 239) {
        // cycle 0: do nothing
        
        // cycle 1-64: clear secondary OAM
        if(this.cycle === 1 && this.mask.showSprite) {
            for(var i = 0; i < this.secondaryOAM.length; i++) {
                this.secondaryOAM[i].y = 0xff;
                this.secondaryOAM[i].tileIndex = 0xff;
                this.secondaryOAM[i].attribute = 0xff;
                this.secondaryOAM[i].x = 0xff;
            }
        }
        
        // cycle 65-256: sprite evaluation for next scanline
        if(this.cycle === 65 && this.mask.showSprite) {
            var spriteCount = 0;
            var spriteSize = 8;
            if(this.controller.spriteSize) {
                spriteSize = 16;
            }
            for(var i = 0; i < 64; i++) {
                var y = this.oamMem[i * 4];
                if(this.scanline < y
                    || (this.scanline >= y + spriteSize)) {
                    continue;
                }
                // Overflow?
                if(spriteCount === 8) {
                    this.status.spriteOverflow = 1;
                    break;
                }
                var sprite = this.secondaryOAM[spriteCount++];
                sprite.y = y;
                sprite.tileIndex = this.oamMem[i * 4 + 1];
                sprite.attribute = this.oamMem[i * 4 + 2];
                sprite.x = this.oamMem[i * 4 + 3];
                sprite.isZero = i === 0;
            }
        }
        
        // cycle 1-256: fetch NT, AT, tile
        if(this.cycle >= 1 && this.cycle <= 256) {
            this.shiftBackground();
            this.renderPixel();
            this.fetchTileData();
        }
        
        // cycle 256
        if(this.cycle === 256) {
            this.incVertical();
        }
        
        // cycle 257
        if(this.cycle === 257) {
            this.copyHorizontal();
        }
        
        // cycle 257-320: fetch sprite
        if(this.cycle === 257 && this.mask.showSprite) {
            for(var i = 0; i < this.spritePixels.length; i++) {
                this.spritePixels[i] = 0;
            }
            var arr = this.secondaryOAM.reverse();
            for(var i = 0; i < arr.length; i++) {
                var sprite = arr[i];
                // hidden sprite?
                if(sprite.y >= 0xef) {
                    continue;
                }
                // caculate tile address
                var priority = sprite.attribute & 0x20;
                var flipH = sprite.attribute & 0x40;
                var flipV = sprite.attribute & 0x80;
                var addr;
                if(this.controller.spriteSize === 0) {
                    var baseAddr = this.controller.spritePTAddr + (sprite.tileIndex << 4);
                    var offset = flipV ? (7 - this.scanline + sprite.y) : (this.scanline - sprite.y);
                    addr = baseAddr + offset;
                } else {
                    var baseAddr = ((sprite.tileIndex & 0x01) ? 0x1000 : 0) + ((sprite.tileIndex & 0xfe) << 4);
                    var offset = flipV ? (15 - this.scanline + sprite.y) : (this.scanline - sprite.y);
                    addr = baseAddr + offset % 8 + Math.floor(offset / 8) * 16;
                }
                // fetch tile data
                var lowTile = this.readByte(addr);
                var highTile = this.readByte(addr + 8);
                // generate sprite pixels
                for(var i = 0; i < 8; i++) {
                    var b = flipH ? 0x01 << i : 0x80 >> i;
                    var bit0 = lowTile & b ? 1 : 0;
                    var bit1 = highTile & b ? 1 : 0;
                    var bit2 = sprite.attribute & 0x01 ? 1 : 0;
                    var bit3 = sprite.attribute & 0x02 ? 1 : 0;
                    var index = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0;
                    if(index % 4 === 0 && (this.spritePixels[sprite.x + i] & 0x3f) % 4 !== 0) {
                        continue;
                    }
                    this.spritePixels[sprite.x + i] = index
                        | (priority ? 0x40 : 0)
                        | (sprite.isZero ? 0x80 : 0);
                }
            }
        }
        
        // cycle 321-336: fetch NT, AT, tile
        if(this.cycle >= 321 && this.cycle <= 336) {
            this.shiftBackground();
            this.fetchTileData();
        }
        
        // cycle 337-340: unused NT fetch
    }
    
    // scanline 240-260: do nothing
    
    // scanline 261: pre-render line
    if(this.cycle === 261) {
        // cycle 0: do nothing
        
        // cycle 1-256: fetch NT, AT, tile
        if(this.cycle >= 1 && this.cycle <= 256) {
            this.shiftBackground();
            this.fetchTileData();
        }
        
        // cycle 256
        if(this.cycle === 256) {
            this.incVertical();
        }
        
        // cycle 257
        if(this.cycle === 257) {
            this.copyHorizontal();
        }
        
        // cycle 257-320: do nothing
        
        // cycle 280
        if(this.cycle === 280) {
            this.copyVertical();
        }
        
        // cycle 321-336: fetch NT, AT, tile
        if(this.cycle >= 321 && this.cycle <= 336) {
            this.shiftBackground();
            this.fetchTileData();
        }
    }
};

PPU.prototype.updateCycle = function() {
    if(this.status.vblankStarted && this.controller.generateNMI
        && this.nmiDelay-- === 0) {
        // NMI
        this.nes.cpu.nmi();
    }
    this.cycle++;
    if(this.cycle > 340) {
        this.cycle = 0;
        this.scanline++;
        if(this.scanline > 261) {
            this.scanline = 0;
            this.frame++;
            this.nes.onFrame(this.pixels);
        }
    }
    if(this.scanline === 241 && this.cycle === 1) {
        this.status.vblankStarted = 1;
        if(this.controller.generateNMI) {
            this.nmiDelay = 15;
        }
    }
    if(this.scanline === 261 && this.cycle === 1) {
        this.status.vblankStarted = 0;
        this.status.sprite0Hit = 0;
        this.status.spriteOverflow = 0;
    }
    if(this.mask.showBackground || this.mask.showSprite) {
        // mapper.ppuClockHandler
        
    }
};

PPU.prototype.shiftBackground = function() {
    if(!this.mask.showBackground) {
        return;
    }
    this.shiftReg.lowTailByte <<= 1;
    this.shiftReg.highTailByte <<= 1;
    this.shiftReg.lowAttributeByte <<= 1;
    this.shiftReg.highAttributeByte <<= 1;
};

PPU.prototype.renderPixel = function() {
    var x = this.cycle - 1;
    var y = this.scanline;
    var offset = 0x8000 >> this.reg.x;
    var bit0 = this.shiftReg.lowTailByte & offset ? 1 : 0;
    var bit1 = this.shiftReg.highTailByte & offset ? 1 : 0;
    var bit2 = this.shiftReg.lowAttribute & offset ? 1 : 0;
    var bit3 = this.shiftReg.highAttribute & offset ? 1 : 0;
    var paletteIndex = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0;
    var spritePaletteIndex = this.spritePixels[x] & 0x3f;
    var isTransparentSprite = spritePaletteIndex % 4 === 0
        || !this.mask.showSprite;
    var isTransparentBackground = paletteIndex % 4 === 0
        || !this.mask.showBackground;
    var addr = 0x3f00;
    if(isTransparentBackground) {
        if(isTransparentSprite) {
            // do nothing
        } else {
            addr = 0x3f10 + spritePaletteIndex;
        }
    } else {
        if(isTransparentSprite) {
            addr = 0x3f00 + paletteIndex;
        } else {
            if(this.spritePixels[x] & 0x80) {
                if((!this.mask.showBackground || !this.mask.showSprite)
                    || (x >= 0 && x <= 7 && (!this.mask.showSpriteLeft8px || !this.mask.showBackgroundLeft8px))
                    || x === 255) {
                    // do nothing
                } else {
                    // sprite 0 hit
                    this.status.sprite0Hit = 1;
                }
            }
            if(this.spritePixels[x] & 0x40) {
                addr = 0x3f00 + paletteIndex;
            } else {
                addr = 0x3f10 + spritePaletteIndex;
            }
        }
    }
    this.pixels[x + y * 256] = this.readByte(addr);
};

PPU.prototype.fetchTileData = function() {
    if(!this.mask.showBackground) {
        return;
    }
    switch(this.cycle & 0x07) {
        // increment horizontal position
        case 0:
            if((this.reg.v & 0x001f) === 31) {
                this.reg.v &= ~0x001f;
                this.reg.v ^= 0x0400;
            } else {
                this.reg.v++;
            }
            break;
        
        // load background
        // fetch name table
        case 1:
            // load background
            this.shiftReg.lowTailByte |= this.latch.lowTailByte;
            this.shiftReg.highTailByte |= this.latch.highTailByte;
            this.shiftReg.lowAttributeByte |= (this.latch.attributeTable & 0x01) ? 0xff : 0;
            this.shiftReg.highAttributeByte |= (this.latch.attributeTable & 0x02) ? 0xff : 0;
            
            // fetch name table
            var addr = 0x2000 | (this.reg.v & 0x0fff);
            this.latch.nameTable = this.readByte(addr);
            break;
        
        // fetch attribute table
        case 3:
            var addr = 0x23c0
                | (this.reg.v & 0x0c00)
                | ((this.reg.v >> 4) & 0x38)
                | ((this.reg.v >> 2) & 0x07);
            var isRight = this.reg.v & 0x02;
            var isBottom = this.reg.v & 0x40;
            var offset = (isBottom ? 0x02 : 0) | (isRight ? 0x01 : 0);
            this.latch.attributeTable = this.readByte(addr) >> (offset << 1) & 0x03;
            break;
        
        // fetch low background tile byte
        case 5:
            var addr = this.controller.backgroundPTAddr 
                + this.latch.nameTable * 16 
                + (this.reg.v >> 12 & 0x07);
            this.latch.lowTailByte = this.readByte(addr);
            break;
        
        // fetch high background tile byte
        case 7:
            var addr = this.controller.backgroundPTAddr
                + this.latch.nameTable * 16
                + (this.reg.v >> 12 & 0x07) 
                + 8;
            this.latch.highTailByte = this.readByte(addr);
            break;
    }
};

PPU.prototype.incHorizontal = function() {
    if((this.reg.v & 0x001f) === 31) {
        this.reg.v &= ~0x001f;
        this.reg.v ^= 0x0400;
    } else {
        this.reg.v++;
    }
};

PPU.prototype.incVertical = function() {
    if((this.reg.v & 0x7000) !== 0x7000) {
        this.reg.v += 0x1000;
    } else {
        this.reg.v &= ~0x7000;
        var y = (this.reg.v & 0x03e0) >> 5;
        if(y === 29) {
            y = 0;
            this.reg.v ^= 0x0800;
        } else if(y === 31) {
            y = 0;
        } else {
            y++;
        }
        this.reg.v = (this.reg.v & ~0x03e0) | (y << 5);
    }
};

PPU.prototype.copyHorizontal = function() {
    this.reg.v = (this.reg.v & 0xfbe0) 
        | (this.reg.t & ~0xfbe0) & 0x7ffff;
};

PPU.prototype.copyVertical = function() {
    this.reg.v = (this.reg.v & 0x841f)
        | (this.reg.t & ~0x841f) & 0x7fff;
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

PPU.prototype.readReg = function(addr) {
    var data;
    var tmp;
    switch(addr) {
        // PPUCTRL
        case 0x2000:
            return this.getController();
        
        // PPUMASK
        case 0x2001:
            return this.getMask();
        
        // PPUSTATUS
        case 0x2002:
            return this.getStatus();
        
        // OAMADDR
        case 0x2003:
            return 0;
        
        // OAMDATA
        case 0x2004:
            return this.oamMem[this.oamAddr];
        
        // PPUSCROLL
        case 0x2005:
            return 0;
        
        // PPUADDR
        case 0x2006:
            return 0;
        
        // PPUDATA
        case 0x2007:
            data = this.readByte(this.reg.v);
            if(this.reg.v <= 0x3eff) {
                var tmp = this.readBuffer;
                this.readBuffer = data;
                data = tmp;
            } else {
                this.readBuffer = this.readByte(this.reg.v - 0x1000);
            }
            this.reg.v += this.controller.vramAddrInc;
            this.reg.v &= 0x7fff;
            return data;
    }
};

PPU.prototype.writeReg = function(addr, value) {
    value &= 0xff;
    this.previousData = value & 0x1f;
    switch(addr) {
        // PPUCTRL
        case 0x2000:
            this.setController(value);
            this.reg.t = this.reg.t & 0xf3ff | (value & 0x03) << 10;
            break;
        
        // PPUMASK
        case 0x2001:
            this.setMask(value);
            break;
        
        // PPUSTATUS
        case 0x2002:
            break;
        
        // OAMADDR
        case 0x2003:
            this.oamAddr = value;
            break;
        
        // OAMDATA
        case 0x2004:
            this.oamMem[this.oamAddr++ & 0xff] = value;
            break;
        
        // PPUSCROLL
        case 0x2005:
            if(this.reg.w === 0) {
                this.reg.t = this.reg.t & 0xffe0 | value >> 3;
                this.reg.x = value & 0x07;
                this.reg.w = 1;
            } else {
                this.reg.t = this.reg.t & 0x0c1f 
                    | (value & 0x07) << 12 
                    | (value & 0xf8) << 2;
                this.reg.w = 0;
            }
            break;
        
        // PPUADDR
        case 0x2006:
            if(this.reg.w === 0) {
                this.reg.t = this.reg.t & 0x80ff | (value & 0x3f) << 8;
                this.reg.w = 1;
            } else {
                this.reg.t = this.reg.t & 0xff00 | value;
                this.reg.v = this.reg.t;
                this.reg.w = 0;
            }
            break;
        
        // PPUDATA
        case 0x2007:
            this.writeByte(this.reg.v, value);
            this.reg.v += this.controller.vramAddrInc;
            break;
    }
};

PPU.prototype.readByte = function(addr) {
    addr &= 0x3fff;
    // name table 0-3
    if(addr >= 0x2000 && addr < 0x3000) {
        addr = this.parseMirrorAddr(addr);
    }
    // mirrors of $2000-$2eff
    if(addr >= 0x3000 && addr < 0x3f00) {
        addr = this.parseMirrorAddr(addr - 0x1000);
    }
    // sprite palette
    if(addr >= 0x3f10 && !(addr & 0x03)) {
        addr -= 0x10;
    }
    return this.mem[addr];
};

PPU.prototype.writeByte = function(addr, value) {
    addr &= 0x3fff;
    // name table 0-3
    if(addr >= 0x2000 && addr < 0x3000) {
        addr = this.parseMirrorAddr(addr);
    }
    // mirrors of $2000-$2eff
    if(addr >= 0x3000 && addr < 0x3f00) {
        addr = this.parseMirrorAddr(addr - 0x1000);
    }
    // sprite palette
    if(addr >= 0x3f10 && !(addr & 0x03)) {
        addr -= 0x10;
    }
    this.mem[addr] = value;
};

PPU.prototype.parseMirrorAddr = function(addr) {
    if(this.nes.fourScreen) {
        return addr;
    } else {
        if(this.mirroring) {
            return addr & 0x27ff;
        } else {
            return (addr & 0x23ff) | (addr & 0x0800 ? 0x0400 : 0);
        }
    }
};

PPU.prototype.writeOAM = function(buf) {
    for(var i = 0; i < this.oamMem.length; i++) {
        this.oamMem[(i + this.oamAddr) & 0xff] = buf[i];
    }
};























































































































