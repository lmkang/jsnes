function CPU(nes) {
    nes.cpu = this;
    this.nes = nes;
    this.mem = new Uint8Array(0x10000);
}

CPU.prototype = {
    // opcode
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
    
    // addressing mode
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
};

CPU.prototype.opdata = function() {
return Object.freeze({
    // http://6502.org/tutorials/6502opcodes.html
    
    // ADC
    0x69: {name: this.ADC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x65: {name: this.ADC, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x75: {name: this.ADC, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0x6D: {name: this.ADC, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0x7D: {name: this.ADC, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0x79: {name: this.ADC, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
    0x61: {name: this.ADC, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0x71: {name: this.ADC, mode: this.INDIRECT_Y , len: 2, cycle: 5},
    
    // AND
    0x29: {name: this.AND, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x25: {name: this.AND, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x35: {name: this.AND, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0x2D: {name: this.AND, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0x3D: {name: this.AND, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0x39: {name: this.AND, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
    0x21: {name: this.AND, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0x31: {name: this.AND, mode: this.INDIRECT_Y , len: 2, cycle: 5},

    // ASL
    0x0A: {name: this.ASL, mode: this.ACCUMULATOR, len: 1, cycle: 2},
    0x06: {name: this.ASL, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0x16: {name: this.ASL, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0x0E: {name: this.ASL, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0x1E: {name: this.ASL, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    
    // BIT
    0x24: {name: this.BIT, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x2C: {name: this.BIT, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    
    // Branch Instructions
    0x10: {name: this.BPL, mode: this.RELATIVE   , len: 2, cycle: 2},
    0x30: {name: this.BMI, mode: this.RELATIVE   , len: 2, cycle: 2},
    0x50: {name: this.BVC, mode: this.RELATIVE   , len: 2, cycle: 2},
    0x70: {name: this.BVS, mode: this.RELATIVE   , len: 2, cycle: 2},
    0x90: {name: this.BCC, mode: this.RELATIVE   , len: 2, cycle: 2},
    0xB0: {name: this.BCS, mode: this.RELATIVE   , len: 2, cycle: 2},
    0xD0: {name: this.BNE, mode: this.RELATIVE   , len: 2, cycle: 2},
    0xF0: {name: this.BEQ, mode: this.RELATIVE   , len: 2, cycle: 2},
    
    // BRK
    0x00: {name: this.BRK, mode: this.IMPLIED    , len: 1, cycle: 7},
    
    // CMP
    0xC9: {name: this.CMP, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xC5: {name: this.CMP, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0xD5: {name: this.CMP, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0xCD: {name: this.CMP, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0xDD: {name: this.CMP, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0xD9: {name: this.CMP, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
    0xC1: {name: this.CMP, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0xD1: {name: this.CMP, mode: this.INDIRECT_Y , len: 2, cycle: 5},
    
    // CPX
    0xE0: {name: this.CPX, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xE4: {name: this.CPX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0xEC: {name: this.CPX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    
    // CPY
    0xC0: {name: this.CPY, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xC4: {name: this.CPY, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0xCC: {name: this.CPY, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    
    // DEC
    0xC6: {name: this.DEC, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0xD6: {name: this.DEC, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0xCE: {name: this.DEC, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0xDE: {name: this.DEC, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    
    // EOR
    0x49: {name: this.EOR, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x45: {name: this.EOR, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x55: {name: this.EOR, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0x4D: {name: this.EOR, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0x5D: {name: this.EOR, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0x59: {name: this.EOR, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
    0x41: {name: this.EOR, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0x51: {name: this.EOR, mode: this.INDIRECT_Y , len: 2, cycle: 5},
    
    // Flag(Processor Status) Instructions
    0x18: {name: this.CLC, mode: this.IMPLIED    , len: 1, cycle: 2},
    0x38: {name: this.SEC, mode: this.IMPLIED    , len: 1, cycle: 2},
    0x58: {name: this.CLI, mode: this.IMPLIED    , len: 1, cycle: 2},
    0x78: {name: this.SEI, mode: this.IMPLIED    , len: 1, cycle: 2},
    0xB8: {name: this.CLV, mode: this.IMPLIED    , len: 1, cycle: 2},
    0xD8: {name: this.CLD, mode: this.IMPLIED    , len: 1, cycle: 2},
    0xF8: {name: this.SED, mode: this.IMPLIED    , len: 1, cycle: 2},
    
    // INC
    0xE6: {name: this.INC, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0xF6: {name: this.INC, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0xEE: {name: this.INC, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0xFE: {name: this.INC, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    
    // JMP
    0x4C: {name: this.JMP, mode: this.ABSOLUTE   , len: 3, cycle: 3},
    0x6C: {name: this.JMP, mode: this.INDIRECT   , len: 3, cycle: 5},
    
    // JSR
    0x20: {name: this.JSR, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    
    // LDA
    0xA9: {name: this.LDA, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xA5: {name: this.LDA, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0xB5: {name: this.LDA, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0xAD: {name: this.LDA, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0xBD: {name: this.LDA, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0xB9: {name: this.LDA, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
    0xA1: {name: this.LDA, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0xB1: {name: this.LDA, mode: this.INDIRECT_Y , len: 2, cycle: 5},
    
    // LDX
    0xA2: {name: this.LDX, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xA6: {name: this.LDX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0xB6: {name: this.LDX, mode: this.ZERO_PAGE_Y, len: 2, cycle: 4},
    0xAE: {name: this.LDX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0xBE: {name: this.LDX, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
    
    // LDY
    0xA0: {name: this.LDY, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xA4: {name: this.LDY, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0xB4: {name: this.LDY, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0xAC: {name: this.LDY, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0xBC: {name: this.LDY, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    
    // LSR
    0x4A: {name: this.LSR, mode: this.ACCUMULATOR, len: 1, cycle: 2},
    0x46: {name: this.LSR, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0x56: {name: this.LSR, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0x4E: {name: this.LSR, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0x5E: {name: this.LSR, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    
    // NOP
    0xEA: {name: this.NOP, mode: this.IMPLIED    , len: 1, cycle: 2},
    
    // ORA
    0x09: {name: this.ORA, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x05: {name: this.ORA, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x15: {name: this.ORA, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0x0D: {name: this.ORA, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0x1D: {name: this.ORA, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0x19: {name: this.ORA, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
    0x01: {name: this.ORA, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0x11: {name: this.ORA, mode: this.INDIRECT_Y , len: 2, cycle: 5},
    
    // Register Instructions
    0xAA: {name: this.TAX, mode: this.IMPLIED    , len: 1, cycle: 2},
    0x8A: {name: this.TXA, mode: this.IMPLIED    , len: 1, cycle: 2},
    0xCA: {name: this.DEX, mode: this.IMPLIED    , len: 1, cycle: 2},
    0xE8: {name: this.INX, mode: this.IMPLIED    , len: 1, cycle: 2},
    0xA8: {name: this.TAY, mode: this.IMPLIED    , len: 1, cycle: 2},
    0x98: {name: this.TYA, mode: this.IMPLIED    , len: 1, cycle: 2},
    0x88: {name: this.DEY, mode: this.IMPLIED    , len: 1, cycle: 2},
    0xC8: {name: this.INY, mode: this.IMPLIED    , len: 1, cycle: 2},
    
    // ROL
    0x2A: {name: this.ROL, mode: this.ACCUMULATOR, len: 1, cycle: 2},
    0x26: {name: this.ROL, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0x36: {name: this.ROL, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0x2E: {name: this.ROL, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0x3E: {name: this.ROL, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    
    // ROR
    0x6A: {name: this.ROR, mode: this.ACCUMULATOR, len: 1, cycle: 2},
    0x66: {name: this.ROR, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0x76: {name: this.ROR, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0x6E: {name: this.ROR, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0x7E: {name: this.ROR, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    
    // RTI
    0x40: {name: this.RTI, mode: this.IMPLIED    , len: 1, cycle: 6},
    
    // RTS
    0x60: {name: this.RTS, mode: this.IMPLIED    , len: 1, cycle: 6},
    
    // SBC
    0xE9: {name: this.SBC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xE5: {name: this.SBC, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0xF5: {name: this.SBC, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0xED: {name: this.SBC, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0xFD: {name: this.SBC, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0xF9: {name: this.SBC, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
    0xE1: {name: this.SBC, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0xF1: {name: this.SBC, mode: this.INDIRECT_Y , len: 2, cycle: 5},
    
    // STA
    0x85: {name: this.STA, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x95: {name: this.STA, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0x8D: {name: this.STA, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0x9D: {name: this.STA, mode: this.ABSOLUTE_X , len: 3, cycle: 5},
    0x99: {name: this.STA, mode: this.ABSOLUTE_Y , len: 3, cycle: 5},
    0x81: {name: this.STA, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0x91: {name: this.STA, mode: this.INDIRECT_Y , len: 2, cycle: 6},
    
    // Stack Instructions
    0x9A: {name: this.TXS, mode: this.IMPLIED    , len: 1, cycle: 2},
    0xBA: {name: this.TSX, mode: this.IMPLIED    , len: 1, cycle: 2},
    0x48: {name: this.PHA, mode: this.IMPLIED    , len: 1, cycle: 3},
    0x68: {name: this.PLA, mode: this.IMPLIED    , len: 1, cycle: 4},
    0x08: {name: this.PHP, mode: this.IMPLIED    , len: 1, cycle: 3},
    0x28: {name: this.PLP, mode: this.IMPLIED    , len: 1, cycle: 4},
    
    // STX
    0x86: {name: this.STX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x96: {name: this.STX, mode: this.ZERO_PAGE_Y, len: 2, cycle: 4},
    0x8E: {name: this.STX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    
    // STY
    0x84: {name: this.STY, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x94: {name: this.STY, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0x8C: {name: this.STY, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    
    // https://www.nesdev.org/wiki/Programming_with_unofficial_opcodes
    
    // Combined operations
    0x4B: {name: this.ALR, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x0B: {name: this.ANC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x2B: {name: this.ANC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x6B: {name: this.ARR, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xCB: {name: this.AXS, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xA3: {name: this.LAX, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0xA7: {name: this.LAX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0xAF: {name: this.LAX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0xB3: {name: this.LAX, mode: this.INDIRECT_Y , len: 2, cycle: 5},
    0xB7: {name: this.LAX, mode: this.ZERO_PAGE_Y, len: 2, cycle: 4},
    0xBF: {name: this.LAX, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
    0x83: {name: this.SAX, mode: this.INDIRECT_X , len: 2, cycle: 6},
    0x87: {name: this.SAX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x8F: {name: this.SAX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0x97: {name: this.SAX, mode: this.ZERO_PAGE_Y, len: 2, cycle: 4},
    
    // RMW instructions
    0xC3: {name: this.DCP, mode: this.INDIRECT_X , len: 2, cycle: 8},
    0xC7: {name: this.DCP, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0xCF: {name: this.DCP, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0xD3: {name: this.DCP, mode: this.INDIRECT_Y , len: 2, cycle: 8},
    0xD7: {name: this.DCP, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0xDB: {name: this.DCP, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
    0xDF: {name: this.DCP, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    0xE3: {name: this.ISC, mode: this.INDIRECT_X , len: 2, cycle: 8},
    0xE7: {name: this.ISC, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0xEF: {name: this.ISC, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0xF3: {name: this.ISC, mode: this.INDIRECT_Y , len: 2, cycle: 8},
    0xF7: {name: this.ISC, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0xFB: {name: this.ISC, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
    0xFF: {name: this.ISC, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    0x23: {name: this.RLA, mode: this.INDIRECT_X , len: 2, cycle: 8},
    0x27: {name: this.RLA, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0x2F: {name: this.RLA, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0x33: {name: this.RLA, mode: this.INDIRECT_Y , len: 2, cycle: 8},
    0x37: {name: this.RLA, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0x3B: {name: this.RLA, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
    0x3F: {name: this.RLA, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    0x63: {name: this.RRA, mode: this.INDIRECT_X , len: 2, cycle: 8},
    0x67: {name: this.RRA, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0x6F: {name: this.RRA, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0x73: {name: this.RRA, mode: this.INDIRECT_Y , len: 2, cycle: 8},
    0x77: {name: this.RRA, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0x7B: {name: this.RRA, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
    0x7F: {name: this.RRA, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    0x03: {name: this.SLO, mode: this.INDIRECT_X , len: 2, cycle: 8},
    0x07: {name: this.SLO, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0x0F: {name: this.SLO, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0x13: {name: this.SLO, mode: this.INDIRECT_Y , len: 2, cycle: 8},
    0x17: {name: this.SLO, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0x1B: {name: this.SLO, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
    0x1F: {name: this.SLO, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    0x43: {name: this.SRE, mode: this.INDIRECT_X , len: 2, cycle: 8},
    0x47: {name: this.SRE, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
    0x4F: {name: this.SRE, mode: this.ABSOLUTE   , len: 3, cycle: 6},
    0x53: {name: this.SRE, mode: this.INDIRECT_Y , len: 2, cycle: 8},
    0x57: {name: this.SRE, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
    0x5B: {name: this.SRE, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
    0x5F: {name: this.SRE, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
    
    // Duplicated instructions
    0x69: {name: this.ADC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xEB: {name: this.SBC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    
    // NOPs
    0x1A: {name: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
    0x3A: {name: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
    0x5A: {name: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
    0x7A: {name: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
    0xDA: {name: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
    0xFA: {name: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
    0x80: {name: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x82: {name: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x89: {name: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xC2: {name: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0xE2: {name: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
    0x0C: {name: this.IGN, mode: this.ABSOLUTE   , len: 3, cycle: 4},
    0x1C: {name: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0x3C: {name: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0x5C: {name: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0x7C: {name: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0xDC: {name: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0xFC: {name: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
    0x04: {name: this.IGN, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x44: {name: this.IGN, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x64: {name: this.IGN, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
    0x14: {name: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0x34: {name: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0x54: {name: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0x74: {name: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0xD4: {name: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    0xF4: {name: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
});
};

CPU.prototype.reset = function() {
    this.reg = {
        A: 0,
        X: 0,
        Y: 0,
        SP: 0x01fd,
        PC: this.read2Bytes(0xfffc)
    };
    this.flag = {
        C: 0,
        Z: 0,
        I: 1,
        D: 0,
        B: 0,
        U: 1,
        V: 0,
        N: 0
    };
    this.suspendCycle = 0;
    this.deferCycle = 8;
    this.clocks = 0;
};

CPU.prototype.irq = function() {
    if(this.flag.I) {
        return;
    }
    this.push2Bytes(this.reg.PC);
    this.pushByte(this.getFlag());
    this.flag.I = 1;
    this.reg.PC = this.read2Bytes(0xfffe);
    this.deferCycle += 7;
};

CPU.prototype.nmi = function() {
    this.push2Bytes(this.reg.PC);
    this.pushByte(this.getFlag());
    this.flag.I = 1;
    this.reg.PC = this.read2Bytes(0xfffa);
    this.deferCycle += 7;
};

CPU.prototype.clock = function() {
    if(this.suspendCycle > 0) {
        this.suspendCycle--;
        return;
    }
    if(this.deferCycle === 0) {
        this.deferCycle = this.step();
    }
    this.deferCycle--;
    this.clocks++;
};

CPU.prototype.isCrossPage = function(addr1, addr2) {
    return (addr1 & 0xff00) !== (addr2 & 0xff00);
};

CPU.prototype.pushByte = function(value) {
    this.writeByte(this.reg.SP, value);
    this.reg.SP--;
    this.reg.SP = 0x0100 | (this.reg.SP & 0xff);
};

CPU.prototype.push2Bytes = function(value) {
    this.pushByte((value >> 8) & 0xff);
    this.pushByte(value & 0xff);
};

CPU.prototype.popByte = function() {
    this.reg.SP++;
    this.reg.SP = 0x0100 | (this.reg.SP & 0xff);
    return this.readByte(this.reg.SP);
};

CPU.prototype.pop2Bytes = function() {
    return this.popByte() | this.popByte() << 8;
};

CPU.prototype.readByte = function(addr) {
    var ppu = this.nes.ppu;
    var controller1 = this.nes.controller1;
    var controller2 = this.nes.controller2;
    if(addr < 0x2000) {
        // 2KB CPU RAM and Mirrors
        return this.mem[addr & 0x07ff];
    } else if(addr < 0x4000) {
        // PPU registers and Mirrors
        return ppu.readReg(addr & 0x2007);
    } else if(addr === 0x4014) {
        // OAM DMA
        return 0;
    } else if(addr === 0x4016) {
        // Controller1
        return controller1.readByte();
    } else if(addr === 0x4017) {
        // Controller2
        return controller2.readByte();
    } else if(addr < 0x4018) {
        // APU: $4000-$4013, $4015, $4017
        return 0;
    } else if(addr < 0x4020) {
        // APU and I/O functionality that is normally disabled
        return 0;
    } else {
        // PRG ROM, PRG RAM, and mapper registers
        return this.nes.mapper.readByte(addr);
    }
};

CPU.prototype.read2Bytes = function(addr) {
    var b1 = this.readByte(addr);
    var b2 = this.readByte(addr + 1);
    return b1 | b2 << 8;
};

CPU.prototype.writeByte = function(addr, value) {
    var ppu = this.nes.ppu;
    var controller1 = this.nes.controller1;
    var controller2 = this.nes.controller2;
    if(addr < 0x2000) {
        // 2KB CPU RAM and Mirrors
        this.mem[addr & 0x07ff] = value;
    } else if(addr < 0x4000) {
        // PPU registers and Mirrors
        ppu.writeReg(addr & 0x2007, value);
    } else if(addr === 0x4014) {
        // OAM DMA
        var j = value << 8;
        var buf = new Uint8Array(256);
        for(var i = 0; i < buf.length; i++) {
            buf[i] = this.readByte(j + i);
        }
        ppu.writeOAM(buf);
        this.suspendCycle += 513;
    } else if(addr === 0x4016) {
        // Controller
        controller1.writeByte(value);
        controller2.writeByte(value);
    } else if(addr < 0x4018) {
        // APU: $4000-$4013, $4015, $4017
        
    } else if(addr < 0x4020) {
        // APU and I/O functionality that is normally disabled
        
    } else {
        // PRG ROM, PRG RAM, and mapper registers
        this.nes.mapper.writeByte(addr, value);
    }
};

CPU.prototype.setFlag = function(value) {
    this.flag.C = value & 1;
    this.flag.Z = (value >> 1) & 1;
    this.flag.I = (value >> 2) & 1;
    this.flag.D = (value >> 3) & 1;
    this.flag.B = (value >> 4) & 1;
    this.flag.U = 1;
    this.flag.V = (value >> 6) & 1;
    this.flag.N = (value >> 7) & 1;
};

CPU.prototype.getFlag = function() {
    return this.flag.C
        | (this.flag.Z << 1)
        | (this.flag.I << 2)
        | (this.flag.D << 3)
        | (this.flag.B << 4)
        | (this.flag.U << 5)
        | (this.flag.V << 6)
        | (this.flag.N << 7);
};

CPU.prototype.step = function(callback) {
    var opinf = this.opdata()[this.readByte(this.reg.PC)];
    if(!opinf) {
        console.log('unknown opcode: $' + this.readByte(this.reg.PC).toString(16));
        return;
    }
    /*console.log(
        this.reg.PC.toString(16).toUpperCase(), 
        this.reg.A.toString(16).toUpperCase(), 
        this.reg.X.toString(16).toUpperCase(), 
        this.reg.Y.toString(16).toUpperCase(), 
        this.getFlag().toString(16).toUpperCase(), 
        (this.reg.SP & 0xff).toString(16).toUpperCase()
    );*/
    var opaddr = this.reg.PC;
    
    // =============test start===============
    var inst = [];
    for(var i = 0; i < opinf.len; i++) {
        inst.push(this.mem[opaddr + i]);
    }
    var result = {
        addr: opaddr,
        inst: inst,
        A: this.reg.A,
        X: this.reg.X,
        Y: this.reg.Y,
        P: this.getFlag(),
        SP: this.reg.SP & 0xff
    };
    if(callback) {
        callback(result);
    }
    // =============test end===============
    
    this.reg.PC += opinf.len;
    var cycle = opinf.cycle;
    var name = opinf.name;
    var mode = opinf.mode;
    var addr = 0;
    var cycleAdd = 0;
    var tmp;
    var add;
    
    switch(mode) {
        case this.ZERO_PAGE:
            addr = this.readByte(opaddr + 1);
            break;
        
        case this.RELATIVE:
            addr = this.readByte(opaddr + 1);
            if(addr & 0x80) {
                addr -= 0x100;
            }
            addr += this.reg.PC;
            break;
        
        case this.IMPLIED:
            // Ignore
            break;
        
        case this.ABSOLUTE:
            addr = this.read2Bytes(opaddr + 1);
            break;
        
        case this.ACCUMULATOR:
            addr = opaddr + 1;
            break;
        
        case this.IMMEDIATE:
            addr = opaddr + 1;
            break;
        
        case this.ZERO_PAGE_X:
            addr = (this.readByte(opaddr + 1) + this.reg.X) & 0xff;
            break;
        
        case this.ZERO_PAGE_Y:
            addr = (this.readByte(opaddr + 1) + this.reg.Y) & 0xff;
            break;
        
        case this.ABSOLUTE_X:
            tmp = this.read2Bytes(opaddr + 1);
            addr = tmp + this.reg.X;
            if(this.isCrossPage(tmp, addr)) {
                cycleAdd = 1;
            }
            break;
        
        case this.ABSOLUTE_Y:
            tmp = this.read2Bytes(opaddr + 1);
            addr = tmp + this.reg.Y;
            if(this.isCrossPage(tmp, addr)) {
                cycleAdd = 1;
            }
            break;
        
        case this.INDIRECT_X:
            tmp = this.readByte(opaddr + 1) + this.reg.X;
            addr = this.readByte(tmp & 0xff) 
                | this.readByte((tmp + 1) & 0xff) << 8;
            break;
        
        case this.INDIRECT_Y:
            tmp = this.readByte(opaddr + 1);
            tmp = this.readByte(tmp & 0xff) 
                | this.readByte((tmp + 1) & 0xff) << 8;
            addr = tmp + this.reg.Y;
            if(this.isCrossPage(tmp, addr)) {
                cycleAdd = 1;
            }
            break;
        
        case this.INDIRECT:
            addr = this.read2Bytes(opaddr + 1);
            if((addr & 0xff) === 0xff) {
                // Hardware bug
                addr = this.readByte(addr) 
                    | this.readByte(addr & 0xff00) << 8;
            } else {
                addr = this.read2Bytes(addr);
            }
            break;
    }
    addr &= 0xffff;
    
    switch(name) {
        case this.ADC:
            add = this.readByte(addr);
            tmp = this.reg.A + add + this.flag.C;
            if(((this.reg.A ^ add) & 0x80) === 0
                && ((this.reg.A ^ tmp) & 0x80) !== 0) {
                this.flag.V = 1;
            } else {
                this.flag.V = 0;
            }
            this.flag.C = tmp > 0xff ? 1 : 0;
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = (tmp & 0xff) === 0 ? 1 : 0;
            this.reg.A = tmp & 0xff;
            cycle += cycleAdd;
            break;
        
        case this.AND:
            this.reg.A &= this.readByte(addr);
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            cycle += cycleAdd;
            break;
        
        case this.ASL:
            if(mode === this.ACCUMULATOR) {
                this.flag.C = (this.reg.A >> 7) & 1;
                this.reg.A = (this.reg.A << 1) & 0xff;
                this.flag.N = (this.reg.A >> 7) & 1;
                this.flag.Z = this.reg.A === 0 ? 1 : 0;
            } else {
                tmp = this.readByte(addr);
                this.flag.C = (tmp >> 7) & 1;
                tmp = (tmp << 1) & 0xff;
                this.flag.N = (tmp >> 7) & 1;
                this.flag.Z = tmp === 0 ? 1 : 0;
                this.writeByte(addr, tmp);
            }
            break;
        
        case this.BCC:
            if(this.flag.C === 0) {
                cycle += 1;
                if(this.isCrossPage(this.reg.PC, addr)) {
                    cycle += 1;
                }
                this.reg.PC = addr;
            }
            break;
        
        case this.BCS:
            if(this.flag.C === 1) {
                cycle += 1;
                if(this.isCrossPage(this.reg.PC, addr)) {
                    cycle += 1;
                }
                this.reg.PC = addr;
            }
            break;
        
        case this.BEQ:
            if(this.flag.Z === 1) {
                cycle += 1;
                if(this.isCrossPage(this.reg.PC, addr)) {
                   cycle += 1;
                }
                this.reg.PC = addr;
            }
            break;
        
        case this.BIT:
            tmp = this.readByte(addr);
            this.flag.N = (tmp >> 7) & 1;
            this.flag.V = (tmp >> 6) & 1;
            tmp &= this.reg.A;
            this.flag.Z = tmp === 0 ? 1 : 0;
            break;
        
        case this.BMI:
            if(this.flag.N === 1) {
                cycle += 1;
                this.reg.PC = addr;
            }
            break;
        
        case this.BNE:
            if(this.flag.Z === 0) {
                cycle += 1;
                if(this.isCrossPage(this.reg.PC, addr)) {
                    cycle += 1;
                }
                this.reg.PC = addr;
            }
            break;
        
        case this.BPL:
            if(this.flag.N === 0) {
                cycle += 1;
                if(this.isCrossPage(this.reg.PC, addr)) {
                    cycle += 1;
                }
                this.reg.PC = addr;
            }
            break;
        
        case this.BRK:
            this.reg.PC += 2;
            this.push2Bytes(this.reg.PC);
            this.flag.B = 1;
            this.pushByte(this.getFlag());
            this.flag.I = 1;
            this.reg.PC = this.read2Bytes(0xfffe);
            this.reg.PC--;
            break;
        
        case this.BVC:
            if(this.flag.V === 0) {
                cycle += 1;
                if(this.isCrossPage(this.reg.PC, addr)) {
                    cycle += 1;
                }
                this.reg.PC = addr;
            }
            break;
        
        case this.BVS:
            if(this.flag.V === 1) {
                cycle += 1;
                if(this.isCrossPage(this.reg.PC, addr)) {
                    cycle += 1;
                }
                this.reg.PC = addr;
            }
            break;
        
        case this.CLC:
            this.flag.C = 0;
            break;
        
        case this.CLD:
            this.flag.D = 0;
            break;
        
        case this.CLI:
            this.flag.I = 0;
            break;
        
        case this.CLV:
            this.flag.V = 0;
            break;
        
        case this.CMP:
            tmp = this.reg.A - this.readByte(addr);
            this.flag.C = tmp >= 0 ? 1 : 0;
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = (tmp & 0xff) === 0 ? 1 : 0;
            cycle += cycleAdd;
            break;
        
        case this.CPX:
            tmp = this.reg.X - this.readByte(addr);
            this.flag.C = tmp >= 0 ? 1 : 0;
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = (tmp & 0xff) === 0 ? 1 : 0;
            break;
        
        case this.CPY:
            tmp = this.reg.Y - this.readByte(addr);
            this.flag.C = tmp >= 0 ? 1 : 0;
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = (tmp & 0xff) === 0 ? 1 : 0;
            break;
        
        case this.DEC:
            tmp = (this.readByte(addr) - 1) & 0xff;
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = tmp === 0 ? 1 : 0;
            this.writeByte(addr, tmp);
            break;
        
        case this.DEX:
            this.reg.X = (this.reg.X - 1) & 0xff;
            this.flag.N = (this.reg.X >> 7) &  1;
            this.flag.Z = this.reg.X === 0 ? 1 : 0;
            break;
        
        case this.DEY:
            this.reg.Y = (this.reg.Y - 1) & 0xff;
            this.flag.N = (this.reg.Y >> 7) & 1;
            this.flag.Z = this.reg.Y === 0 ? 1 : 0;
            break;
        
        case this.EOR:
            this.reg.A = (this.readByte(addr) ^ this.reg.A) & 0xff;
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            cycle += cycleAdd;
            break;
        
        case this.INC:
            tmp = (this.readByte(addr) + 1) & 0xff;
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = tmp === 0 ? 1 : 0;
            this.writeByte(addr, tmp);
            break;
        
        case this.INX:
            this.reg.X = (this.reg.X + 1) & 0xff;
            this.flag.N = (this.reg.X >> 7) & 1;
            this.flag.Z = this.reg.X === 0 ? 1 : 0;
            break;
        
        case this.INY:
            this.reg.Y++;
            this.reg.Y &= 0xff;
            this.flag.N = (this.reg.Y >> 7) & 1;
            this.flag.Z = this.reg.Y === 0 ? 1 : 0;
            break;
        
        case this.JMP:
            this.reg.PC = addr;
            break;
        
        case this.JSR:
            this.push2Bytes(this.reg.PC - 1);
            this.reg.PC = addr;
            break;
        
        case this.LDA:
            this.reg.A = this.readByte(addr);
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            cycle += cycleAdd;
            break;
        
        case this.LDX:
            this.reg.X = this.readByte(addr);
            this.flag.N = (this.reg.X >> 7) & 1;
            this.flag.Z = this.reg.X === 0 ? 1 : 0;
            cycle += cycleAdd;
            break;
        
        case this.LDY:
            this.reg.Y = this.readByte(addr);
            this.flag.N = (this.reg.Y >> 7) & 1;
            this.flag.Z = this.reg.Y === 0 ? 1 : 0;
            cycle += cycleAdd;
            break;
        
        case this.LSR:
            if(mode === this.ACCUMULATOR) {
                tmp = this.reg.A & 0xff;
                this.flag.C = tmp & 1;
                tmp >>= 1;
                this.reg.A = tmp;
            } else {
                tmp = this.readByte(addr) & 0xff;
                this.flag.C = tmp & 1;
                tmp >>= 1;
                this.writeByte(addr, tmp);
            }
            this.flag.N = 0;
            this.flag.Z = tmp === 0 ? 1 : 0;
            break;
        
        case this.NOP:
            // Ignore
            break;
        
        case this.ORA:
            tmp = (this.readByte(addr) | this.reg.A) & 0xff;
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = tmp === 0 ? 1 : 0;
            this.reg.A = tmp;
            cycle += cycleAdd;
            break;
        
        case this.PHA:
            this.pushByte(this.reg.A);
            break;
        
        case this.PHP:
            this.flag.B = 1;
            this.pushByte(this.getFlag());
            this.flag.B = 0;
            break;
        
        case this.PLA:
            this.reg.A = this.popByte();
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            break;
        
        case this.PLP:
            tmp = this.popByte();
            this.setFlag(tmp);
            this.flag.B = 0;
            break;
        
        case this.ROL:
            if(mode === this.ACCUMULATOR) {
                tmp = this.reg.A;
                add = this.flag.C;
                this.flag.C = (tmp >> 7) & 1;
                tmp = ((tmp << 1) & 0xff) + add;
                this.reg.A = tmp;
            } else {
                tmp = this.readByte(addr);
                add = this.flag.C;
                this.flag.C = (tmp >> 7) & 1;
                tmp = ((tmp << 1) & 0xff) + add;
                this.writeByte(addr, tmp);
            }
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = tmp === 0 ? 1 : 0;
            break;
        
        case this.ROR:
            if(mode === this.ACCUMULATOR) {
                add = this.flag.C << 7;
                this.flag.C = this.reg.A & 1;
                tmp = (this.reg.A >> 1) + add;
                this.reg.A = tmp;
            } else {
                tmp = this.readByte(addr);
                add = this.flag.C << 7;
                this.flag.C = tmp & 1;
                tmp = (tmp >> 1) + add;
                this.writeByte(addr, tmp);
            }
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = tmp === 0 ? 1 : 0;
            break;
        
        case this.RTI:
            tmp = this.popByte();
            this.setFlag(tmp);
            this.reg.PC = this.pop2Bytes();
            if(this.reg.PC === 0xffff) {
                return;
            }
            break;
        
        case this.RTS:
            this.reg.PC = this.pop2Bytes() + 1;
            if(this.reg.PC === 0xffff) {
                return;
            }
            break;
        
        case this.SBC:
            tmp = this.reg.A - this.readByte(addr) - (1 - this.flag.C);
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = (tmp & 0xff) === 0 ? 1 : 0;
            if(((this.reg.A ^ tmp) & 0x80) !== 0
                && ((this.reg.A ^ this.readByte(addr)) & 0x80) !== 0) {
                this.flag.V = 1;
            } else {
                this.flag.V = 0;
            }
            this.flag.C = tmp >= 0 ? 1 : 0;
            this.reg.A = tmp & 0xff;
            cycle += cycleAdd;
            break;
        
        case this.SEC:
            this.flag.C = 1;
            break;
        
        case this.SED:
            this.flag.D = 1;
            break;
        
        case this.SEI:
            this.flag.I = 1;
            break;
        
        case this.STA:
            this.writeByte(addr, this.reg.A);
            break;
        
        case this.STX:
            this.writeByte(addr, this.reg.X);
            break;
        
        case this.STY:
            this.writeByte(addr, this.reg.Y);
            break;
        
        case this.TAX:
            this.reg.X = this.reg.A;
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;;
            break;
        
        case this.TAY:
            this.reg.Y = this.reg.A;
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            break;
        
        case this.TSX:
            this.reg.X = this.reg.SP - 0x0100;
            this.flag.N = (this.reg.SP >> 7) & 1;
            this.flag.Z = this.reg.X === 0 ? 1 : 0;
            break;
        
        case this.TXA:
            this.reg.A = this.reg.X;
            this.flag.N = (this.reg.X >> 7) & 1;
            this.flag.Z = this.reg.X === 0 ? 1 : 0;
            break;
        
        case this.TXS:
            this.reg.SP = this.reg.X + 0x0100;
            this.reg.SP = 0x0100 | (this.reg.SP & 0xff);
            break;
        
        case this.TYA:
            this.reg.A = this.reg.Y;
            this.flag.N = (this.reg.Y >> 7) & 1;
            this.flag.Z = this.reg.Y === 0 ? 1 : 0;
            break;
        
        case this.ALR:
            tmp = this.reg.A & this.readByte(addr);
            this.reg.A = tmp >> 1;
            this.flag.C = tmp & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            this.flag.N = 0;
            break;
        
        case this.ANC:
            this.reg.A &= this.readByte(addr);
            this.flag.C = this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            break;
        
        case this.ARR:
            tmp = this.reg.A & this.readByte(addr);
            this.reg.A = (tmp >> 1) + (this.flag.C << 7);
            this.flag.N = this.flag.C;
            this.flag.C = (tmp >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            this.flag.V = ((tmp >> 7) ^ (tmp >> 6)) & 1;
            break;
        
        case this.AXS:
            tmp = (this.reg.X & this.reg.A) - this.readByte(addr);
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = (tmp & 0xff) === 0 ? 1 : 0;
            if(((this.reg.X ^ tmp) & 0x80) !== 0
                && ((this.reg.X ^ this.readByte(addr)) & 0x80) !== 0) {
                this.flag.V = 1;
            } else {
                this.flag.V = 0;
            }
            this.reg.X = tmp & 0xff;
            this.flag.C = tmp >= 0 ? 1 : 0;
            break;
        
        case this.LAX:
            this.reg.A = this.reg.X = this.readByte(addr);
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            cycle += cycleAdd;
            break;
        
        case this.SAX:
            this.writeByte(addr, this.reg.A & this.reg.X);
            break;
        
        case this.DCP:
            tmp = (this.readByte(addr) - 1) & 0xff;
            this.writeByte(addr, tmp);
            tmp = this.reg.A - tmp;
            this.flag.C = tmp >= 0 ? 1 : 0;
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = (tmp & 0xff) === 0 ? 1 : 0;
            break;
        
        case this.ISC:
            tmp = (this.readByte(addr) + 1) & 0xff;
            this.writeByte(addr, tmp);
            tmp = this.reg.A - tmp - (1 - this.flag.C);
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = (tmp & 0xff) === 0 ? 1 : 0;
            if(((this.reg.A ^ tmp) & 0x80) !== 0
                && ((this.reg.A ^ this.readByte(addr)) & 0x80) !== 0) {
                this.flag.V = 1;
            } else {
                this.flag.V = 0;
            }
            this.flag.C = tmp >= 0 ? 1 : 0;
            this.reg.A = tmp & 0xff;
            break;
        
        case this.RLA:
            tmp = this.readByte(addr);
            add = this.flag.C;
            this.flag.C = (tmp >> 7) & 1;
            tmp = ((tmp << 1) & 0xff) + add;
            this.writeByte(addr, tmp);
            this.reg.A &= tmp;
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            break;
        
        case this.RRA:
            tmp = this.readByte(addr);
            add = this.flag.C << 7;
            this.flag.C = tmp & 1;
            tmp = (tmp >> 1) + add;
            this.writeByte(addr, tmp);
            tmp = this.reg.A + this.readByte(addr) + this.flag.C;
            if(((this.reg.A ^ this.readByte(addr)) & 0x80) === 0
                && ((this.reg.A ^ tmp) & 0x80) !== 0) {
                this.flag.V = 1;
            } else {
                this.flag.V = 0;
            }
            this.flag.C = tmp > 0xff ? 1 : 0;
            this.flag.N = (tmp >> 7) & 1;
            this.flag.Z = (tmp & 0xff) === 0 ? 1 : 0;
            this.reg.A = tmp & 0xff;
            break;
        
        case this.SLO:
            tmp = this.readByte(addr);
            this.flag.C = (tmp >> 7) & 1;
            tmp = (tmp << 1) & 0xff;
            this.writeByte(addr, tmp);
            this.reg.A |= tmp;
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            break;
        
        case this.SRE:
            tmp = this.readByte(addr) & 0xff;
            this.flag.C = tmp & 1;
            tmp >>= 1;
            this.writeByte(addr, tmp);
            this.reg.A ^= tmp;
            this.flag.N = (this.reg.A >> 7) & 1;
            this.flag.Z = this.reg.A === 0 ? 1 : 0;
            break;
        
        case this.SKB:
            // Do nothing
            break;
        
        case this.IGN:
            this.readByte(addr);
            if(mode !== this.INDIRECT_Y) {
                cycle += cycleAdd;
            }
            break;
    }
    return cycle;
};




























































































































































