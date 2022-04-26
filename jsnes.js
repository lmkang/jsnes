var Mappers = {};

Mappers[0] = function() {
    
};

Mappers[0].prototype.load = function(nes) {
    var cpu = nes.cpu;
    var ppu = nes.ppu;
    var prgBuf = nes.prgBuf;
    // load PRG-ROM
    if(nes.prgCount > 1) {
        cpu.mem.set(prgBuf, 0x8000);
    } else {
        cpu.mem.set(prgBuf, 0x8000);
        cpu.mem.set(prgBuf, 0xc000);
    }
    // load CHR-ROM
    
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

var Opcode = Object.freeze({
    ADC: 0,
    AND: 1,
    ASL: 2,
    BCC: 3,
    BCS: 4,
    BEQ: 5,
    BIT: 6,
    BMI: 7,
    BNE: 8,
    BPL: 9,
    BRK: 10,
    BVC: 11,
    BVS: 12,
    CLC: 13,
    CLD: 14,
    CLI: 15,
    CLV: 16,
    CMP: 17,
    CPX: 18,
    CPY: 19,
    DEC: 20,
    DEX: 21,
    DEY: 22,
    EOR: 23,
    INC: 24,
    INX: 25,
    INY: 26,
    JMP: 27,
    JSR: 28,
    LDA: 29,
    LDX: 30,
    LDY: 31,
    LSR: 32,
    NOP: 33,
    ORA: 34,
    PHA: 35,
    PHP: 36,
    PLA: 37,
    PLP: 38,
    ROL: 39,
    ROR: 40,
    RTI: 41,
    RTS: 42,
    SBC: 43,
    SEC: 44,
    SED: 45,
    SEI: 46,
    STA: 47,
    STX: 48,
    STY: 49,
    TAX: 50,
    TAY: 51,
    TSX: 52,
    TXA: 53,
    TXS: 54,
    TYA: 55,
    ALR: 56,
    ANC: 57,
    ARR: 58,
    AXS: 59,
    LAX: 60,
    SAX: 61,
    DCP: 62,
    ISC: 63,
    RLA: 64,
    RRA: 65,
    SLO: 66,
    SRE: 67,
    SKB: 68,
    IGN: 69,
});

var AddrMode = Object.freeze({
    ZERO_PAGE: 0,
    RELATIVE: 1,
    IMPLIED: 2,
    ABSOLUTE: 3,
    ACCUMULATOR: 4,
    IMMEDIATE: 5,
    ZERO_PAGE_X: 6,
    ZERO_PAGE_Y: 7,
    ABSOLUTE_X: 8,
    ABSOLUTE_Y: 9,
    INDIRECT_X: 10,
    INDIRECT_Y: 11,
    INDIRECT: 12,
});

var OP_DATA = Object.freeze({
    // http://6502.org/tutorials/6502opcodes.html
    
    // ADC
    0x69: {name: Opcode.ADC, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x65: {name: Opcode.ADC, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x75: {name: Opcode.ADC, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0x6D: {name: Opcode.ADC, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0x7D: {name: Opcode.ADC, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0x79: {name: Opcode.ADC, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 4},
    0x61: {name: Opcode.ADC, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0x71: {name: Opcode.ADC, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 5},
    
    // AND
    0x29: {name: Opcode.AND, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x25: {name: Opcode.AND, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x35: {name: Opcode.AND, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0x2D: {name: Opcode.AND, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0x3D: {name: Opcode.AND, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0x39: {name: Opcode.AND, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 4},
    0x21: {name: Opcode.AND, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0x31: {name: Opcode.AND, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 5},

    // ASL
    0x0A: {name: Opcode.ASL, mode: AddrMode.ACCUMULATOR, len: 1, cycle: 2},
    0x06: {name: Opcode.ASL, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0x16: {name: Opcode.ASL, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0x0E: {name: Opcode.ASL, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0x1E: {name: Opcode.ASL, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    
    // BIT
    0x24: {name: Opcode.BIT, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x2C: {name: Opcode.BIT, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    
    // Branch Instructions
    0x10: {name: Opcode.BPL, mode: AddrMode.RELATIVE   , len: 2, cycle: 2},
    0x30: {name: Opcode.BMI, mode: AddrMode.RELATIVE   , len: 2, cycle: 2},
    0x50: {name: Opcode.BVC, mode: AddrMode.RELATIVE   , len: 2, cycle: 2},
    0x70: {name: Opcode.BVS, mode: AddrMode.RELATIVE   , len: 2, cycle: 2},
    0x90: {name: Opcode.BCC, mode: AddrMode.RELATIVE   , len: 2, cycle: 2},
    0xB0: {name: Opcode.BCS, mode: AddrMode.RELATIVE   , len: 2, cycle: 2},
    0xD0: {name: Opcode.BNE, mode: AddrMode.RELATIVE   , len: 2, cycle: 2},
    0xF0: {name: Opcode.BEQ, mode: AddrMode.RELATIVE   , len: 2, cycle: 2},
    
    // BRK
    0x00: {name: Opcode.BRK, mode: AddrMode.IMPLIED    , len: 1, cycle: 7},
    
    // CMP
    0xC9: {name: Opcode.CMP, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xC5: {name: Opcode.CMP, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0xD5: {name: Opcode.CMP, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0xCD: {name: Opcode.CMP, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0xDD: {name: Opcode.CMP, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0xD9: {name: Opcode.CMP, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 4},
    0xC1: {name: Opcode.CMP, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0xD1: {name: Opcode.CMP, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 5},
    
    // CPX
    0xE0: {name: Opcode.CPX, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xE4: {name: Opcode.CPX, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0xEC: {name: Opcode.CPX, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    
    // CPY
    0xC0: {name: Opcode.CPY, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xC4: {name: Opcode.CPY, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0xCC: {name: Opcode.CPY, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    
    // DEC
    0xC6: {name: Opcode.DEC, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0xD6: {name: Opcode.DEC, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0xCE: {name: Opcode.DEC, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0xDE: {name: Opcode.DEC, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    
    // EOR
    0x49: {name: Opcode.EOR, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x45: {name: Opcode.EOR, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x55: {name: Opcode.EOR, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0x4D: {name: Opcode.EOR, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0x5D: {name: Opcode.EOR, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0x59: {name: Opcode.EOR, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 4},
    0x41: {name: Opcode.EOR, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0x51: {name: Opcode.EOR, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 5},
    
    // Flag(Processor Status) Instructions
    0x18: {name: Opcode.CLC, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0x38: {name: Opcode.SEC, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0x58: {name: Opcode.CLI, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0x78: {name: Opcode.SEI, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0xB8: {name: Opcode.CLV, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0xD8: {name: Opcode.CLD, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0xF8: {name: Opcode.SED, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    
    // INC
    0xE6: {name: Opcode.INC, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0xF6: {name: Opcode.INC, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0xEE: {name: Opcode.INC, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0xFE: {name: Opcode.INC, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    
    // JMP
    0x4C: {name: Opcode.JMP, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 3},
    0x6C: {name: Opcode.JMP, mode: AddrMode.INDIRECT   , len: 3, cycle: 5},
    
    // JSR
    0x20: {name: Opcode.JSR, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    
    // LDA
    0xA9: {name: Opcode.LDA, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xA5: {name: Opcode.LDA, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0xB5: {name: Opcode.LDA, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0xAD: {name: Opcode.LDA, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0xBD: {name: Opcode.LDA, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0xB9: {name: Opcode.LDA, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 4},
    0xA1: {name: Opcode.LDA, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0xB1: {name: Opcode.LDA, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 5},
    
    // LDX
    0xA2: {name: Opcode.LDX, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xA6: {name: Opcode.LDX, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0xB6: {name: Opcode.LDX, mode: AddrMode.ZERO_PAGE_Y, len: 2, cycle: 4},
    0xAE: {name: Opcode.LDX, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0xBE: {name: Opcode.LDX, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 4},
    
    // LDY
    0xA0: {name: Opcode.LDY, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xA4: {name: Opcode.LDY, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0xB4: {name: Opcode.LDY, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0xAC: {name: Opcode.LDY, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0xBC: {name: Opcode.LDY, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    
    // LSR
    0x4A: {name: Opcode.LSR, mode: AddrMode.ACCUMULATOR, len: 1, cycle: 2},
    0x46: {name: Opcode.LSR, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0x56: {name: Opcode.LSR, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0x4E: {name: Opcode.LSR, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0x5E: {name: Opcode.LSR, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    
    // NOP
    0xEA: {name: Opcode.NOP, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    
    // ORA
    0x09: {name: Opcode.ORA, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x05: {name: Opcode.ORA, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x15: {name: Opcode.ORA, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0x0D: {name: Opcode.ORA, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0x1D: {name: Opcode.ORA, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0x19: {name: Opcode.ORA, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 4},
    0x01: {name: Opcode.ORA, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0x11: {name: Opcode.ORA, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 5},
    
    // Register Instructions
    0xAA: {name: Opcode.TAX, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0x8A: {name: Opcode.TXA, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0xCA: {name: Opcode.DEX, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0xE8: {name: Opcode.INX, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0xA8: {name: Opcode.TAY, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0x98: {name: Opcode.TYA, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0x88: {name: Opcode.DEY, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0xC8: {name: Opcode.INY, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    
    // ROL
    0x2A: {name: Opcode.ROL, mode: AddrMode.ACCUMULATOR, len: 1, cycle: 2},
    0x26: {name: Opcode.ROL, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0x36: {name: Opcode.ROL, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0x2E: {name: Opcode.ROL, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0x3E: {name: Opcode.ROL, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    
    // ROR
    0x6A: {name: Opcode.ROR, mode: AddrMode.ACCUMULATOR, len: 1, cycle: 2},
    0x66: {name: Opcode.ROR, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0x76: {name: Opcode.ROR, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0x6E: {name: Opcode.ROR, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0x7E: {name: Opcode.ROR, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    
    // RTI
    0x40: {name: Opcode.RTI, mode: AddrMode.IMPLIED    , len: 1, cycle: 6},
    
    // RTS
    0x60: {name: Opcode.RTS, mode: AddrMode.IMPLIED    , len: 1, cycle: 6},
    
    // SBC
    0xE9: {name: Opcode.SBC, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xE5: {name: Opcode.SBC, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0xF5: {name: Opcode.SBC, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0xED: {name: Opcode.SBC, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0xFD: {name: Opcode.SBC, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0xF9: {name: Opcode.SBC, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 4},
    0xE1: {name: Opcode.SBC, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0xF1: {name: Opcode.SBC, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 5},
    
    // STA
    0x85: {name: Opcode.STA, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x95: {name: Opcode.STA, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0x8D: {name: Opcode.STA, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0x9D: {name: Opcode.STA, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 5},
    0x99: {name: Opcode.STA, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 5},
    0x81: {name: Opcode.STA, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0x91: {name: Opcode.STA, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 6},
    
    // Stack Instructions
    0x9A: {name: Opcode.TXS, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0xBA: {name: Opcode.TSX, mode: AddrMode.IMPLIED    , len: 1, cycle: 2},
    0x48: {name: Opcode.PHA, mode: AddrMode.IMPLIED    , len: 1, cycle: 3},
    0x68: {name: Opcode.PLA, mode: AddrMode.IMPLIED    , len: 1, cycle: 4},
    0x08: {name: Opcode.PHP, mode: AddrMode.IMPLIED    , len: 1, cycle: 3},
    0x28: {name: Opcode.PLP, mode: AddrMode.IMPLIED    , len: 1, cycle: 4},
    
    // STX
    0x86: {name: Opcode.STX, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x96: {name: Opcode.STX, mode: AddrMode.ZERO_PAGE_Y, len: 2, cycle: 4},
    0x8E: {name: Opcode.STX, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    
    // STY
    0x84: {name: Opcode.STY, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x94: {name: Opcode.STY, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0x8C: {name: Opcode.STY, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    
    // https://www.nesdev.org/wiki/Programming_with_unofficial_opcodes
    
    // Combined operations
    0x4B: {name: Opcode.ALR, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x0B: {name: Opcode.ANC, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x2B: {name: Opcode.ANC, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x6B: {name: Opcode.ARR, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xCB: {name: Opcode.AXS, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xA3: {name: Opcode.LAX, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0xA7: {name: Opcode.LAX, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0xAF: {name: Opcode.LAX, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0xB3: {name: Opcode.LAX, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 5},
    0xB7: {name: Opcode.LAX, mode: AddrMode.ZERO_PAGE_Y, len: 2, cycle: 4},
    0xBF: {name: Opcode.LAX, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 4},
    0x83: {name: Opcode.SAX, mode: AddrMode.INDIRECT_X , len: 2, cycle: 6},
    0x87: {name: Opcode.SAX, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x8F: {name: Opcode.SAX, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0x97: {name: Opcode.SAX, mode: AddrMode.ZERO_PAGE_Y, len: 2, cycle: 4},
    
    // RMW instructions
    0xC3: {name: Opcode.DCP, mode: AddrMode.INDIRECT_X , len: 2, cycle: 8},
    0xC7: {name: Opcode.DCP, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0xCF: {name: Opcode.DCP, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0xD3: {name: Opcode.DCP, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 8},
    0xD7: {name: Opcode.DCP, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0xDB: {name: Opcode.DCP, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 7},
    0xDF: {name: Opcode.DCP, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    0xE3: {name: Opcode.ISC, mode: AddrMode.INDIRECT_X , len: 2, cycle: 8},
    0xE7: {name: Opcode.ISC, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0xEF: {name: Opcode.ISC, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0xF3: {name: Opcode.ISC, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 8},
    0xF7: {name: Opcode.ISC, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0xFB: {name: Opcode.ISC, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 7},
    0xFF: {name: Opcode.ISC, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    0x23: {name: Opcode.RLA, mode: AddrMode.INDIRECT_X , len: 2, cycle: 8},
    0x27: {name: Opcode.RLA, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0x2F: {name: Opcode.RLA, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0x33: {name: Opcode.RLA, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 8},
    0x37: {name: Opcode.RLA, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0x3B: {name: Opcode.RLA, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 7},
    0x3F: {name: Opcode.RLA, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    0x63: {name: Opcode.RRA, mode: AddrMode.INDIRECT_X , len: 2, cycle: 8},
    0x67: {name: Opcode.RRA, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0x6F: {name: Opcode.RRA, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0x73: {name: Opcode.RRA, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 8},
    0x77: {name: Opcode.RRA, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0x7B: {name: Opcode.RRA, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 7},
    0x7F: {name: Opcode.RRA, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    0x03: {name: Opcode.SLO, mode: AddrMode.INDIRECT_X , len: 2, cycle: 8},
    0x07: {name: Opcode.SLO, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0x0F: {name: Opcode.SLO, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0x13: {name: Opcode.SLO, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 8},
    0x17: {name: Opcode.SLO, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0x1B: {name: Opcode.SLO, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 7},
    0x1F: {name: Opcode.SLO, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    0x43: {name: Opcode.SRE, mode: AddrMode.INDIRECT_X , len: 2, cycle: 8},
    0x47: {name: Opcode.SRE, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 5},
    0x4F: {name: Opcode.SRE, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 6},
    0x53: {name: Opcode.SRE, mode: AddrMode.INDIRECT_Y , len: 2, cycle: 8},
    0x57: {name: Opcode.SRE, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 6},
    0x5B: {name: Opcode.SRE, mode: AddrMode.ABSOLUTE_Y , len: 3, cycle: 7},
    0x5F: {name: Opcode.SRE, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 7},
    
    // Duplicated instructions
    0x69: {name: Opcode.ADC, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xEB: {name: Opcode.SBC, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    
    // NOPs
    0x1A: {name: Opcode.NOP, mode: AddrMode.IMMEDIATE  , len: 1, cycle: 2},
    0x3A: {name: Opcode.NOP, mode: AddrMode.IMMEDIATE  , len: 1, cycle: 2},
    0x5A: {name: Opcode.NOP, mode: AddrMode.IMMEDIATE  , len: 1, cycle: 2},
    0x7A: {name: Opcode.NOP, mode: AddrMode.IMMEDIATE  , len: 1, cycle: 2},
    0xDA: {name: Opcode.NOP, mode: AddrMode.IMMEDIATE  , len: 1, cycle: 2},
    0xFA: {name: Opcode.NOP, mode: AddrMode.IMMEDIATE  , len: 1, cycle: 2},
    0x80: {name: Opcode.SKB, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x82: {name: Opcode.SKB, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x89: {name: Opcode.SKB, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xC2: {name: Opcode.SKB, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0xE2: {name: Opcode.SKB, mode: AddrMode.IMMEDIATE  , len: 2, cycle: 2},
    0x0C: {name: Opcode.IGN, mode: AddrMode.ABSOLUTE   , len: 3, cycle: 4},
    0x1C: {name: Opcode.IGN, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0x3C: {name: Opcode.IGN, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0x5C: {name: Opcode.IGN, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0x7C: {name: Opcode.IGN, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0xDC: {name: Opcode.IGN, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0xFC: {name: Opcode.IGN, mode: AddrMode.ABSOLUTE_X , len: 3, cycle: 4},
    0x04: {name: Opcode.IGN, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x44: {name: Opcode.IGN, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x64: {name: Opcode.IGN, mode: AddrMode.ZERO_PAGE  , len: 2, cycle: 3},
    0x14: {name: Opcode.IGN, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0x34: {name: Opcode.IGN, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0x54: {name: Opcode.IGN, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0x74: {name: Opcode.IGN, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0xD4: {name: Opcode.IGN, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
    0xF4: {name: Opcode.IGN, mode: AddrMode.ZERO_PAGE_X, len: 2, cycle: 4},
});

function CPU() {
    // Main memory
    this.mem = new Uint8Array(0x10000);
    this.reset();
}

CPU.prototype.reset = function() {
    // CPU Registers
    this.regA = 0;
    this.regX = 0;
    this.regY = 0;
    this.regSP = 0x01fd;
    this.regPC = 0xC000;
    
    // flags
    this.flagC = 0;
    this.flagZ = 0;
    this.flagI = 1;
    this.flagD = 0;
    this.flagB = 0;
    this.flagU = 1;
    this.flagV = 0;
    this.flagN = 0;
    
    this.cycles = 7;
};

CPU.prototype.isCrossPage = function(addr1, addr2) {
    return (addr1 & 0xff00) !== (addr2 & 0xff00);
};

CPU.prototype.push = function(value) {
    this.writeByte(this.regSP, value);
    this.regSP--;
    this.regSP = 0x0100 | (this.regSP & 0xff);
};

CPU.prototype.pop = function() {
    this.regSP++;
    this.regSP = 0x0100 | (this.regSP & 0xff);
    return this.readByte(this.regSP);
};

CPU.prototype.readByte = function(addr) {
    if(addr < 0x2000) {
        // 2KB CPU RAM and Mirrors
        return this.mem[addr & 0x07ff];
    } else if(addr < 0x4000) {
        // PPU registers and Mirrors
        return this.mem[addr & 0x2007];
    } else if(addr === 0x4014) {
        // OAM DMA
        
    } else if(addr === 0x4016) {
        // Controller
        
    } else if(addr < 0x4018) {
        // APU: $4000-$4013, $4015, $4017
        
    } else if(addr < 0x4020) {
        // APU and I/O functionality that is normally disabled
        
    } else {
        // PRG ROM, PRG RAM, and mapper registers
        
    }
    return this.mem[addr];
};

CPU.prototype.read2Byte = function(addr) {
    var b1 = this.readByte(addr);
    var b2 = this.readByte(addr + 1);
    return b1 | b2 << 8;
};

CPU.prototype.writeByte = function(addr, value) {
    // TODO
    this.mem[addr] = value;
    if(addr < 0x2000) {
        // 2KB CPU RAM and Mirrors
        this.mem[addr & 0x07ff] = value;
    } else if(addr < 0x4000) {
        // PPU registers and Mirrors
        this.mem[addr & 0x2007] = value;
    } else if(addr === 0x4014) {
        // OAM DMA
        
    } else if(addr === 0x4016) {
        // Controller
        
    } else if(addr < 0x4018) {
        // APU: $4000-$4013, $4015, $4017
        
    } else if(addr < 0x4020) {
        // APU and I/O functionality that is normally disabled
        
    } else {
        // PRG ROM, PRG RAM, and mapper registers
        
    }
};

CPU.prototype.getFlags = function() {
    return this.flagC
        | (this.flagZ << 1)
        | (this.flagI << 2)
        | (this.flagD << 3)
        | (this.flagB << 4)
        | (this.flagU << 5)
        | (this.flagV << 6)
        | (this.flagN << 7);
};

CPU.prototype.setFlags = function(value) {
    this.flagC = value & 1;
    this.flagZ = (value >> 1) & 1;
    this.flagI = (value >> 2) & 1;
    this.flagD = (value >> 3) & 1;
    this.flagB = (value >> 4) & 1;
    this.flagU = 1;
    this.flagV = (value >> 6) & 1;
    this.flagN = (value >> 7) & 1;
};

CPU.prototype.step = function(callback) {
    var opinf = OP_DATA[this.readByte(this.regPC)];
    if(!opinf) {
        console.log('unknowd op: ' + this.readByte(this.regPC).toString(16));
        return;
    }
    var opaddr = this.regPC;
    
    // =============test start===============
    var inst = [];
    for(var i = 0; i < opinf.len; i++) {
        inst.push(this.mem[opaddr + i]);
    }
    var result = {
        addr: opaddr,
        inst: inst,
        A: this.regA,
        X: this.regX,
        Y: this.regY,
        P: this.getFlags(),
        SP: this.regSP & 0xff,
        CYC: this.cycles
    };
    callback(result);
    // =============test end===============
    
    this.regPC += opinf.len;
    this.cycles += opinf.cycle;
    var name = opinf.name;
    var mode = opinf.mode;
    var addr = 0;
    var cycleAdd = 0;
    var tmp;
    var add;
    
    switch(mode) {
        case AddrMode.ZERO_PAGE:
            addr = this.readByte(opaddr + 1);
            break;
        
        case AddrMode.RELATIVE:
            addr = this.readByte(opaddr + 1);
            if(addr & 0x80) {
                addr -= 0x100;
            }
            addr += this.regPC;
            break;
        
        case AddrMode.IMPLIED:
            // Ignore
            break;
        
        case AddrMode.ABSOLUTE:
            addr = this.read2Byte(opaddr + 1);
            break;
        
        case AddrMode.ACCUMULATOR:
            addr = opaddr + 1;
            break;
        
        case AddrMode.IMMEDIATE:
            addr = opaddr + 1;
            break;
        
        case AddrMode.ZERO_PAGE_X:
            addr = (this.readByte(opaddr + 1) + this.regX) & 0xff;
            break;
        
        case AddrMode.ZERO_PAGE_Y:
            addr = (this.readByte(opaddr + 1) + this.regY) & 0xff;
            break;
        
        case AddrMode.ABSOLUTE_X:
            tmp = this.read2Byte(opaddr + 1);
            addr = tmp + this.regX;
            if(this.isCrossPage(tmp, addr)) {
                cycleAdd = 1;
            }
            break;
        
        case AddrMode.ABSOLUTE_Y:
            tmp = this.read2Byte(opaddr + 1);
            addr = tmp + this.regY;
            if(this.isCrossPage(tmp, addr)) {
                cycleAdd = 1;
            }
            break;
        
        case AddrMode.INDIRECT_X:
            tmp = this.readByte(opaddr + 1) + this.regX;
            addr = this.readByte(tmp & 0xff) 
                | this.readByte((tmp + 1) & 0xff) << 8;
            break;
        
        case AddrMode.INDIRECT_Y:
            tmp = this.readByte(opaddr + 1);
            tmp = this.readByte(tmp & 0xff) 
                | this.readByte((tmp + 1) & 0xff) << 8;
            addr = tmp + this.regY;
            if(this.isCrossPage(tmp, addr)) {
                cycleAdd = 1;
            }
            break;
        
        case AddrMode.INDIRECT:
            addr = this.read2Byte(opaddr + 1);
            if((addr & 0xff) === 0xff) {
                // Hardware bug
                addr = this.readByte(addr) 
                    | this.readByte(addr & 0xff00) << 8;
            } else {
                addr = this.read2Byte(addr);
            }
            break;
    }
    addr &= 0xffff;
    
    switch(name) {
        case Opcode.ADC:
            tmp = this.regA + this.readByte(addr) + this.flagC;
            if(((this.regA ^ this.readByte(addr)) & 0x80) === 0
                && ((this.regA ^ tmp) & 0x80) !== 0) {
                this.flagV = 1;
            } else {
                this.flagV = 0;
            }
            this.flagC = tmp > 0xff ? 1 : 0;
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
            this.regA = tmp & 0xff;
            this.cycles += cycleAdd;
            break;
        
        case Opcode.AND:
            this.regA = this.regA & this.readByte(addr);
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            //if(mode !== INDIRECT_Y) {
                this.cycles += cycleAdd;
            //}
            break;
        
        case Opcode.ASL:
            if(mode === AddrMode.ACCUMULATOR) {
                this.flagC = (this.regA >> 7) & 1;
                this.regA = (this.regA << 1) & 0xff;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
            } else {
                tmp = this.readByte(addr);
                this.flagC = (tmp >> 7) & 1;
                tmp = (tmp << 1) & 0xff;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = tmp === 0 ? 1 : 0;
                this.writeByte(addr, tmp);
            }
            break;
        
        case Opcode.BCC:
            if(this.flagC === 0) {
                this.cycles += 1;
                if(this.isCrossPage(this.regPC, addr)) {
                    this.cycles += 1;
                }
                this.regPC = addr;
            }
            break;
        
        case Opcode.BCS:
            if(this.flagC === 1) {
                this.cycles += 1;
                if(this.isCrossPage(this.regPC, addr)) {
                    this.cycles += 1;
                }
                this.regPC = addr;
            }
            break;
        
        case Opcode.BEQ:
            if(this.flagZ === 1) {
                this.cycles += 1;
                if(this.isCrossPage(this.regPC, addr)) {
                    this.cycles += 1;
                }
                this.regPC = addr;
            }
            break;
        
        case Opcode.BIT:
            tmp = this.readByte(addr);
            this.flagN = (tmp >> 7) & 1;
            this.flagV = (tmp >> 6) & 1;
            tmp &= this.regA;
            this.flagZ = tmp === 0 ? 1 : 0;
            break;
        
        case Opcode.BMI:
            if(this.flagN === 1) {
                this.cycles += 1;
                this.regPC = addr;
            }
            break;
        
        case Opcode.BNE:
            if(this.flagZ === 0) {
                this.cycles += 1;
                if(this.isCrossPage(this.regPC, addr)) {
                    this.cycles += 1;
                }
                this.regPC = addr;
            }
            break;
        
        case Opcode.BPL:
            if(this.flagN === 0) {
                this.cycles += 1;
                if(this.isCrossPage(this.regPC, addr)) {
                    this.cycles += 1;
                }
                this.regPC = addr;
            }
            break;
        
        case Opcode.BRK:
            this.regPC += 2;
            this.push((this.regPC >> 8) & 0xff);
            this.push(this.regPC & 0xff);
            this.flagB = 1;
            this.push(this.getFlags());
            this.flagI = 1;
            this.regPC = this.read2Byte(0xfffe);
            this.regPC--;
            break;
        
        case Opcode.BVC:
            if(this.flagV === 0) {
                this.cycles += 1;
                if(this.isCrossPage(this.regPC, addr)) {
                    this.cycles += 1;
                }
                this.regPC = addr;
            }
            break;
        
        case Opcode.BVS:
            if(this.flagV === 1) {
                this.cycles += 1;
                if(this.isCrossPage(this.regPC, addr)) {
                    this.cycles += 1;
                }
                this.regPC = addr;
            }
            break;
        
        case Opcode.CLC:
            this.flagC = 0;
            break;
        
        case Opcode.CLD:
            this.flagD = 0;
            break;
        
        case Opcode.CLI:
            this.flagI = 0;
            break;
        
        case Opcode.CLV:
            this.flagV = 0;
            break;
        
        case Opcode.CMP:
            tmp = this.regA - this.readByte(addr);
            this.flagC = tmp >= 0 ? 1 : 0;
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
            this.cycles += cycleAdd;
            break;
        
        case Opcode.CPX:
            tmp = this.regX - this.readByte(addr);
            this.flagC = tmp >= 0 ? 1 : 0;
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
            break;
        
        case Opcode.CPY:
            tmp = this.regY - this.readByte(addr);
            this.flagC = tmp >= 0 ? 1 : 0;
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
            break;
        
        case Opcode.DEC:
            tmp = (this.readByte(addr) - 1) & 0xff;
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = tmp === 0 ? 1 : 0;
            this.writeByte(addr, tmp);
            break;
        
        case Opcode.DEX:
            this.regX = (this.regX - 1) & 0xff;
            this.flagN = (this.regX >> 7) &  1;
            this.flagZ = this.regX === 0 ? 1 : 0;
            break;
        
        case Opcode.DEY:
            this.regY = (this.regY - 1) & 0xff;
            this.flagN = (this.regY >> 7) & 1;
            this.flagZ = this.regY === 0 ? 1 : 0;
            break;
        
        case Opcode.EOR:
            this.regA = (this.readByte(addr) ^ this.regA) & 0xff;
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            this.cycles += cycleAdd;
            break;
        
        case Opcode.INC:
            tmp = (this.readByte(addr) + 1) & 0xff;
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = tmp === 0 ? 1 : 0;
            this.writeByte(addr, tmp);
            break;
        
        case Opcode.INX:
            this.regX = (this.regX + 1) & 0xff;
            this.flagN = (this.regX >> 7) & 1;
            this.flagZ = this.regX === 0 ? 1 : 0;
            break;
        
        case Opcode.INY:
            this.regY++;
            this.regY &= 0xff;
            this.flagN = (this.regY >> 7) & 1;
            this.flagZ = this.regY === 0 ? 1 : 0;
            break;
        
        case Opcode.JMP:
            this.regPC = addr;
            break;
        
        case Opcode.JSR:
            tmp = this.regPC - 1;
            this.push((tmp >> 8) & 0xff);
            this.push(tmp & 0xff);
            this.regPC = addr;
            break;
        
        case Opcode.LDA:
            this.regA = this.readByte(addr);
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            this.cycles += cycleAdd;
            break;
        
        case Opcode.LDX:
            this.regX = this.readByte(addr);
            this.flagN = (this.regX >> 7) & 1;
            this.flagZ = this.regX === 0 ? 1 : 0;
            this.cycles += cycleAdd;
            break;
        
        case Opcode.LDY:
            this.regY = this.readByte(addr);
            this.flagN = (this.regY >> 7) & 1;
            this.flagZ = this.regY === 0 ? 1 : 0;
            this.cycles += cycleAdd;
            break;
        
        case Opcode.LSR:
            if(mode === AddrMode.ACCUMULATOR) {
                tmp = this.regA & 0xff;
                this.flagC = tmp & 1;
                tmp >>= 1;
                this.regA = tmp;
            } else {
                tmp = this.readByte(addr) & 0xff;
                this.flagC = tmp & 1;
                tmp >>= 1;
                this.writeByte(addr, tmp);
            }
            this.flagN = 0;
            this.flagZ = tmp === 0 ? 1 : 0;
            break;
        
        case Opcode.NOP:
            // Ignore
            break;
        
        case Opcode.ORA:
            tmp = (this.readByte(addr) | this.regA) & 0xff;
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = tmp === 0 ? 1 : 0;
            this.regA = tmp;
            //if(mode !== INDIRECT_Y) {
                this.cycles += cycleAdd;
            //}
            break;
        
        case Opcode.PHA:
            this.push(this.regA);
            break;
        
        case Opcode.PHP:
            this.flagB = 1;
            this.push(this.getFlags());
            this.flagB = 0;
            break;
        
        case Opcode.PLA:
            this.regA = this.pop();
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            break;
        
        case Opcode.PLP:
            tmp = this.pop();
            this.setFlags(tmp);
            this.flagB = 0;
            break;
        
        case Opcode.ROL:
            if(mode === AddrMode.ACCUMULATOR) {
                tmp = this.regA;
                add = this.flagC;
                this.flagC = (tmp >> 7) & 1;
                tmp = ((tmp << 1) & 0xff) + add;
                this.regA = tmp;
            } else {
                tmp = this.readByte(addr);
                add = this.flagC;
                this.flagC = (tmp >> 7) & 1;
                tmp = ((tmp << 1) & 0xff) + add;
                this.writeByte(addr, tmp);
            }
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = tmp === 0 ? 1 : 0;
            break;
        
        case Opcode.ROR:
            if(mode === AddrMode.ACCUMULATOR) {
                add = this.flagC << 7;
                this.flagC = this.regA & 1;
                tmp = (this.regA >> 1) + add;
                this.regA = tmp;
            } else {
                tmp = this.readByte(addr);
                add = this.flagC << 7;
                this.flagC = tmp & 1;
                tmp = (tmp >> 1) + add;
                this.writeByte(addr, tmp);
            }
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = tmp === 0 ? 1 : 0;
            break;
        
        case Opcode.RTI:
            tmp = this.pop();
            this.setFlags(tmp);
            this.regPC = this.pop() | this.pop() << 8;
            if(this.regPC === 0xffff) {
                return;
            }
            break;
        
        case Opcode.RTS:
            this.regPC = (this.pop() | this.pop() << 8) + 1;
            if(this.regPC === 0xffff) {
                return;
            }
            break;
        
        case Opcode.SBC:
            tmp = this.regA - this.readByte(addr) - (1 - this.flagC);
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
            if(((this.regA ^ tmp) & 0x80) !== 0
                && ((this.regA ^ this.readByte(addr)) & 0x80) !== 0) {
                this.flagV = 1;
            } else {
                this.flagV = 0;
            }
            this.flagC = tmp >= 0 ? 1 : 0;
            this.regA = tmp & 0xff;
            //if(mode !== INDIRECT_Y) {
                this.cycles += cycleAdd;
            //}
            break;
        
        case Opcode.SEC:
            this.flagC = 1;
            break;
        
        case Opcode.SED:
            this.flagD = 1;
            break;
        
        case Opcode.SEI:
            this.flagI = 1;
            break;
        
        case Opcode.STA:
            this.writeByte(addr, this.regA);
            break;
        
        case Opcode.STX:
            this.writeByte(addr, this.regX);
            break;
        
        case Opcode.STY:
            this.writeByte(addr, this.regY);
            break;
        
        case Opcode.TAX:
            this.regX = this.regA;
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;;
            break;
        
        case Opcode.TAY:
            this.regY = this.regA;
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            break;
        
        case Opcode.TSX:
            this.regX = this.regSP - 0x0100;
            this.flagN = (this.regSP >> 7) & 1;
            this.flagZ = this.regX === 0 ? 1 : 0;
            break;
        
        case Opcode.TXA:
            this.regA = this.regX;
            this.flagN = (this.regX >> 7) & 1;
            this.flagZ = this.regX === 0 ? 1 : 0;
            break;
        
        case Opcode.TXS:
            this.regSP = this.regX + 0x0100;
            this.regSP = 0x0100 | (this.regSP & 0xff);
            break;
        
        case Opcode.TYA:
            this.regA = this.regY;
            this.flagN = (this.regY >> 7) & 1;
            this.flagZ = this.regY === 0 ? 1 : 0;
            break;
        
        case Opcode.ALR:
            tmp = this.regA & this.readByte(addr);
            this.regA = tmp >> 1;
            this.flagC = tmp & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            this.flagN = 0;
            break;
        
        case Opcode.ANC:
            this.regA &= this.readByte(addr);
            this.flagC = this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            break;
        
        case Opcode.ARR:
            tmp = this.regA & this.readByte(addr);
            this.regA = (tmp >> 1) + (this.flagC << 7);
            this.flagN = this.flagC;
            this.flagC = (tmp >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            this.flagV = ((tmp >> 7) ^ (tmp >> 6)) & 1;
            break;
        
        case Opcode.AXS:
            tmp = (this.regX & this.regA) - this.readByte(addr);
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
            if(((this.regX ^ tmp) & 0x80) !== 0
                && ((this.regX ^ this.readByte(addr)) & 0x80) !== 0) {
                this.flagV = 1;
            } else {
                this.flagV = 0;
            }
            this.regX = tmp & 0xff;
            this.flagC = tmp >= 0 ? 1 : 0;
            break;
        
        case Opcode.LAX:
            this.regA = this.regX = this.readByte(addr);
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            this.cycles += cycleAdd;
            break;
        
        case Opcode.SAX:
            this.writeByte(addr, this.regA & this.regX);
            break;
        
        case Opcode.DCP:
            tmp = (this.readByte(addr) - 1) & 0xff;
            this.writeByte(addr, tmp);
            tmp = this.regA - tmp;
            this.flagC = tmp >= 0 ? 1 : 0;
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
            break;
        
        case Opcode.ISC:
            tmp = (this.readByte(addr) + 1) & 0xff;
            this.writeByte(addr, tmp);
            tmp = this.regA - tmp - (1 - this.flagC);
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
            if(((this.regA ^ tmp) & 0x80) !== 0
                && ((this.regA ^ this.readByte(addr)) & 0x80) !== 0) {
                this.flagV = 1;
            } else {
                this.flagV = 0;
            }
            this.flagC = tmp >= 0 ? 1 : 0;
            this.regA = tmp & 0xff;
            break;
        
        case Opcode.RLA:
            tmp = this.readByte(addr);
            add = this.flagC;
            this.flagC = (tmp >> 7) & 1;
            tmp = ((tmp << 1) & 0xff) + add;
            this.writeByte(addr, tmp);
            this.regA &= tmp;
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            break;
        
        case Opcode.RRA:
            tmp = this.readByte(addr);
            add = this.flagC << 7;
            this.flagC = tmp & 1;
            tmp = (tmp >> 1) + add;
            this.writeByte(addr, tmp);
            tmp = this.regA + this.readByte(addr) + this.flagC;
            if(((this.regA ^ this.readByte(addr)) & 0x80) === 0
                && ((this.regA ^ tmp) & 0x80) !== 0) {
                this.flagV = 1;
            } else {
                this.flagV = 0;
            }
            this.flagC = tmp > 0xff ? 1 : 0;
            this.flagN = (tmp >> 7) & 1;
            this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
            this.regA = tmp & 0xff;
            break;
        
        case Opcode.SLO:
            tmp = this.readByte(addr);
            this.flagC = (tmp >> 7) & 1;
            tmp = (tmp << 1) & 0xff;
            this.writeByte(addr, tmp);
            this.regA |= tmp;
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            break;
        
        case Opcode.SRE:
            tmp = this.readByte(addr) & 0xff;
            this.flagC = tmp & 1;
            tmp >>= 1;
            this.writeByte(addr, tmp);
            this.regA ^= tmp;
            this.flagN = (this.regA >> 7) & 1;
            this.flagZ = this.regA === 0 ? 1 : 0;
            break;
        
        case Opcode.SKB:
            // Do nothing
            break;
        
        case Opcode.IGN:
            this.readByte(addr);
            if(mode !== AddrMode.INDIRECT_Y) {
                this.cycles += cycleAdd;
            }
            break;
    }
};


// =====================================================


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

httpGet('./test.nes', 'arraybuffer', function(res) {
    var buf = new Uint8Array(res);
    var nes = new NES();
    var cpu = new CPU();
    var ppu = null;
    nes.cpu = cpu;
    nes.ppu = ppu;
    nes.load(buf);
    httpGet('./test.log', 'text', function(content) {
        var lines = content.split(/\r?\n/);
        for(var i = 0; i < lines.length; i++) {
            var line = lines[i];
            cpu.step(function(result) {
                checkResult(line, result);
            });
        }
    });
});


















































































































































































