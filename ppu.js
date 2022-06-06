// PPU memory map: https://wiki.nesdev.com/w/index.php/PPU_memory_map
function PPUBus(nes) {
  this.nes = nes;
  this.ram = new Uint8Array(0x1000); // 2K
  this.backgroundPallette = new Uint8Array(16); // 16B
  this.spritePallette = new Uint8Array(16); // 16B
}

PPUBus.prototype.readByte = function(address) {
  address &= 0x3FFF;

  if (address < 0x2000) {
    // Pattern table 0 - 1
    return this.nes.mapper.readByte(address);
  } else if (address < 0x3000) {
    // Nametable 0 - 3
    return this.ram[this.parseMirrorAddress(address) - 0x2000];
  } else if (address < 0x3F00) {
    // Mirrors of $2000-$2EFF
    return this.readByte(address - 0x1000);
  } else {
    // Palette RAM indexes
    address &= 0x3F1F;

    if (address < 0x3F10) { // Background pallette
      return this.backgroundPallette[address - 0x3F00];
    } else { // Sprite pallette
      // Refer to https://wiki.nesdev.com/w/index.php/PPU_palettes
      // Addresses $3F10/$3F14/$3F18/$3F1C are mirrors of $3F00/$3F04/$3F08/$3F0C
      if (!(address & 0b11)) {
        address -= 0x10;
        return this.backgroundPallette[address - 0x3F00];
      }

      return this.spritePallette[address - 0x3F10];
    }
  }
}

PPUBus.prototype.writeByte = function(address, data) {
  address &= 0x3FFF;

  if (address < 0x2000) {
    // Pattern table 0 - 1
    this.nes.mapper.writeByte(address, data);
  } else if (address < 0x3000) {
    // Nametable 0 - 3
    this.ram[this.parseMirrorAddress(address) - 0x2000] = data;
  } else if (address < 0x3F00) {
    // Mirrors of $2000-$2EFF
    return this.writeByte(address - 0x1000, data);
  } else {
    // Palette RAM indexes
    address &= 0x3F1F;

    if (address < 0x3F10) { // Background pallette
      this.backgroundPallette[address - 0x3F00] = data;
    } else { // Sprite pallette
      // Refer to https://wiki.nesdev.com/w/index.php/PPU_palettes
      // Addresses $3F10/$3F14/$3F18/$3F1C are mirrors of $3F00/$3F04/$3F08/$3F0C
      if (!(address & 0b11)) {
        address -= 0x10;
        this.backgroundPallette[address - 0x3F00] = data;
      }

      this.spritePallette[address - 0x3F10] = data;
    }
  }
}

PPUBus.prototype.readWord = function(address) {
  return this.readByte(address + 1) << 8 | this.readByte(address);
}

PPUBus.prototype.writeWord = function(address, data) {
  this.writeByte(address, data);
  this.writeByte(address + 1, data >> 8)
}

PPUBus.prototype.parseMirrorAddress = function(addr) {
    if(this.nes.fourScreen) {
        return addr;
    } else {
        if(this.mirroring) {
            return addr & 0x27ff;
        } else {
            return (addr & 0x23ff) | (addr & 0x0800 ? 0x0400 : 0);
        }
    }
}


var BaseNameTableAddressList = [0x2000, 0x2400, 0x2800, 0x2C00];

var SpriteSize = {
  SIZE_8X8 : 8,
  SIZE_8X16 : 16,
}

var Register = {
  PPUCTRL : 0x2000, // RW
  PPUMASK : 0x2001, // RW
  PPUSTATUS : 0x2002, // R
  OAMADDR	: 0x2003, // W
  OAMDATA	: 0x2004, // RW
  PPUSCROLL	: 0x2005, // W
  PPUADDR	: 0x2006, // W
  PPUDATA	: 0x2007, // RW
}

var SpriteAttribute = {
  PALETTE_L : 0x01,
  PALETTE_H : 0x02,
  PRIORITY : 0x20,
  FLIP_H : 0x40,
  FLIP_V : 0x80,
}

var SpritePixel = {
  PALETTE : 0x3F,
  BEHIND_BG : 0x40,
  ZERO : 0x80,
}

