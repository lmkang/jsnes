function CPU(nes) {
    nes.cpu = this;
    this.nes = nes;
    this.mem = new Uint8Array(0x800);
    this.OPDATA = Object.freeze({
        // http://6502.org/tutorials/6502opcodes.html
        
        // ADC
        0x69: {func: this.ADC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x65: {func: this.ADC, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x75: {func: this.ADC, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0x6D: {func: this.ADC, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0x7D: {func: this.ADC, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0x79: {func: this.ADC, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
        0x61: {func: this.ADC, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0x71: {func: this.ADC, mode: this.INDIRECT_Y , len: 2, cycle: 5},
        
        // AND
        0x29: {func: this.AND, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x25: {func: this.AND, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x35: {func: this.AND, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0x2D: {func: this.AND, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0x3D: {func: this.AND, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0x39: {func: this.AND, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
        0x21: {func: this.AND, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0x31: {func: this.AND, mode: this.INDIRECT_Y , len: 2, cycle: 5},

        // ASL
        0x0A: {func: this.ASL, mode: this.ACCUMULATOR, len: 1, cycle: 2},
        0x06: {func: this.ASL, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0x16: {func: this.ASL, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0x0E: {func: this.ASL, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0x1E: {func: this.ASL, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        
        // BIT
        0x24: {func: this.BIT, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x2C: {func: this.BIT, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        
        // Branch Instructions
        0x10: {func: this.BPL, mode: this.RELATIVE   , len: 2, cycle: 2},
        0x30: {func: this.BMI, mode: this.RELATIVE   , len: 2, cycle: 2},
        0x50: {func: this.BVC, mode: this.RELATIVE   , len: 2, cycle: 2},
        0x70: {func: this.BVS, mode: this.RELATIVE   , len: 2, cycle: 2},
        0x90: {func: this.BCC, mode: this.RELATIVE   , len: 2, cycle: 2},
        0xB0: {func: this.BCS, mode: this.RELATIVE   , len: 2, cycle: 2},
        0xD0: {func: this.BNE, mode: this.RELATIVE   , len: 2, cycle: 2},
        0xF0: {func: this.BEQ, mode: this.RELATIVE   , len: 2, cycle: 2},
        
        // BRK
        0x00: {func: this.BRK, mode: this.IMPLIED    , len: 1, cycle: 7},
        
        // CMP
        0xC9: {func: this.CMP, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xC5: {func: this.CMP, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0xD5: {func: this.CMP, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0xCD: {func: this.CMP, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0xDD: {func: this.CMP, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0xD9: {func: this.CMP, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
        0xC1: {func: this.CMP, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0xD1: {func: this.CMP, mode: this.INDIRECT_Y , len: 2, cycle: 5},
        
        // CPX
        0xE0: {func: this.CPX, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xE4: {func: this.CPX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0xEC: {func: this.CPX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        
        // CPY
        0xC0: {func: this.CPY, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xC4: {func: this.CPY, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0xCC: {func: this.CPY, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        
        // DEC
        0xC6: {func: this.DEC, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0xD6: {func: this.DEC, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0xCE: {func: this.DEC, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0xDE: {func: this.DEC, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        
        // EOR
        0x49: {func: this.EOR, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x45: {func: this.EOR, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x55: {func: this.EOR, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0x4D: {func: this.EOR, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0x5D: {func: this.EOR, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0x59: {func: this.EOR, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
        0x41: {func: this.EOR, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0x51: {func: this.EOR, mode: this.INDIRECT_Y , len: 2, cycle: 5},
        
        // Flag(Processor Status) Instructions
        0x18: {func: this.CLC, mode: this.IMPLIED    , len: 1, cycle: 2},
        0x38: {func: this.SEC, mode: this.IMPLIED    , len: 1, cycle: 2},
        0x58: {func: this.CLI, mode: this.IMPLIED    , len: 1, cycle: 2},
        0x78: {func: this.SEI, mode: this.IMPLIED    , len: 1, cycle: 2},
        0xB8: {func: this.CLV, mode: this.IMPLIED    , len: 1, cycle: 2},
        0xD8: {func: this.CLD, mode: this.IMPLIED    , len: 1, cycle: 2},
        0xF8: {func: this.SED, mode: this.IMPLIED    , len: 1, cycle: 2},
        
        // INC
        0xE6: {func: this.INC, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0xF6: {func: this.INC, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0xEE: {func: this.INC, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0xFE: {func: this.INC, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        
        // JMP
        0x4C: {func: this.JMP, mode: this.ABSOLUTE   , len: 3, cycle: 3},
        0x6C: {func: this.JMP, mode: this.INDIRECT   , len: 3, cycle: 5},
        
        // JSR
        0x20: {func: this.JSR, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        
        // LDA
        0xA9: {func: this.LDA, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xA5: {func: this.LDA, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0xB5: {func: this.LDA, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0xAD: {func: this.LDA, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0xBD: {func: this.LDA, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0xB9: {func: this.LDA, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
        0xA1: {func: this.LDA, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0xB1: {func: this.LDA, mode: this.INDIRECT_Y , len: 2, cycle: 5},
        
        // LDX
        0xA2: {func: this.LDX, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xA6: {func: this.LDX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0xB6: {func: this.LDX, mode: this.ZERO_PAGE_Y, len: 2, cycle: 4},
        0xAE: {func: this.LDX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0xBE: {func: this.LDX, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
        
        // LDY
        0xA0: {func: this.LDY, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xA4: {func: this.LDY, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0xB4: {func: this.LDY, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0xAC: {func: this.LDY, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0xBC: {func: this.LDY, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        
        // LSR
        0x4A: {func: this.LSR, mode: this.ACCUMULATOR, len: 1, cycle: 2},
        0x46: {func: this.LSR, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0x56: {func: this.LSR, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0x4E: {func: this.LSR, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0x5E: {func: this.LSR, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        
        // NOP
        0xEA: {func: this.NOP, mode: this.IMPLIED    , len: 1, cycle: 2},
        
        // ORA
        0x09: {func: this.ORA, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x05: {func: this.ORA, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x15: {func: this.ORA, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0x0D: {func: this.ORA, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0x1D: {func: this.ORA, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0x19: {func: this.ORA, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
        0x01: {func: this.ORA, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0x11: {func: this.ORA, mode: this.INDIRECT_Y , len: 2, cycle: 5},
        
        // Register Instructions
        0xAA: {func: this.TAX, mode: this.IMPLIED    , len: 1, cycle: 2},
        0x8A: {func: this.TXA, mode: this.IMPLIED    , len: 1, cycle: 2},
        0xCA: {func: this.DEX, mode: this.IMPLIED    , len: 1, cycle: 2},
        0xE8: {func: this.INX, mode: this.IMPLIED    , len: 1, cycle: 2},
        0xA8: {func: this.TAY, mode: this.IMPLIED    , len: 1, cycle: 2},
        0x98: {func: this.TYA, mode: this.IMPLIED    , len: 1, cycle: 2},
        0x88: {func: this.DEY, mode: this.IMPLIED    , len: 1, cycle: 2},
        0xC8: {func: this.INY, mode: this.IMPLIED    , len: 1, cycle: 2},
        
        // ROL
        0x2A: {func: this.ROL, mode: this.ACCUMULATOR, len: 1, cycle: 2},
        0x26: {func: this.ROL, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0x36: {func: this.ROL, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0x2E: {func: this.ROL, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0x3E: {func: this.ROL, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        
        // ROR
        0x6A: {func: this.ROR, mode: this.ACCUMULATOR, len: 1, cycle: 2},
        0x66: {func: this.ROR, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0x76: {func: this.ROR, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0x6E: {func: this.ROR, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0x7E: {func: this.ROR, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        
        // RTI
        0x40: {func: this.RTI, mode: this.IMPLIED    , len: 1, cycle: 6},
        
        // RTS
        0x60: {func: this.RTS, mode: this.IMPLIED    , len: 1, cycle: 6},
        
        // SBC
        0xE9: {func: this.SBC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xE5: {func: this.SBC, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0xF5: {func: this.SBC, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0xED: {func: this.SBC, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0xFD: {func: this.SBC, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0xF9: {func: this.SBC, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
        0xE1: {func: this.SBC, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0xF1: {func: this.SBC, mode: this.INDIRECT_Y , len: 2, cycle: 5},
        
        // STA
        0x85: {func: this.STA, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x95: {func: this.STA, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0x8D: {func: this.STA, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0x9D: {func: this.STA, mode: this.ABSOLUTE_X , len: 3, cycle: 5},
        0x99: {func: this.STA, mode: this.ABSOLUTE_Y , len: 3, cycle: 5},
        0x81: {func: this.STA, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0x91: {func: this.STA, mode: this.INDIRECT_Y , len: 2, cycle: 6},
        
        // Stack Instructions
        0x9A: {func: this.TXS, mode: this.IMPLIED    , len: 1, cycle: 2},
        0xBA: {func: this.TSX, mode: this.IMPLIED    , len: 1, cycle: 2},
        0x48: {func: this.PHA, mode: this.IMPLIED    , len: 1, cycle: 3},
        0x68: {func: this.PLA, mode: this.IMPLIED    , len: 1, cycle: 4},
        0x08: {func: this.PHP, mode: this.IMPLIED    , len: 1, cycle: 3},
        0x28: {func: this.PLP, mode: this.IMPLIED    , len: 1, cycle: 4},
        
        // STX
        0x86: {func: this.STX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x96: {func: this.STX, mode: this.ZERO_PAGE_Y, len: 2, cycle: 4},
        0x8E: {func: this.STX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        
        // STY
        0x84: {func: this.STY, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x94: {func: this.STY, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0x8C: {func: this.STY, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        
        // https://www.nesdev.org/wiki/Programming_with_unofficial_opcodes
        
        // Combined operations
        0x4B: {func: this.ALR, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x0B: {func: this.ANC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x2B: {func: this.ANC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x6B: {func: this.ARR, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xCB: {func: this.AXS, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xA3: {func: this.LAX, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0xA7: {func: this.LAX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0xAF: {func: this.LAX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0xB3: {func: this.LAX, mode: this.INDIRECT_Y , len: 2, cycle: 5},
        0xB7: {func: this.LAX, mode: this.ZERO_PAGE_Y, len: 2, cycle: 4},
        0xBF: {func: this.LAX, mode: this.ABSOLUTE_Y , len: 3, cycle: 4},
        0x83: {func: this.SAX, mode: this.INDIRECT_X , len: 2, cycle: 6},
        0x87: {func: this.SAX, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x8F: {func: this.SAX, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0x97: {func: this.SAX, mode: this.ZERO_PAGE_Y, len: 2, cycle: 4},
        
        // RMW instructions
        0xC3: {func: this.DCP, mode: this.INDIRECT_X , len: 2, cycle: 8},
        0xC7: {func: this.DCP, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0xCF: {func: this.DCP, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0xD3: {func: this.DCP, mode: this.INDIRECT_Y , len: 2, cycle: 8},
        0xD7: {func: this.DCP, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0xDB: {func: this.DCP, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
        0xDF: {func: this.DCP, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        0xE3: {func: this.ISC, mode: this.INDIRECT_X , len: 2, cycle: 8},
        0xE7: {func: this.ISC, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0xEF: {func: this.ISC, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0xF3: {func: this.ISC, mode: this.INDIRECT_Y , len: 2, cycle: 8},
        0xF7: {func: this.ISC, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0xFB: {func: this.ISC, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
        0xFF: {func: this.ISC, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        0x23: {func: this.RLA, mode: this.INDIRECT_X , len: 2, cycle: 8},
        0x27: {func: this.RLA, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0x2F: {func: this.RLA, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0x33: {func: this.RLA, mode: this.INDIRECT_Y , len: 2, cycle: 8},
        0x37: {func: this.RLA, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0x3B: {func: this.RLA, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
        0x3F: {func: this.RLA, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        0x63: {func: this.RRA, mode: this.INDIRECT_X , len: 2, cycle: 8},
        0x67: {func: this.RRA, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0x6F: {func: this.RRA, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0x73: {func: this.RRA, mode: this.INDIRECT_Y , len: 2, cycle: 8},
        0x77: {func: this.RRA, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0x7B: {func: this.RRA, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
        0x7F: {func: this.RRA, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        0x03: {func: this.SLO, mode: this.INDIRECT_X , len: 2, cycle: 8},
        0x07: {func: this.SLO, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0x0F: {func: this.SLO, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0x13: {func: this.SLO, mode: this.INDIRECT_Y , len: 2, cycle: 8},
        0x17: {func: this.SLO, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0x1B: {func: this.SLO, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
        0x1F: {func: this.SLO, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        0x43: {func: this.SRE, mode: this.INDIRECT_X , len: 2, cycle: 8},
        0x47: {func: this.SRE, mode: this.ZERO_PAGE  , len: 2, cycle: 5},
        0x4F: {func: this.SRE, mode: this.ABSOLUTE   , len: 3, cycle: 6},
        0x53: {func: this.SRE, mode: this.INDIRECT_Y , len: 2, cycle: 8},
        0x57: {func: this.SRE, mode: this.ZERO_PAGE_X, len: 2, cycle: 6},
        0x5B: {func: this.SRE, mode: this.ABSOLUTE_Y , len: 3, cycle: 7},
        0x5F: {func: this.SRE, mode: this.ABSOLUTE_X , len: 3, cycle: 7},
        
        // Duplicated instructions
        0x69: {func: this.ADC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xEB: {func: this.SBC, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        
        // NOPs
        0x1A: {func: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
        0x3A: {func: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
        0x5A: {func: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
        0x7A: {func: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
        0xDA: {func: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
        0xFA: {func: this.NOP, mode: this.IMMEDIATE  , len: 1, cycle: 2},
        0x80: {func: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x82: {func: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x89: {func: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xC2: {func: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0xE2: {func: this.SKB, mode: this.IMMEDIATE  , len: 2, cycle: 2},
        0x0C: {func: this.IGN, mode: this.ABSOLUTE   , len: 3, cycle: 4},
        0x1C: {func: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0x3C: {func: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0x5C: {func: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0x7C: {func: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0xDC: {func: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0xFC: {func: this.IGN, mode: this.ABSOLUTE_X , len: 3, cycle: 4},
        0x04: {func: this.IGN, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x44: {func: this.IGN, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x64: {func: this.IGN, mode: this.ZERO_PAGE  , len: 2, cycle: 3},
        0x14: {func: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0x34: {func: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0x54: {func: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0x74: {func: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0xD4: {func: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
        0xF4: {func: this.IGN, mode: this.ZERO_PAGE_X, len: 2, cycle: 4},
    });
}

CPU.prototype.reset = function() {
    this.reg = {
        A: 0,
        X: 0,
        Y: 0,
        SP: 0xfd,
        PC: this.read2Bytes(0xfffc)
    };
    this.flag = {
        C: 0,
        Z: 0,
        I: 0,
        D: 0,
        B: 0,
        U: 1,
        V: 0,
        N: 0
    };
    this.suspendCycle = 0;
    this.deferCycle = 8;
    this.cycle = 0;
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
        this.deferCycle += this.step();
    }
    this.deferCycle--;
    this.cycle++;
};

CPU.prototype.isCrossPage = function(addr1, addr2) {
    return (addr1 & 0xff00) !== (addr2 & 0xff00);
};

CPU.prototype.pushByte = function(value) {
    this.writeByte(0x0100 | this.reg.SP, value);
    this.reg.SP--;
};

CPU.prototype.push2Bytes = function(value) {
    this.pushByte((value >> 8) & 0xff);
    this.pushByte(value & 0xff);
};

CPU.prototype.popByte = function() {
    this.reg.SP++;
    return this.readByte(0x0100 | this.reg.SP);
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
        // APU: $4000-$4013, $4015
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
    return (b1 | b2 << 8) & 0xffff;
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
        this.suspendCycle += this.cycle & 0x01 ? 513 : 514;
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

CPU.prototype.step = function() {
    var opaddr = this.reg.PC;
    var opinf = this.OPDATA[this.readByte(opaddr)]
    if(!opinf) {
        console.log('unknown opcode $' + this.readByte(opaddr).toString(16));
        return;
    }
    this.reg.PC += opinf.len;
    var cycle = opinf.cycle;
    var data = opinf.mode.bind(this)(opaddr);
    if(!isNaN(data.addr)) {
        data.addr &= 0xffff;
    }
    cycle += opinf.func.bind(this)(data.addr, data.cycle);
    return cycle;
};

CPU.prototype.ZERO_PAGE = function(opaddr) {
    return {
        addr: this.readByte(opaddr + 1),
        cycle: 0
    };
};

CPU.prototype.RELATIVE = function(opaddr) {
    var addr = this.readByte(opaddr + 1);
    if(addr & 0x80) {
        addr -= 0x100;
    }
    addr += this.reg.PC;
    return {
        addr: addr,
        cycle: 0
    };
};

CPU.prototype.IMPLIED = function(opaddr) {
    // Ignore
    return {
        addr: null,
        cycle: 0
    };
};

CPU.prototype.ABSOLUTE = function(opaddr) {
    return {
        addr: this.read2Bytes(opaddr + 1),
        cycle: 0
    };
};

CPU.prototype.ACCUMULATOR = function(opaddr) {
    return {
        addr: 'A',
        cycle: 0
    };
};

CPU.prototype.IMMEDIATE = function(opaddr) {
    return {
        addr: opaddr + 1,
        cycle: 0
    };
};

CPU.prototype.ZERO_PAGE_X = function(opaddr) {
    return {
        addr: (this.readByte(opaddr + 1) + this.reg.X) & 0xff,
        cycle: 0
    };
};

CPU.prototype.ZERO_PAGE_Y = function(opaddr) {
    return {
        addr: (this.readByte(opaddr + 1) + this.reg.Y) & 0xff,
        cycle: 0
    };
};

CPU.prototype.ABSOLUTE_X = function(opaddr) {
    var base = this.read2Bytes(opaddr + 1);
    var addr = base + this.reg.X;
    var cycle = 0;
    if(this.isCrossPage(base, addr)) {
        cycle = 1;
    }
    return {
        addr: addr,
        cycle: cycle
    };
};

CPU.prototype.ABSOLUTE_Y = function(opaddr) {
    var base = this.read2Bytes(opaddr + 1);
    var addr = base + this.reg.Y;
    var cycle = 0;
    if(this.isCrossPage(base, addr)) {
        cycle = 1;
    }
    return {
        addr: addr,
        cycle: cycle
    };
};

CPU.prototype.INDIRECT_X = function(opaddr) {
    var addr = this.readByte(opaddr + 1) + this.reg.X;
    addr = this.readByte(addr & 0xff) 
        | this.readByte((addr + 1) & 0xff) << 8;
    return {
        addr: addr,
        cycle: 0
    };
};

CPU.prototype.INDIRECT_Y = function(opaddr) {
    var base = this.readByte(opaddr + 1);
    base = this.readByte(base & 0xff) 
        | this.readByte((base + 1) & 0xff) << 8;
    var addr = base + this.reg.Y;
    var cycle = 0;
    if(this.isCrossPage(base, addr)) {
        cycle = 1;
    }
    return {
        addr: addr,
        cycle: cycle
    };
};

CPU.prototype.INDIRECT = function(opaddr) {
    var addr = this.read2Bytes(opaddr + 1);
    if((addr & 0xff) === 0xff) {
        // Hardware bug
        addr = this.readByte(addr) 
            | this.readByte(addr & 0xff00) << 8;
    } else {
        addr = this.read2Bytes(addr);
    }
    return {
        addr: addr,
        cycle: 0
    };
};

CPU.prototype.ADC = function(addr, cycle) {
    var data = this.readByte(addr);
    var value = data + this.reg.A + this.flag.C;
    this.flag.C = value > 0xff ? 1 : 0;
    if((~(this.reg.A ^ data) & (this.reg.A ^ value)) & 0x80) {
        this.flag.V = 1;
    } else {
        this.flag.V = 0;
    }
    this.flag.N = (value >> 7) & 1;
    this.flag.Z = (value & 0xff) === 0 ? 1 : 0;
    this.reg.A = value & 0xff;
    return cycle;
};

CPU.prototype.AND = function(addr, cycle) {
    this.reg.A &= this.readByte(addr);
    this.flag.N = (this.reg.A >> 7) & 1;
    this.flag.Z = (this.reg.A & 0xff) === 0 ? 1 : 0;
    return cycle;
};

CPU.prototype.ASL = function(addr, cycle) {
    var data;
    if(addr === 'A') {
        data = this.reg.A;
    } else {
        data = this.readByte(addr);
    }
    this.flag.C = (data >> 7) & 1;
    data = (data << 1) & 0xff;
    this.flag.N = (data >> 7) & 1;
    this.flag.Z = data === 0 ? 1 : 0;
    if(addr === 'A') {
        this.reg.A = data;
    } else {
        this.writeByte(addr, data);
    }
    return 0;
};

CPU.prototype.BCC = function(addr, cycle) {
    if(this.flag.C === 0) {
        cycle += 1;
        if(this.isCrossPage(this.reg.PC, addr)) {
            cycle += 1;
        }
        this.reg.PC = addr;
    }
    return cycle;
};

CPU.prototype.BCS = function(addr, cycle) {
    if(this.flag.C === 1) {
        cycle += 1;
        if(this.isCrossPage(this.reg.PC, addr)) {
            cycle += 1;
        }
        this.reg.PC = addr;
    }
    return cycle;
};

CPU.prototype.BEQ = function(addr, cycle) {
    if(this.flag.Z === 1) {
        cycle += 1;
        if(this.isCrossPage(this.reg.PC, addr)) {
           cycle += 1;
        }
        this.reg.PC = addr;
    }
    return cycle;
};

CPU.prototype.BIT = function(addr, cycle) {
    var data = this.readByte(addr);
    this.flag.N = (data >> 7) & 1;
    this.flag.V = (data >> 6) & 1;
    this.flag.Z = (this.reg.A & data) === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.BMI = function(addr, cycle) {
    if(this.flag.N === 1) {
        cycle += 1;
        if(this.isCrossPage(this.reg.PC, addr)) {
            cycle += 1;
        }
        this.reg.PC = addr;
    }
    return cycle;
};

CPU.prototype.BNE = function(addr, cycle) {
    if(this.flag.Z === 0) {
        cycle += 1;
        if(this.isCrossPage(this.reg.PC, addr)) {
            cycle += 1;
        }
        this.reg.PC = addr;
    }
    return cycle;
};

CPU.prototype.BPL = function(addr, cycle) {
    if(this.flag.N === 0) {
        cycle += 1;
        if(this.isCrossPage(this.reg.PC, addr)) {
            cycle += 1;
        }
        this.reg.PC = addr;
    }
    return cycle;
};

CPU.prototype.BRK = function(addr, cycle) {
    this.push2Bytes(this.reg.PC);
    this.flag.B = 1;
    this.pushByte(this.getFlag());
    this.flag.B = 0;
    this.flag.I = 1;
    this.reg.PC = this.read2Bytes(0xfffe);
    return 0;
};

CPU.prototype.BVC = function(addr, cycle) {
    if(this.flag.V === 0) {
        cycle += 1;
        if(this.isCrossPage(this.reg.PC, addr)) {
            cycle += 1;
        }
        this.reg.PC = addr;
    }
    return 0;
};

CPU.prototype.BVS = function(addr, cycle) {
    if(this.flag.V === 1) {
        cycle += 1;
        if(this.isCrossPage(this.reg.PC, addr)) {
            cycle += 1;
        }
        this.reg.PC = addr;
    }
    return cycle;
};

CPU.prototype.CLC = function(addr, cycle) {
    this.flag.C = 0;
    return 0;
};

CPU.prototype.CLD = function(addr, cycle) {
    this.flag.D = 0;
    return 0;
};

CPU.prototype.CLI = function(addr, cycle) {
    this.flag.I = 0;
    return 0;
};

CPU.prototype.CLV = function(addr, cycle) {
    this.flag.V = 0;
    return 0;
};

CPU.prototype.CMP = function(addr, cycle) {
    var data = this.reg.A - this.readByte(addr);
    this.flag.C = data >= 0 ? 1 : 0;
    this.flag.N = (data >> 7) & 1;
    this.flag.Z = (data & 0xff) === 0 ? 1 : 0;
    return cycle;
};

CPU.prototype.CPX = function(addr, cycle) {
    var data = this.reg.X - this.readByte(addr);
    this.flag.C = data >= 0 ? 1 : 0;
    this.flag.N = (data >> 7) & 1;
    this.flag.Z = (data & 0xff) === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.CPY = function(addr, cycle) {
    var data = this.reg.Y - this.readByte(addr);
    this.flag.C = data >= 0 ? 1 : 0;
    this.flag.N = (data >> 7) & 1;
    this.flag.Z = (data & 0xff) === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.DEC = function(addr, cycle) {
    var data = (this.readByte(addr) - 1) & 0xff;
    this.flag.N = (data >> 7) & 1;
    this.flag.Z = data === 0 ? 1 : 0;
    this.writeByte(addr, data);
    return 0;
};

CPU.prototype.DEX = function(addr, cycle) {
    this.reg.X = (this.reg.X - 1) & 0xff;
    this.flag.N = (this.reg.X >> 7) &  1;
    this.flag.Z = this.reg.X === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.DEY = function(addr, cycle) {
    this.reg.Y = (this.reg.Y - 1) & 0xff;
    this.flag.N = (this.reg.Y >> 7) & 1;
    this.flag.Z = this.reg.Y === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.EOR = function(addr, cycle) {
    this.reg.A ^= this.readByte(addr);
    this.flag.N = (this.reg.A >> 7) & 1;
    this.flag.Z = (this.reg.A & 0xff) === 0 ? 1 : 0;
    return cycle;
};

CPU.prototype.INC = function(addr, cycle) {
    var data = (this.readByte(addr) + 1) & 0xff;
    this.flag.N = (data >> 7) & 1;
    this.flag.Z = data === 0 ? 1 : 0;
    this.writeByte(addr, data);
    return 0;
};

CPU.prototype.INX = function(addr, cycle) {
    this.reg.X = (this.reg.X + 1) & 0xff;
    this.flag.N = (this.reg.X >> 7) & 1;
    this.flag.Z = this.reg.X === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.INY = function(addr, cycle) {
    this.reg.Y = (this.reg.Y + 1) & 0xff;
    this.flag.N = (this.reg.Y >> 7) & 1;
    this.flag.Z = this.reg.Y === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.JMP = function(addr, cycle) {
    this.reg.PC = addr;
    return 0;
};

CPU.prototype.JSR = function(addr, cycle) {
    this.push2Bytes(this.reg.PC - 1);
    this.reg.PC = addr;
    return 0;
};

CPU.prototype.LDA = function(addr, cycle) {
    this.reg.A = this.readByte(addr);
    this.flag.N = (this.reg.A >> 7) & 1;
    this.flag.Z = (this.reg.A & 0xff) === 0 ? 1 : 0;
    return cycle;
};

CPU.prototype.LDX = function(addr, cycle) {
    this.reg.X = this.readByte(addr);
    this.flag.N = (this.reg.X >> 7) & 1;
    this.flag.Z = (this.reg.X & 0xff) === 0 ? 1 : 0;
    return cycle;
};

CPU.prototype.LDY = function(addr, cycle) {
    this.reg.Y = this.readByte(addr);
    this.flag.N = (this.reg.Y >> 7) & 1;
    this.flag.Z = (this.reg.Y & 0xff) === 0 ? 1 : 0;
    return cycle;
};

CPU.prototype.LSR = function(addr, cycle) {
    var data;
    if(addr === 'A') {
        data = this.reg.A;
    } else {
        data = this.readByte(addr);
    }
    this.flag.C = data & 1;
    data >>= 1;
    this.flag.N = (data >> 7) & 1;
    this.flag.Z = (data & 0xff) === 0 ? 1 : 0;
    if(addr === 'A') {
        this.reg.A = data;
    } else {
        this.writeByte(addr, data);
    }
    return 0;
};

CPU.prototype.NOP = function(addr, cycle) {
    // Ignore
    return 0;
};

CPU.prototype.ORA = function(addr, cycle) {
    this.reg.A |= this.readByte(addr);
    this.flag.N = (this.reg.A >> 7) & 1;
    this.flag.Z = (this.reg.A & 0xff) === 0 ? 1 : 0;
    return cycle;
};

CPU.prototype.PHA = function(addr, cycle) {
    this.pushByte(this.reg.A);
    return 0;
};

CPU.prototype.PHP = function(addr, cycle) {
    this.flag.B = 1;
    this.pushByte(this.getFlag());
    this.flag.B = 0;
    return 0;
};

CPU.prototype.PLA = function(addr, cycle) {
    this.reg.A = this.popByte();
    this.flag.N = (this.reg.A >> 7) & 1;
    this.flag.Z = (this.reg.A & 0xff) === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.PLP = function(addr, cycle) {
    this.setFlag(this.popByte());
    this.flag.B = 0;
    return 0;
};

CPU.prototype.ROL = function(addr, cycle) {
    var data;
    if(addr === 'A') {
        data = this.reg.A;
    } else {
        data = this.readByte(addr);
    }
    var tmp = this.flag.C;
    this.flag.C = (data >> 7) & 1;
    data = (data << 1 | tmp) & 0xff;
    this.flag.N = (data >> 7) & 1;
    this.flag.Z = data === 0 ? 1 : 0;
    if(addr === 'A') {
        this.reg.A = data;
    } else {
        this.writeByte(addr, data);
    }
    return 0;
};

CPU.prototype.ROR = function(addr, cycle) {
    var data;
    if(addr === 'A') {
        data = this.reg.A;
    } else {
        data = this.readByte(addr);
    }
    var tmp = this.flag.C;
    this.flag.C = data & 1;
    data = data >> 1 | (tmp << 7);
    this.flag.N = (data >> 7) & 1;
    this.flag.Z = (data & 0xff) === 0 ? 1 : 0;
    if(addr === 'A') {
        this.reg.A = data;
    } else {
        this.writeByte(addr, data);
    }
    return 0;
};

CPU.prototype.RTI = function(addr, cycle) {
    this.setFlag(this.popByte());
    this.flag.B = 0;
    this.reg.PC = this.pop2Bytes();
    return 0;
};

CPU.prototype.RTS = function(addr, cycle) {
    this.reg.PC = this.pop2Bytes() + 1;
    return 0;
};

CPU.prototype.SBC = function(addr, cycle) {
    var data = this.readByte(addr);
    var value = this.reg.A - data - (1 - this.flag.C);
    this.flag.C = value >= 0 ? 1 : 0;
    if((value ^ this.reg.A) & (value ^ data ^ 0xff) & 0x80) {
        this.flag.V = 1;
    } else {
        this.flag.V = 0;
    }
    this.flag.N = (value >> 7) & 1;
    this.flag.Z = (value & 0xff) === 0 ? 1 : 0;
    this.reg.A = value & 0xff;
    return cycle;
};

CPU.prototype.SEC = function(addr, cycle) {
    this.flag.C = 1;
    return 0;
};

CPU.prototype.SED = function(addr, cycle) {
    this.flag.D = 1;
    return 0;
};

CPU.prototype.SEI = function(addr, cycle) {
    this.flag.I = 1;
    return 0;
};

CPU.prototype.STA = function(addr, cycle) {
    this.writeByte(addr, this.reg.A);
    return 0;
};

CPU.prototype.STX = function(addr, cycle) {
    this.writeByte(addr, this.reg.X);
    return 0;
};

CPU.prototype.STY = function(addr, cycle) {
    this.writeByte(addr, this.reg.Y);
    return 0;
};

CPU.prototype.TAX = function(addr, cycle) {
    this.reg.X = this.reg.A;
    this.flag.N = (this.reg.X >> 7) & 1;
    this.flag.Z = (this.reg.X & 0xff) === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.TAY = function(addr, cycle) {
    this.reg.Y = this.reg.A;
    this.flag.N = (this.reg.Y >> 7) & 1;
    this.flag.Z = (this.reg.Y & 0xff) === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.TSX = function(addr, cycle) {
    this.reg.X = this.reg.SP;
    this.flag.N = (this.reg.X >> 7) & 1;
    this.flag.Z = (this.reg.X & 0xff) === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.TXA = function(addr, cycle) {
    this.reg.A = this.reg.X;
    this.flag.N = (this.reg.A >> 7) & 1;
    this.flag.Z = (this.reg.A & 0xff) === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.TXS = function(addr, cycle) {
    this.reg.SP = this.reg.X;
    return 0;
};

CPU.prototype.TYA = function(addr, cycle) {
    this.reg.A = this.reg.Y;
    this.flag.N = (this.reg.A >> 7) & 1;
    this.flag.Z = (this.reg.A & 0xff) === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.ALR = function(addr, cycle) {
    var tmp = this.reg.A & this.readByte(addr);
    this.reg.A = tmp >> 1;
    this.flag.C = tmp & 1;
    this.flag.Z = this.reg.A === 0 ? 1 : 0;
    this.flag.N = 0;
    return 0;
};

CPU.prototype.ANC = function(addr, cycle) {
    this.reg.A &= this.readByte(addr);
    this.flag.C = this.flag.N = (this.reg.A >> 7) & 1;
    this.flag.Z = this.reg.A === 0 ? 1 : 0;
    return 0;
};

CPU.prototype.ARR = function(addr, cycle) {
    var tmp = this.reg.A & this.readByte(addr);
    this.reg.A = (tmp >> 1) + (this.flag.C << 7);
    this.flag.N = this.flag.C;
    this.flag.C = (tmp >> 7) & 1;
    this.flag.Z = this.reg.A === 0 ? 1 : 0;
    this.flag.V = ((tmp >> 7) ^ (tmp >> 6)) & 1;
    return 0;
};

CPU.prototype.AXS = function(addr, cycle) {
    var tmp = (this.reg.X & this.reg.A) - this.readByte(addr);
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
    return 0;
};

CPU.prototype.LAX = function(addr, cycle) {
    this.LDA(addr, cycle);
    this.LDX(addr, cycle);
    return cycle;
};

CPU.prototype.SAX = function(addr, cycle) {
    this.writeByte(addr, this.reg.A & this.reg.X);
    return 0;
};

CPU.prototype.DCP = function(addr, cycle) {
    this.DEC(addr, cycle);
    this.CMP(addr, cycle);
    return 0;
};

CPU.prototype.ISC = function(addr, cycle) {
    this.INC(addr, cycle);
    this.SBC(addr, cycle);
    return 0;
};

CPU.prototype.RLA = function(addr, cycle) {
    this.ROL(addr, cycle);
    this.AND(addr, cycle);
    return 0;
};

CPU.prototype.RRA = function(addr, cycle) {
    this.ROR(addr, cycle);
    this.ADC(addr, cycle);
    return 0;
};

CPU.prototype.SLO = function(addr, cycle) {
    this.ASL(addr, cycle);
    this.ORA(addr, cycle);
    return 0;
};

CPU.prototype.SRE = function(addr, cycle) {
    this.LSR(addr, cycle);
    this.EOR(addr, cycle);
    return 0;
};

CPU.prototype.SKB = function(addr, cycle) {
    // Do nothing
    return 0;
};

CPU.prototype.IGN = function(addr, cycle) {
    this.readByte(addr);
    return mode !== this.INDIRECT_Y ? cycle : 0;
};

























