"use strict";

var SpriteSize = (function (SpriteSize) {
    SpriteSize[SpriteSize["SIZE_8X8"] = 8] = "SIZE_8X8";
    SpriteSize[SpriteSize["SIZE_8X16"] = 16] = "SIZE_8X16";
    return SpriteSize;
})({});
var BaseNameTableAddressList = [0x2000, 0x2400, 0x2800, 0x2C00];
var controller_1 = (function () {
    function Controller() {
        this.baseNameTableAddress = BaseNameTableAddressList[0];
        this.vramIncrementStepSize = 1;
        this.spritePatternTableAddress = 0;
        this.backgroundPatternTableAddress = 0;
        this.spriteSize = SpriteSize.SIZE_8X8;
        this.isNMIEnabled = false;
    }
    Object.defineProperty(Controller.prototype, "data", {
        get: function () {
            return BaseNameTableAddressList.indexOf(this.baseNameTableAddress) |
                (this.vramIncrementStepSize === 1 ? 0 : 1) << 2 |
                (this.spritePatternTableAddress ? 1 : 0) << 3 |
                (this.backgroundPatternTableAddress ? 1 : 0) << 4 |
                (this.spriteSize === SpriteSize.SIZE_8X8 ? 0 : 1) << 5 |
                (this.isNMIEnabled ? 1 : 0) << 7;
        },
        set: function (data) {
            this.baseNameTableAddress = BaseNameTableAddressList[data & 0x03];
            this.vramIncrementStepSize = data & 0x04 ? 32 : 1;
            this.spritePatternTableAddress = data & 0x08 ? 0x1000 : 0;
            this.backgroundPatternTableAddress = data & 0x10 ? 0x1000 : 0;
            this.spriteSize = data & 0x20 ? SpriteSize.SIZE_8X16 : SpriteSize.SIZE_8X8;
            this.isNMIEnabled = !!(data & 0x80);
        },
        enumerable: false,
        configurable: true
    });
    return {Controller: Controller};
}());
var Mask = (function () {
    function Mask() {
    }
    Object.defineProperty(Mask.prototype, "data", {
        get: function () {
            return (this.isColorful ? 0 : 1) |
                (this.isShowBackgroundLeft8px ? 1 : 0) << 1 |
                (this.isShowSpriteLeft8px ? 1 : 0) << 2 |
                (this.isShowBackground ? 1 : 0) << 3 |
                (this.isShowSprite ? 1 : 0) << 4 |
                (this.isEmphasizeRed ? 1 : 0) << 5 |
                (this.isEmphasizeGreen ? 1 : 0) << 6 |
                (this.isEmphasizeBlue ? 1 : 0) << 7;
        },
        set: function (data) {
            this.isColorful = !(data & 0x01);
            this.isShowBackgroundLeft8px = !!(data & 0x02);
            this.isShowSpriteLeft8px = !!(data & 0x04);
            this.isShowBackground = !!(data & 0x08);
            this.isShowSprite = !!(data & 0x10);
            this.isEmphasizeRed = !!(data & 0x20);
            this.isEmphasizeGreen = !!(data & 0x40);
            this.isEmphasizeBlue = !!(data & 0x80);
        },
        enumerable: false,
        configurable: true
    });
    return Mask;
}());
var Status = (function () {
    function Status() {
    }
    Object.defineProperty(Status.prototype, "data", {
        get: function () {
            return (this.isSpriteOverflow ? 0x20 : 0) |
                (this.isZeroSpriteHit ? 0x40 : 0) |
                (this.isVBlankStarted ? 0x80 : 0);
        },
        enumerable: false,
        configurable: true
    });
    return Status;
}());
var Register;
(function (Register) {
    Register[Register["PPUCTRL"] = 8192] = "PPUCTRL";
    Register[Register["PPUMASK"] = 8193] = "PPUMASK";
    Register[Register["PPUSTATUS"] = 8194] = "PPUSTATUS";
    Register[Register["OAMADDR"] = 8195] = "OAMADDR";
    Register[Register["OAMDATA"] = 8196] = "OAMDATA";
    Register[Register["PPUSCROLL"] = 8197] = "PPUSCROLL";
    Register[Register["PPUADDR"] = 8198] = "PPUADDR";
    Register[Register["PPUDATA"] = 8199] = "PPUDATA";
})(Register || (Register = {}));
var SpriteAttribute;
(function (SpriteAttribute) {
    SpriteAttribute[SpriteAttribute["PALETTE_L"] = 1] = "PALETTE_L";
    SpriteAttribute[SpriteAttribute["PALETTE_H"] = 2] = "PALETTE_H";
    SpriteAttribute[SpriteAttribute["PRIORITY"] = 32] = "PRIORITY";
    SpriteAttribute[SpriteAttribute["FLIP_H"] = 64] = "FLIP_H";
    SpriteAttribute[SpriteAttribute["FLIP_V"] = 128] = "FLIP_V";
})(SpriteAttribute || (SpriteAttribute = {}));
var SpritePixel;
(function (SpritePixel) {
    SpritePixel[SpritePixel["PALETTE"] = 63] = "PALETTE";
    SpritePixel[SpritePixel["BEHIND_BG"] = 64] = "BEHIND_BG";
    SpritePixel[SpritePixel["ZERO"] = 128] = "ZERO";
})(SpritePixel || (SpritePixel = {}));
var PPU = /** @class */ (function () {
    function PPU(onFrame) {
        this.onFrame = onFrame;
        this.pixels = new Uint8Array(256 * 240); // NES color
        this.oamMemory = new Uint8Array(256);
        this.controller = new controller_1.Controller();
        this.mask = new Mask();
        this.register = { v: 0, t: 0, x: 0, w: 0 };
        this.shiftRegister = {};
        this.latchs = {};
        this.status = new Status();
        this.nmiDelay = 0;
        // The PPUDATA read buffer (post-fetch): https://wiki.nesdev.com/w/index.php/PPU_registers#The_PPUDATA_read_buffer_.28post-fetch.29
        this.readBuffer = 0;
        this.frame = 0; // Frame counter
        this.scanLine = 240; // 0 ~ 261
        this.cycle = 340; // 0 ~ 340
        this.oamAddress = 0;
        this.secondaryOam = Array(8).fill(0).map(function () { return Object.create(null); });
        this.spritePixels = new Array(256);
        // Least significant bits previously written into a PPU register
        this.previousData = 0;
    }
    // PPU timing: https://wiki.nesdev.com/w/images/4/4f/Ppu.svg
    PPU.prototype.clock = function () {
        // For odd frames, the cycle at the end of the scanline is skipped (this is done internally by jumping directly from (339,261) to (0,0)
        // However, this behavior can be bypassed by keeping rendering disabled until after this scanline has passed
        if (this.scanLine === 261 && this.cycle === 339 && this.frame & 0x01 && (this.mask.isShowBackground || this.mask.isShowSprite)) {
            this.updateCycle();
        }
        this.updateCycle();
        if (!this.mask.isShowBackground && !this.mask.isShowSprite) {
            return;
        }
        // Scanline 0 - 239: visible lines
        if (0 <= this.scanLine && this.scanLine <= 239) {
            // Cycle 0: do nothing
            // Cycle 1 - 64: Clear secondary OAM
            if (1 === this.cycle) {
                this.clearSecondaryOam();
            }
            // Cycle 65 - 256: Sprite evaluation for next scanline
            if (65 === this.cycle) {
                this.evalSprite();
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
            if (this.cycle === 257) {
                this.fetchSprite();
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
    PPU.prototype.cpuRead = function (address) {
        switch (address) {
            case Register.PPUCTRL:
                return this.readCtrl();
            case Register.PPUMASK:
                return this.readMask();
            case Register.PPUSTATUS:
                return this.readStatus();
            case Register.OAMADDR:
                return 0;
            case Register.OAMDATA:
                return this.readOAMData();
            case Register.PPUSCROLL:
                return 0;
            case Register.PPUADDR:
                return 0;
            case Register.PPUDATA:
                return this.readPPUData();
        }
    };
    PPU.prototype.cpuWrite = function (address, data) {
        data &= 0xFF;
        this.previousData = data & 0x1F;
        switch (address) {
            case Register.PPUCTRL:
                this.writeCtrl(data);
                break;
            case Register.PPUMASK:
                this.writeMask(data);
                break;
            case Register.PPUSTATUS:
                break;
            case Register.OAMADDR:
                this.writeOAMAddr(data);
                break;
            case Register.OAMDATA:
                this.writeOAMData(data);
                break;
            case Register.PPUSCROLL:
                this.writeScroll(data);
                break;
            case Register.PPUADDR:
                this.writePPUAddr(data);
                break;
            case Register.PPUDATA:
                this.writePPUData(data);
                break;
        }
    };
    PPU.prototype.dmaCopy = function (data) {
        for (var i = 0; i < 256; i++) {
            this.oamMemory[(i + this.oamAddress) & 0xFF] = data[i];
        }
    };
    PPU.prototype.writeCtrl = function (data) {
        this.controller.data = data;
        // t: ....BA.. ........ = d: ......BA
        this.register.t = this.register.t & 0xF3FF | (data & 0x03) << 10;
    };
    PPU.prototype.readCtrl = function () {
        return this.controller.data;
    };
    PPU.prototype.writeMask = function (data) {
        this.mask.data = data;
    };
    PPU.prototype.readMask = function () {
        return this.mask.data;
    };
    PPU.prototype.readStatus = function () {
        var data = this.status.data | this.previousData;
        // Clear VBlank flag
        this.status.isVBlankStarted = false;
        // w:                  = 0
        this.register.w = 0;
        return data;
    };
    PPU.prototype.writeOAMAddr = function (data) {
        this.oamAddress = data;
    };
    PPU.prototype.readOAMData = function () {
        return this.oamMemory[this.oamAddress];
    };
    PPU.prototype.writeOAMData = function (data) {
        this.oamMemory[this.oamAddress++ & 0xFF] = data;
    };
    PPU.prototype.writeScroll = function (data) {
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
    };
    PPU.prototype.writePPUAddr = function (data) {
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
    };
    PPU.prototype.readPPUData = function () {
        var data = this.bus.readByte(this.register.v);
        if (this.register.v <= 0x3EFF) { // Buffered read
            var tmp = this.readBuffer;
            this.readBuffer = data;
            data = tmp;
        }
        else {
            this.readBuffer = this.bus.readByte(this.register.v - 0x1000);
        }
        this.register.v += this.controller.vramIncrementStepSize;
        this.register.v &= 0x7FFF;
        return data;
    };
    PPU.prototype.writePPUData = function (data) {
        this.bus.writeByte(this.register.v, data);
        this.register.v += this.controller.vramIncrementStepSize;
    };
    PPU.prototype.updateCycle = function () {
        if (this.status.isVBlankStarted && this.controller.isNMIEnabled && this.nmiDelay-- === 0) {
            this.interrupt.nmi();
        }
        this.cycle++;
        if (this.cycle > 340) {
            this.cycle = 0;
            this.scanLine++;
            if (this.scanLine > 261) {
                this.scanLine = 0;
                this.frame++;
                this.onFrame(this.pixels);
            }
        }
        // Set VBlank flag
        if (this.scanLine === 241 && this.cycle === 1) {
            this.status.isVBlankStarted = true;
            // Trigger NMI
            if (this.controller.isNMIEnabled) {
                this.nmiDelay = 15;
            }
        }
        // Clear VBlank flag and Sprite0 Overflow
        if (this.scanLine === 261 && this.cycle === 1) {
            this.status.isVBlankStarted = false;
            this.status.isZeroSpriteHit = false;
            this.status.isSpriteOverflow = false;
        }
        if (this.mask.isShowBackground || this.mask.isShowSprite) {
            this.mapper.ppuClockHandle(this.scanLine, this.cycle);
        }
    };
    PPU.prototype.fetchTileRelatedData = function () {
        if (!this.mask.isShowBackground) {
            return;
        }
        switch (this.cycle & 0x07) {
            case 1:
                this.loadBackground();
                this.fetchNameTable();
                break;
            case 3:
                this.fetchAttributeTable();
                break;
            case 5:
                this.fetchLowBackgroundTileByte();
                break;
            case 7:
                this.fetchHighBackgroundTileByte();
                break;
            case 0:
                this.incrementHorizontalPosition();
                break;
        }
    };
    PPU.prototype.fetchNameTable = function () {
        var address = 0x2000 | (this.register.v & 0x0FFF);
        this.latchs.nameTable = this.bus.readByte(address);
    };
    PPU.prototype.fetchAttributeTable = function () {
        var address = 0x23C0 |
            (this.register.v & 0x0C00) |
            ((this.register.v >> 4) & 0x38) |
            ((this.register.v >> 2) & 0x07);
        var isRight = !!(this.register.v & 0x02);
        var isBottom = !!(this.register.v & 0x40);
        var offset = (isBottom ? 0x02 : 0) | (isRight ? 0x01 : 0);
        this.latchs.attributeTable = this.bus.readByte(address) >> (offset << 1) & 0x03;
    };
    PPU.prototype.fetchLowBackgroundTileByte = function () {
        var address = this.controller.backgroundPatternTableAddress +
            this.latchs.nameTable * 16 +
            (this.register.v >> 12 & 0x07);
        this.latchs.lowBackgorundTailByte = this.bus.readByte(address);
    };
    PPU.prototype.fetchHighBackgroundTileByte = function () {
        var address = this.controller.backgroundPatternTableAddress +
            this.latchs.nameTable * 16 +
            (this.register.v >> 12 & 0x07) + 8;
        this.latchs.highBackgorundTailByte = this.bus.readByte(address);
    };
    PPU.prototype.loadBackground = function () {
        this.shiftRegister.lowBackgorundTailBytes |= this.latchs.lowBackgorundTailByte;
        this.shiftRegister.highBackgorundTailBytes |= this.latchs.highBackgorundTailByte;
        this.shiftRegister.lowBackgroundAttributeByes |= (this.latchs.attributeTable & 0x01) ? 0xFF : 0;
        this.shiftRegister.highBackgroundAttributeByes |= (this.latchs.attributeTable & 0x02) ? 0xFF : 0;
    };
    PPU.prototype.shiftBackground = function () {
        if (!this.mask.isShowBackground) {
            return;
        }
        this.shiftRegister.lowBackgorundTailBytes <<= 1;
        this.shiftRegister.highBackgorundTailBytes <<= 1;
        this.shiftRegister.lowBackgroundAttributeByes <<= 1;
        this.shiftRegister.highBackgroundAttributeByes <<= 1;
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
    PPU.prototype.renderPixel = function () {
        var x = this.cycle - 1;
        var y = this.scanLine;
        var offset = 0x8000 >> this.register.x;
        var bit0 = this.shiftRegister.lowBackgorundTailBytes & offset ? 1 : 0;
        var bit1 = this.shiftRegister.highBackgorundTailBytes & offset ? 1 : 0;
        var bit2 = this.shiftRegister.lowBackgroundAttributeByes & offset ? 1 : 0;
        var bit3 = this.shiftRegister.highBackgroundAttributeByes & offset ? 1 : 0;
        var paletteIndex = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0 << 0;
        var spritePaletteIndex = this.spritePixels[x] & SpritePixel.PALETTE;
        var isTransparentSprite = spritePaletteIndex % 4 === 0 || !this.mask.isShowSprite;
        var isTransparentBackground = paletteIndex % 4 === 0 || !this.mask.isShowBackground;
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
                // Sprite 0 hit does not happen:
                //   - If background or sprite rendering is disabled in PPUMASK ($2001)
                //   - At x=0 to x=7 if the left-side clipping window is enabled (if bit 2 or bit 1 of PPUMASK is 0).
                //   - At x=255, for an obscure reason related to the pixel pipeline.
                //   - At any pixel where the background or sprite pixel is transparent (2-bit color index from the CHR pattern is %00).
                //   - If sprite 0 hit has already occurred this frame. Bit 6 of PPUSTATUS ($2002) is cleared to 0 at dot 1 of the pre-render line.
                //     This means only the first sprite 0 hit in a frame can be detected.
                if (this.spritePixels[x] & SpritePixel.ZERO) {
                    if ((!this.mask.isShowBackground || !this.mask.isShowSprite) ||
                        (0 <= x && x <= 7 && (!this.mask.isShowSpriteLeft8px || !this.mask.isShowBackgroundLeft8px)) ||
                        x === 255
                    // TODO: Only the first sprite 0 hit in a frame can be detected.
                    ) {
                        // Sprite 0 hit does not happen
                    }
                    else {
                        this.status.isZeroSpriteHit = true;
                    }
                }
                address = this.spritePixels[x] & SpritePixel.BEHIND_BG ? 0x3F00 + paletteIndex : 0x3F10 + spritePaletteIndex;
            }
        }
        this.pixels[x + y * 256] = this.bus.readByte(address);
    };
    PPU.prototype.clearSecondaryOam = function () {
        if (!this.mask.isShowSprite) {
            return;
        }
        this.secondaryOam.forEach(function (oam) {
            oam.attributes = 0xFF;
            oam.tileIndex = 0xFF;
            oam.x = 0xFF;
            oam.y = 0xFF;
        });
    };
    PPU.prototype.evalSprite = function () {
        if (!this.mask.isShowSprite) {
            return;
        }
        var spriteCount = 0;
        // Find eligible sprites
        for (var i = 0; i < 64; i++) {
            var y = this.oamMemory[i * 4];
            if (this.scanLine < y || (this.scanLine >= y + this.controller.spriteSize)) {
                continue;
            }
            // Overflow?
            if (spriteCount === 8) {
                this.status.isSpriteOverflow = true;
                break;
            }
            var oam = this.secondaryOam[spriteCount++];
            oam.y = y;
            oam.tileIndex = this.oamMemory[i * 4 + 1];
            oam.attributes = this.oamMemory[i * 4 + 2];
            oam.x = this.oamMemory[i * 4 + 3];
            oam.isZero = i === 0;
        }
    };
    PPU.prototype.fetchSprite = function () {
        if (!this.mask.isShowSprite) {
            return;
        }
        this.spritePixels.fill(0);
        for (var _i = 0, _a = this.secondaryOam.reverse(); _i < _a.length; _i++) {
            var sprite = _a[_i];
            // Hidden sprite?
            if (sprite.y >= 0xEF) {
                continue;
            }
            var isBehind = !!(sprite.attributes & SpriteAttribute.PRIORITY);
            var isZero = sprite.isZero;
            var isFlipH = !!(sprite.attributes & SpriteAttribute.FLIP_H);
            var isFlipV = !!(sprite.attributes & SpriteAttribute.FLIP_V);
            // Caculate tile address
            var address = void 0;
            if (this.controller.spriteSize === SpriteSize.SIZE_8X8) {
                var baseAddress = this.controller.spritePatternTableAddress + (sprite.tileIndex << 4);
                var offset = isFlipV ? (7 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
                address = baseAddress + offset;
            }
            else {
                var baseAddress = ((sprite.tileIndex & 0x01) ? 0x1000 : 0x0000) + ((sprite.tileIndex & 0xFE) << 4);
                var offset = isFlipV ? (15 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
                address = baseAddress + offset % 8 + Math.floor(offset / 8) * 16;
            }
            // Fetch tile data
            var tileL = this.bus.readByte(address);
            var tileH = this.bus.readByte(address + 8);
            // Generate sprite pixels
            for (var i = 0; i < 8; i++) {
                var b = isFlipH ? 0x01 << i : 0x80 >> i;
                var bit0 = tileL & b ? 1 : 0;
                var bit1 = tileH & b ? 1 : 0;
                var bit2 = sprite.attributes & SpriteAttribute.PALETTE_L ? 1 : 0;
                var bit3 = sprite.attributes & SpriteAttribute.PALETTE_H ? 1 : 0;
                var index = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0;
                if (index % 4 === 0 && (this.spritePixels[sprite.x + i] & SpritePixel.PALETTE) % 4 !== 0) {
                    continue;
                }
                this.spritePixels[sprite.x + i] = index |
                    (isBehind ? SpritePixel.BEHIND_BG : 0) |
                    (isZero ? SpritePixel.ZERO : 0);
            }
        }
    };
    return PPU;
}());