function PPU(nes) {
  nes.ppu = this;
  this.nes = nes;
  this.bus = new PPUBus(nes);
  this.pixels = new Uint8Array(256 * 240); // NES color
  this.oamMemory = new Uint8Array(256);

  this.controller = {
      baseNameTableAddress : BaseNameTableAddressList[0],
      vramIncrementStepSize : 1,
      spritePatternTableAddress : 0,
      backgroundPatternTableAddress : 0,
      spriteSize : SpriteSize.SIZE_8X8,
      isNMIEnabled : false,
  };
  this.mask = {
      isColorful : false,
      isShowBackgroundLeft8px : false,
      isShowSpriteLeft8px : false,
      isShowBackground : false,
      isShowSprite : false,
      isEmphasizeRed : false,
      isEmphasizeGreen : false,
      isEmphasizeBlue : false,
  };
  this.register = {v: 0, t: 0, x: 0, w: 0};
  this.shiftRegister = {};
  this.latchs = {};
  this.status = {
      isSpriteOverflow : false,
      isZeroSpriteHit : false,
      isVBlankStarted : false,
  };
  this.nmiDelay = 0;

  // The PPUDATA read buffer (post-fetch): https://wiki.nesdev.com/w/index.php/PPU_registers#The_PPUDATA_read_buffer_.28post-fetch.29
  this.readBuffer = 0;

  this.frame = 0; // Frame counter
  this.scanLine = 240; // 0 ~ 261
  this.cycle = 340; // 0 ~ 340

  this.oamAddress = 0;
  this.secondaryOam = Array(8).fill(0).map(() => Object.create(null));
  this.spritePixels = new Array(256);

  // Least significant bits previously written into a PPU register
  this.previousData = 0;
}

// PPU timing: https://wiki.nesdev.com/w/images/4/4f/Ppu.svg
PPU.prototype.clock = function() {
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
}

PPU.prototype.cpuRead = function(address) {
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
}

PPU.prototype.cpuWrite = function(address, data) {
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
}

PPU.prototype.dmaCopy = function(data) {
  for (let i = 0; i < 256; i++) {
    this.oamMemory[(i + this.oamAddress) & 0xFF] = data[i];
  }
}

PPU.prototype.writeCtrl = function(data) {
  this.setController(data);

  // t: ....BA.. ........ = d: ......BA
  this.register.t = this.register.t & 0xF3FF | (data & 0x03) << 10;
}

PPU.prototype.readCtrl = function() {
  return this.getController();
}

PPU.prototype.writeMask = function(data)  {
  this.setMask(data);
}

PPU.prototype.readMask = function() {
  return this.getMask();
}

PPU.prototype.readStatus = function() {
  const data = this.getStatus() | this.previousData;

  // Clear VBlank flag
  this.status.isVBlankStarted = false;

  // w:                  = 0
  this.register.w = 0;

  return data;
}

PPU.prototype.writeOAMAddr = function(data)  {
  this.oamAddress = data;
}

PPU.prototype.readOAMData = function() {
  return this.oamMemory[this.oamAddress];
}

PPU.prototype.writeOAMData = function(data)  {
  this.oamMemory[this.oamAddress++ & 0xFF] = data;
}

PPU.prototype.writeScroll = function(data)  {
  if (this.register.w === 0) {
    // t: ....... ...HGFED = d: HGFED...
    // x:              CBA = d: .....CBA
    // w:                  = 1
    this.register.t = this.register.t & 0xFFE0 | data >> 3;
    this.register.x = data & 0x07;
    this.register.w = 1;
  } else {
    // t: CBA..HG FED..... = d: HGFEDCBA
    // w:                  = 0
    this.register.t = this.register.t & 0x0C1F | (data & 0x07) << 12 | (data & 0xF8) << 2;
    this.register.w = 0;
  }
}

PPU.prototype.writePPUAddr = function(data)  {
  if (this.register.w === 0) {
    // t: .FEDCBA ........ = d: ..FEDCBA
    // t: X...... ........ = 0
    // w:                  = 1
    this.register.t = this.register.t & 0x80FF | (data & 0x3F) << 8;
    this.register.w = 1;
  } else {
    // t: ....... HGFEDCBA = d: HGFEDCBA
    // v                   = t
    // w:                  = 0
    this.register.t = this.register.t & 0xFF00 | data;
    this.register.v = this.register.t;
    this.register.w = 0;
  }
}

PPU.prototype.readPPUData = function() {
  let data = this.bus.readByte(this.register.v);

  if (this.register.v <= 0x3EFF) { // Buffered read
    const tmp = this.readBuffer;
    this.readBuffer = data;
    data = tmp;
  } else {
    this.readBuffer = this.bus.readByte(this.register.v - 0x1000);
  }

  this.register.v += this.controller.vramIncrementStepSize;
  this.register.v &= 0x7FFF;

  return data;
}

PPU.prototype.writePPUData = function(data)  {
  this.bus.writeByte(this.register.v, data);

  this.register.v += this.controller.vramIncrementStepSize;
}

PPU.prototype.updateCycle = function() {
  if (this.status.isVBlankStarted && this.controller.isNMIEnabled && this.nmiDelay-- === 0) {
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
    this.nes.mapper.handlePPUClock(this.scanLine, this.cycle);
  }
}

PPU.prototype.fetchTileRelatedData = function() {
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
}

PPU.prototype.fetchNameTable = function() {
  const address = 0x2000 | (this.register.v & 0x0FFF);

  this.latchs.nameTable = this.bus.readByte(address);
}

PPU.prototype.fetchAttributeTable = function() {
  const address = 0x23C0 |
    (this.register.v & 0x0C00) |
    ((this.register.v >> 4) & 0x38) |
    ((this.register.v >> 2) & 0x07);

  const isRight = !!(this.register.v & 0x02);
  const isBottom = !!(this.register.v & 0x40);

  const offset = (isBottom ? 0x02 : 0) | (isRight ? 0x01 : 0);

  this.latchs.attributeTable = this.bus.readByte(address) >> (offset << 1) & 0x03;
}

PPU.prototype.fetchLowBackgroundTileByte = function() {
  const address = this.controller.backgroundPatternTableAddress +
    this.latchs.nameTable * 16 +
    (this.register.v >> 12 & 0x07);

  this.latchs.lowBackgorundTailByte = this.bus.readByte(address);
}

PPU.prototype.fetchHighBackgroundTileByte = function() {
  const address = this.controller.backgroundPatternTableAddress +
    this.latchs.nameTable * 16 +
    (this.register.v >> 12 & 0x07) + 8;

  this.latchs.highBackgorundTailByte = this.bus.readByte(address);
}

PPU.prototype.loadBackground = function() {
  this.shiftRegister.lowBackgorundTailBytes |= this.latchs.lowBackgorundTailByte;
  this.shiftRegister.highBackgorundTailBytes |= this.latchs.highBackgorundTailByte;
  this.shiftRegister.lowBackgroundAttributeByes |= (this.latchs.attributeTable & 0x01) ? 0xFF : 0;
  this.shiftRegister.highBackgroundAttributeByes |= (this.latchs.attributeTable & 0x02) ? 0xFF : 0;
}

PPU.prototype.shiftBackground = function() {
  if (!this.mask.isShowBackground) {
    return;
  }

  this.shiftRegister.lowBackgorundTailBytes <<= 1;
  this.shiftRegister.highBackgorundTailBytes <<= 1;
  this.shiftRegister.lowBackgroundAttributeByes <<= 1;
  this.shiftRegister.highBackgroundAttributeByes <<= 1;
}

// Between cycle 328 of a scanline, and 256 of the next scanline
PPU.prototype.incrementHorizontalPosition = function() {
  if ((this.register.v & 0x001F) === 31) {
    this.register.v &= ~0x001F;
    this.register.v ^= 0x0400;
  } else {
    this.register.v += 1;
  }
}

// At cycle 256 of each scanline
PPU.prototype.incrementVerticalPosition = function() {
  if ((this.register.v & 0x7000) !== 0x7000) {
    this.register.v += 0x1000;
  } else {
    this.register.v &= ~0x7000;
    let y = (this.register.v & 0x03E0) >> 5;
    if (y === 29) {
      y = 0;
      this.register.v ^= 0x0800;
    } else if (y === 31) {
      y = 0;
    } else {
      y += 1;
    }
    this.register.v = (this.register.v & ~0x03E0) | (y << 5);
  }
}

// At cycle 257 of each scanline
PPU.prototype.copyHorizontalBits = function() {
  // v: ....F.. ...EDCBA = t: ....F.. ...EDCBA
  this.register.v = (this.register.v & 0b1111101111100000) | (this.register.t & ~0b1111101111100000) & 0x7FFF;
}

// During cycles 280 to 304 of the pre-render scanline (end of vblank)
PPU.prototype.copyVerticalBits = function() {
  // v: IHGF.ED CBA..... = t: IHGF.ED CBA.....
  this.register.v = (this.register.v & 0b1000010000011111) | (this.register.t & ~0b1000010000011111) & 0x7FFF;
}

PPU.prototype.renderPixel = function() {
  const x = this.cycle - 1;
  const y = this.scanLine;

  const offset = 0x8000 >> this.register.x;
  const bit0 = this.shiftRegister.lowBackgorundTailBytes & offset ? 1 : 0;
  const bit1 = this.shiftRegister.highBackgorundTailBytes & offset ? 1 : 0;
  const bit2 = this.shiftRegister.lowBackgroundAttributeByes & offset ? 1 : 0;
  const bit3 = this.shiftRegister.highBackgroundAttributeByes & offset ? 1 : 0;

  const paletteIndex = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0 << 0;
  const spritePaletteIndex = this.spritePixels[x] & SpritePixel.PALETTE;

  const isTransparentSprite = spritePaletteIndex % 4 === 0 || !this.mask.isShowSprite;
  const isTransparentBackground = paletteIndex % 4 === 0 || !this.mask.isShowBackground;

  let address = 0x3F00;
  if (isTransparentBackground) {
    if (isTransparentSprite) {
      // Do nothing
    } else {
      address = 0x3F10 + spritePaletteIndex;
    }
  } else {
    if (isTransparentSprite) {
      address = 0x3F00 + paletteIndex;
    } else {
      // Sprite 0 hit does not happen:
      //   - If background or sprite rendering is disabled in PPUMASK ($2001)
      //   - At x=0 to x=7 if the left-side clipping window is enabled (if bit 2 or bit 1 of PPUMASK is 0).
      //   - At x=255, for an obscure reason related to the pixel pipeline.
      //   - At any pixel where the background or sprite pixel is transparent (2-bit color index from the CHR pattern is %00).
      //   - If sprite 0 hit has already occurred this frame. Bit 6 of PPUSTATUS ($2002) is cleared to 0 at dot 1 of the pre-render line.
      //     This means only the first sprite 0 hit in a frame can be detected.
      if (this.spritePixels[x] & SpritePixel.ZERO) {
        if (
          (!this.mask.isShowBackground || !this.mask.isShowSprite) ||
          (0 <= x && x <= 7 && (!this.mask.isShowSpriteLeft8px || !this.mask.isShowBackgroundLeft8px)) ||
          x === 255
          // TODO: Only the first sprite 0 hit in a frame can be detected.
        ) {
          // Sprite 0 hit does not happen
        } else {
          this.status.isZeroSpriteHit = true;
        }
      }
      address = this.spritePixels[x] & SpritePixel.BEHIND_BG ? 0x3F00 + paletteIndex : 0x3F10 + spritePaletteIndex;
    }
  }

  this.pixels[x + y * 256] = this.bus.readByte(address);
}

PPU.prototype.clearSecondaryOam = function() {
  if (!this.mask.isShowSprite) {
    return;
  }

  this.secondaryOam.forEach(oam => {
    oam.attributes = 0xFF;
    oam.tileIndex = 0xFF;
    oam.x = 0xFF;
    oam.y = 0xFF;
  });
}

PPU.prototype.evalSprite = function() {
  if (!this.mask.isShowSprite) {
    return;
  }

  let spriteCount = 0;

  // Find eligible sprites
  for (let i = 0; i < 64; i++) {
    const y = this.oamMemory[i * 4];
    if (this.scanLine < y || (this.scanLine >= y + this.controller.spriteSize)) {
      continue;
    }

    // Overflow?
    if (spriteCount === 8) {
      this.status.isSpriteOverflow = true;
      break;
    }

    const oam = this.secondaryOam[spriteCount++];
    oam.y = y;
    oam.tileIndex = this.oamMemory[i * 4 + 1];
    oam.attributes = this.oamMemory[i * 4 + 2];
    oam.x = this.oamMemory[i * 4 + 3];
    oam.isZero = i === 0;
  }
}

PPU.prototype.fetchSprite = function() {
  if (!this.mask.isShowSprite) {
    return;
  }

  this.spritePixels.fill(0);

  for (const sprite of this.secondaryOam.reverse()) {
    // Hidden sprite?
    if (sprite.y >= 0xEF) {
      continue;
    }

    const isBehind = !!(sprite.attributes & SpriteAttribute.PRIORITY);
    const isZero = sprite.isZero;
    const isFlipH = !!(sprite.attributes & SpriteAttribute.FLIP_H);
    const isFlipV = !!(sprite.attributes & SpriteAttribute.FLIP_V);

    // Caculate tile address
    let address;
    if (this.controller.spriteSize === SpriteSize.SIZE_8X8) {
      const baseAddress = this.controller.spritePatternTableAddress + (sprite.tileIndex << 4);
      const offset = isFlipV ? (7 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
      address = baseAddress + offset;
    } else {
      const baseAddress = ((sprite.tileIndex & 0x01) ? 0x1000 : 0x0000) + ((sprite.tileIndex & 0xFE) << 4);
      const offset = isFlipV ? (15 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
      address = baseAddress + offset % 8 + Math.floor(offset / 8) * 16;
    }

    // Fetch tile data
    const tileL = this.bus.readByte(address);
    const tileH = this.bus.readByte(address + 8);

    // Generate sprite pixels
    for (let i = 0; i < 8; i++) {
      const b = isFlipH ? 0x01 << i : 0x80 >> i;

      const bit0 = tileL & b ? 1 : 0;
      const bit1 = tileH & b ? 1 : 0;
      const bit2 = sprite.attributes & SpriteAttribute.PALETTE_L ? 1 : 0;
      const bit3 = sprite.attributes & SpriteAttribute.PALETTE_H ? 1 : 0;
      const index = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0;

      if (index % 4 === 0 && (this.spritePixels[sprite.x + i] & SpritePixel.PALETTE) % 4 !== 0) {
        continue;
      }

      this.spritePixels[sprite.x + i] = index |
        (isBehind ? SpritePixel.BEHIND_BG : 0) |
        (isZero ? SpritePixel.ZERO : 0);
    }
  }
}

PPU.prototype.setController = function(data) {
    this.controller.baseNameTableAddress = BaseNameTableAddressList[data & 0x03];
    this.controller.vramIncrementStepSize = data & 0x04 ? 32 : 1;
    this.controller.spritePatternTableAddress = data & 0x08 ? 0x1000 : 0;
    this.controller.backgroundPatternTableAddress = data & 0x10 ? 0x1000 : 0;
    this.controller.spriteSize = data & 0x20 ? SpriteSize.SIZE_8X16 : SpriteSize.SIZE_8X8;
    this.controller.isNMIEnabled = !!(data & 0x80);
};

PPU.prototype.getController = function() {
    return BaseNameTableAddressList.indexOf(this.controller.baseNameTableAddress) |
      (this.controller.vramIncrementStepSize === 1 ? 0 : 1) << 2 |
      (this.controller.spritePatternTableAddress ? 1 : 0) << 3 |
      (this.controller.backgroundPatternTableAddress ? 1 : 0) << 4 |
      (this.controller.spriteSize === SpriteSize.SIZE_8X8 ? 0 : 1) << 5 |
      (this.controller.isNMIEnabled ? 1 : 0) << 7;
};

PPU.prototype.setMask = function(data) {
    this.mask.isColorful = !(data & 0x01);
    this.mask.isShowBackgroundLeft8px = !!(data & 0x02);
    this.mask.isShowSpriteLeft8px = !!(data & 0x04);
    this.mask.isShowBackground = !!(data & 0x08);
    this.mask.isShowSprite = !!(data & 0x10);
    this.mask.isEmphasizeRed = !!(data & 0x20);
    this.mask.isEmphasizeGreen = !!(data & 0x40);
    this.mask.isEmphasizeBlue = !!(data & 0x80);
};

PPU.prototype.getMask = function() {
    return (this.mask.isColorful ? 0 : 1) |
      (this.mask.isShowBackgroundLeft8px ? 1 : 0) << 1 |
      (this.mask.isShowSpriteLeft8px ? 1 : 0) << 2 |
      (this.mask.isShowBackground ? 1 : 0) << 3 |
      (this.mask.isShowSprite ? 1 : 0) << 4 |
      (this.mask.isEmphasizeRed ? 1 : 0) << 5 |
      (this.mask.isEmphasizeGreen ? 1 : 0) << 6 |
      (this.mask.isEmphasizeBlue ? 1 : 0) << 7;
};

PPU.prototype.getStatus = function() {
    return (this.status.isSpriteOverflow ? 0x20 : 0) |
      (this.status.isZeroSpriteHit ? 0x40 : 0) |
      (this.status.isVBlankStarted ? 0x80 : 0);
};
