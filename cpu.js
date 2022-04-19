function CPU() {
    var ZERO_PAGE = 0;
    var RELATIVE = 1;
    var IMPLIED = 2;
    var ABSOLUTE = 3;
    var ACCUMULATOR = 4;
    var IMMEDIATE = 5;
    var ZERO_PAGE_X = 6;
    var ZERO_PAGE_Y = 7;
    var ABSOLUTE_X = 8;
    var ABSOLUTE_Y = 9;
    var INDIRECT_X = 10;
    var INDIRECT_Y = 11;
    var INDIRECT = 12;
    
    var ADC = 0;
    var AND = 1;
    var ASL = 2;
    var BCC = 3;
    var BCS = 4;
    var BEQ = 5;
    var BIT = 6;
    var BMI = 7;
    var BNE = 8;
    var BPL = 9;
    var BRK = 10;
    var BVC = 11;
    var BVS = 12;
    var CLC = 13;
    var CLD = 14;
    var CLI = 15;
    var CLV = 16;
    var CMP = 17;
    var CPX = 18;
    var CPY = 19;
    var DEC = 20;
    var DEX = 21;
    var DEY = 22;
    var EOR = 23;
    var INC = 24;
    var INX = 25;
    var INY = 26;
    var JMP = 27;
    var JSR = 28;
    var LDA = 29;
    var LDX = 30;
    var LDY = 31;
    var LSR = 32;
    var NOP = 33;
    var ORA = 34;
    var PHA = 35;
    var PHP = 36;
    var PLA = 37;
    var PLP = 38;
    var ROL = 39;
    var ROR = 40;
    var RTI = 41;
    var RTS = 42;
    var SBC = 43;
    var SEC = 44;
    var SED = 45;
    var SEI = 46;
    var STA = 47;
    var STX = 48;
    var STY = 49;
    var TAX = 50;
    var TAY = 51;
    var TSX = 52;
    var TXA = 53;
    var TXS = 54;
    var TYA = 55;
    var ALR = 56;
    var ANC = 57;
    var ARR = 58;
    var AXS = 59;
    var LAX = 60;
    var SAX = 61;
    var DCP = 62;
    var ISC = 63;
    var RLA = 64;
    var RRA = 65;
    var SLO = 66;
    var SRE = 67;
    var SKB = 68;
    var IGN = 69;
    
    var OP_DATA = {
        // http://6502.org/tutorials/6502opcodes.html
        
        // ADC
        0x69: {name: ADC, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x65: {name: ADC, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x75: {name: ADC, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0x6D: {name: ADC, mode: ABSOLUTE   , len: 3, cycle: 4},
        0x7D: {name: ADC, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0x79: {name: ADC, mode: ABSOLUTE_Y , len: 3, cycle: 4},
        0x61: {name: ADC, mode: INDIRECT_X , len: 2, cycle: 6},
        0x71: {name: ADC, mode: INDIRECT_Y , len: 2, cycle: 5},
        
        // AND
        0x29: {name: AND, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x25: {name: AND, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x35: {name: AND, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0x2D: {name: AND, mode: ABSOLUTE   , len: 3, cycle: 4},
        0x3D: {name: AND, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0x39: {name: AND, mode: ABSOLUTE_Y , len: 3, cycle: 4},
        0x21: {name: AND, mode: INDIRECT_X , len: 2, cycle: 6},
        0x31: {name: AND, mode: INDIRECT_Y , len: 2, cycle: 5},

        // ASL
        0x0A: {name: ASL, mode: ACCUMULATOR, len: 1, cycle: 2},
        0x06: {name: ASL, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0x16: {name: ASL, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0x0E: {name: ASL, mode: ABSOLUTE   , len: 3, cycle: 6},
        0x1E: {name: ASL, mode: ABSOLUTE_X , len: 3, cycle: 7},
        
        // BIT
        0x24: {name: BIT, mode: ZERO_PAGE, len: 2, cycle: 3},
        0x2C: {name: BIT, mode: ABSOLUTE , len: 3, cycle: 4},
        
        // Branch Instructions
        0x10: {name: BPL, mode: RELATIVE, len: 2, cycle: 2},
        0x30: {name: BMI, mode: RELATIVE, len: 2, cycle: 2},
        0x50: {name: BVC, mode: RELATIVE, len: 2, cycle: 2},
        0x70: {name: BVS, mode: RELATIVE, len: 2, cycle: 2},
        0x90: {name: BCC, mode: RELATIVE, len: 2, cycle: 2},
        0xB0: {name: BCS, mode: RELATIVE, len: 2, cycle: 2},
        0xD0: {name: BNE, mode: RELATIVE, len: 2, cycle: 2},
        0xF0: {name: BEQ, mode: RELATIVE, len: 2, cycle: 2},
        
        // BRK
        0x00: {name: BRK, mode: IMPLIED, len: 1, cycle: 7},
        
        // CMP
        0xC9: {name: CMP, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xC5: {name: CMP, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0xD5: {name: CMP, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0xCD: {name: CMP, mode: ABSOLUTE   , len: 3, cycle: 4},
        0xDD: {name: CMP, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0xD9: {name: CMP, mode: ABSOLUTE_Y , len: 3, cycle: 4},
        0xC1: {name: CMP, mode: INDIRECT_X , len: 2, cycle: 6},
        0xD1: {name: CMP, mode: INDIRECT_Y , len: 2, cycle: 5},
        
        // CPX
        0xE0: {name: CPX, mode: IMMEDIATE, len: 2, cycle: 2},
        0xE4: {name: CPX, mode: ZERO_PAGE, len: 2, cycle: 3},
        0xEC: {name: CPX, mode: ABSOLUTE , len: 3, cycle: 4},
        
        // CPY
        0xC0: {name: CPY, mode: IMMEDIATE, len: 2, cycle: 2},
        0xC4: {name: CPY, mode: ZERO_PAGE, len: 2, cycle: 3},
        0xCC: {name: CPY, mode: ABSOLUTE , len: 3, cycle: 4},
        
        // DEC
        0xC6: {name: DEC, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0xD6: {name: DEC, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0xCE: {name: DEC, mode: ABSOLUTE   , len: 3, cycle: 6},
        0xDE: {name: DEC, mode: ABSOLUTE_X , len: 3, cycle: 7},
        
        // EOR
        0x49: {name: EOR, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x45: {name: EOR, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x55: {name: EOR, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0x4D: {name: EOR, mode: ABSOLUTE   , len: 3, cycle: 4},
        0x5D: {name: EOR, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0x59: {name: EOR, mode: ABSOLUTE_Y , len: 3, cycle: 4},
        0x41: {name: EOR, mode: INDIRECT_X , len: 2, cycle: 6},
        0x51: {name: EOR, mode: INDIRECT_Y , len: 2, cycle: 5},
        
        // Flag(Processor Status) Instructions
        0x18: {name: CLC, mode: IMPLIED, len: 1, cycle: 2},
        0x38: {name: SEC, mode: IMPLIED, len: 1, cycle: 2},
        0x58: {name: CLI, mode: IMPLIED, len: 1, cycle: 2},
        0x78: {name: SEI, mode: IMPLIED, len: 1, cycle: 2},
        0xB8: {name: CLV, mode: IMPLIED, len: 1, cycle: 2},
        0xD8: {name: CLD, mode: IMPLIED, len: 1, cycle: 2},
        0xF8: {name: SED, mode: IMPLIED, len: 1, cycle: 2},
        
        // INC
        0xE6: {name: INC, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0xF6: {name: INC, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0xEE: {name: INC, mode: ABSOLUTE   , len: 3, cycle: 6},
        0xFE: {name: INC, mode: ABSOLUTE_X , len: 3, cycle: 7},
        
        // JMP
        0x4C: {name: JMP, mode: ABSOLUTE, len: 3, cycle: 3},
        0x6C: {name: JMP, mode: INDIRECT, len: 3, cycle: 5},
        
        // JSR
        0x20: {name: JSR, mode: ABSOLUTE, len: 3, cycle: 6},
        
        // LDA
        0xA9: {name: LDA, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xA5: {name: LDA, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0xB5: {name: LDA, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0xAD: {name: LDA, mode: ABSOLUTE   , len: 3, cycle: 4},
        0xBD: {name: LDA, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0xB9: {name: LDA, mode: ABSOLUTE_Y , len: 3, cycle: 4},
        0xA1: {name: LDA, mode: INDIRECT_X , len: 2, cycle: 6},
        0xB1: {name: LDA, mode: INDIRECT_Y , len: 2, cycle: 5},
        
        // LDX
        0xA2: {name: LDX, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xA6: {name: LDX, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0xB6: {name: LDX, mode: ZERO_PAGE_Y, len: 2, cycle: 4},
        0xAE: {name: LDX, mode: ABSOLUTE   , len: 3, cycle: 4},
        0xBE: {name: LDX, mode: ABSOLUTE_Y , len: 3, cycle: 4},
        
        // LDY
        0xA0: {name: LDY, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xA4: {name: LDY, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0xB4: {name: LDY, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0xAC: {name: LDY, mode: ABSOLUTE   , len: 3, cycle: 4},
        0xBC: {name: LDY, mode: ABSOLUTE_X , len: 3, cycle: 4},
        
        // LSR
        0x4A: {name: LSR, mode: ACCUMULATOR, len: 1, cycle: 2},
        0x46: {name: LSR, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0x56: {name: LSR, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0x4E: {name: LSR, mode: ABSOLUTE   , len: 3, cycle: 6},
        0x5E: {name: LSR, mode: ABSOLUTE_X , len: 3, cycle: 7},
        
        // NOP
        0xEA: {name: NOP, mode: IMPLIED, len: 1, cycle: 2},
        
        // ORA
        0x09: {name: ORA, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x05: {name: ORA, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x15: {name: ORA, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0x0D: {name: ORA, mode: ABSOLUTE   , len: 3, cycle: 4},
        0x1D: {name: ORA, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0x19: {name: ORA, mode: ABSOLUTE_Y , len: 3, cycle: 4},
        0x01: {name: ORA, mode: INDIRECT_X , len: 2, cycle: 6},
        0x11: {name: ORA, mode: INDIRECT_Y , len: 2, cycle: 5},
        
        // Register Instructions
        0xAA: {name: TAX, mode: IMPLIED, len: 1, cycle: 2},
        0x8A: {name: TXA, mode: IMPLIED, len: 1, cycle: 2},
        0xCA: {name: DEX, mode: IMPLIED, len: 1, cycle: 2},
        0xE8: {name: INX, mode: IMPLIED, len: 1, cycle: 2},
        0xA8: {name: TAY, mode: IMPLIED, len: 1, cycle: 2},
        0x98: {name: TYA, mode: IMPLIED, len: 1, cycle: 2},
        0x88: {name: DEY, mode: IMPLIED, len: 1, cycle: 2},
        0xC8: {name: INY, mode: IMPLIED, len: 1, cycle: 2},
        
        // ROL
        0x2A: {name: ROL, mode: ACCUMULATOR, len: 1, cycle: 2},
        0x26: {name: ROL, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0x36: {name: ROL, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0x2E: {name: ROL, mode: ABSOLUTE   , len: 3, cycle: 6},
        0x3E: {name: ROL, mode: ABSOLUTE_X , len: 3, cycle: 7},
        
        // ROR
        0x6A: {name: ROR, mode: ACCUMULATOR, len: 1, cycle: 2},
        0x66: {name: ROR, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0x76: {name: ROR, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0x6E: {name: ROR, mode: ABSOLUTE   , len: 3, cycle: 6},
        0x7E: {name: ROR, mode: ABSOLUTE_X , len: 3, cycle: 7},
        
        // RTI
        0x40: {name: RTI, mode: IMPLIED, len: 1, cycle: 6},
        
        // RTS
        0x60: {name: RTS, mode: IMPLIED, len: 1, cycle: 6},
        
        // SBC
        0xE9: {name: SBC, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xE5: {name: SBC, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0xF5: {name: SBC, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0xED: {name: SBC, mode: ABSOLUTE   , len: 3, cycle: 4},
        0xFD: {name: SBC, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0xF9: {name: SBC, mode: ABSOLUTE_Y , len: 3, cycle: 4},
        0xE1: {name: SBC, mode: INDIRECT_X , len: 2, cycle: 6},
        0xF1: {name: SBC, mode: INDIRECT_Y , len: 2, cycle: 5},
        
        // STA
        0x85: {name: STA, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x95: {name: STA, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0x8D: {name: STA, mode: ABSOLUTE   , len: 3, cycle: 4},
        0x9D: {name: STA, mode: ABSOLUTE_X , len: 3, cycle: 5},
        0x99: {name: STA, mode: ABSOLUTE_Y , len: 3, cycle: 5},
        0x81: {name: STA, mode: INDIRECT_X , len: 2, cycle: 6},
        0x91: {name: STA, mode: INDIRECT_Y , len: 2, cycle: 6},
        
        // Stack Instructions
        0x9A: {name: TXS, mode: IMPLIED, len: 1, cycle: 2},
        0xBA: {name: TSX, mode: IMPLIED, len: 1, cycle: 2},
        0x48: {name: PHA, mode: IMPLIED, len: 1, cycle: 3},
        0x68: {name: PLA, mode: IMPLIED, len: 1, cycle: 4},
        0x08: {name: PHP, mode: IMPLIED, len: 1, cycle: 3},
        0x28: {name: PLP, mode: IMPLIED, len: 1, cycle: 4},
        
        // STX
        0x86: {name: STX, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x96: {name: STX, mode: ZERO_PAGE_Y, len: 2, cycle: 4},
        0x8E: {name: STX, mode: ABSOLUTE   , len: 3, cycle: 4},
        
        // STY
        0x84: {name: STY, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x94: {name: STY, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0x8C: {name: STY, mode: ABSOLUTE   , len: 3, cycle: 4},
        
        // https://www.nesdev.org/wiki/Programming_with_unofficial_opcodes
        
        // Combined operations
        0x4B: {name: ALR, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x0B: {name: ANC, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x2B: {name: ANC, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x6B: {name: ARR, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xCB: {name: AXS, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xA3: {name: LAX, mode: INDIRECT_X , len: 2, cycle: 6},
        0xA7: {name: LAX, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0xAF: {name: LAX, mode: ABSOLUTE   , len: 3, cycle: 4},
        0xB3: {name: LAX, mode: INDIRECT_Y , len: 2, cycle: 5},
        0xB7: {name: LAX, mode: ZERO_PAGE_Y, len: 2, cycle: 4},
        0xBF: {name: LAX, mode: ABSOLUTE_Y , len: 3, cycle: 4},
        0x83: {name: SAX, mode: INDIRECT_X , len: 2, cycle: 6},
        0x87: {name: SAX, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x8F: {name: SAX, mode: ABSOLUTE   , len: 3, cycle: 4},
        0x97: {name: SAX, mode: ZERO_PAGE_Y, len: 2, cycle: 4},
        
        // RMW instructions
        0xC3: {name: DCP, mode: INDIRECT_X , len: 2, cycle: 8},
        0xC7: {name: DCP, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0xCF: {name: DCP, mode: ABSOLUTE   , len: 3, cycle: 6},
        0xD3: {name: DCP, mode: INDIRECT_Y , len: 2, cycle: 8},
        0xD7: {name: DCP, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0xDB: {name: DCP, mode: ABSOLUTE_Y , len: 3, cycle: 7},
        0xDF: {name: DCP, mode: ABSOLUTE_X , len: 3, cycle: 7},
        0xE3: {name: ISC, mode: INDIRECT_X , len: 2, cycle: 8},
        0xE7: {name: ISC, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0xEF: {name: ISC, mode: ABSOLUTE   , len: 3, cycle: 6},
        0xF3: {name: ISC, mode: INDIRECT_Y , len: 2, cycle: 8},
        0xF7: {name: ISC, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0xFB: {name: ISC, mode: ABSOLUTE_Y , len: 3, cycle: 7},
        0xFF: {name: ISC, mode: ABSOLUTE_X , len: 3, cycle: 7},
        0x23: {name: RLA, mode: INDIRECT_X , len: 2, cycle: 8},
        0x27: {name: RLA, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0x2F: {name: RLA, mode: ABSOLUTE   , len: 3, cycle: 6},
        0x33: {name: RLA, mode: INDIRECT_Y , len: 2, cycle: 8},
        0x37: {name: RLA, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0x3B: {name: RLA, mode: ABSOLUTE_Y , len: 3, cycle: 7},
        0x3F: {name: RLA, mode: ABSOLUTE_X , len: 3, cycle: 7},
        0x63: {name: RRA, mode: INDIRECT_X , len: 2, cycle: 8},
        0x67: {name: RRA, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0x6F: {name: RRA, mode: ABSOLUTE   , len: 3, cycle: 6},
        0x73: {name: RRA, mode: INDIRECT_Y , len: 2, cycle: 8},
        0x77: {name: RRA, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0x7B: {name: RRA, mode: ABSOLUTE_Y , len: 3, cycle: 7},
        0x7F: {name: RRA, mode: ABSOLUTE_X , len: 3, cycle: 7},
        0x03: {name: SLO, mode: INDIRECT_X , len: 2, cycle: 8},
        0x07: {name: SLO, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0x0F: {name: SLO, mode: ABSOLUTE   , len: 3, cycle: 6},
        0x13: {name: SLO, mode: INDIRECT_Y , len: 2, cycle: 8},
        0x17: {name: SLO, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0x1B: {name: SLO, mode: ABSOLUTE_Y , len: 3, cycle: 7},
        0x1F: {name: SLO, mode: ABSOLUTE_X , len: 3, cycle: 7},
        0x43: {name: SRE, mode: INDIRECT_X , len: 2, cycle: 8},
        0x47: {name: SRE, mode: ZERO_PAGE  , len: 2, cycle: 5},
        0x4F: {name: SRE, mode: ABSOLUTE   , len: 3, cycle: 6},
        0x53: {name: SRE, mode: INDIRECT_Y , len: 2, cycle: 8},
        0x57: {name: SRE, mode: ZERO_PAGE_X, len: 2, cycle: 6},
        0x5B: {name: SRE, mode: ABSOLUTE_Y , len: 3, cycle: 7},
        0x5F: {name: SRE, mode: ABSOLUTE_X , len: 3, cycle: 7},
        
        // NOPs
        0x1A: {name: NOP, mode: IMMEDIATE  , len: 1, cycle: 2},
        0x3A: {name: NOP, mode: IMMEDIATE  , len: 1, cycle: 2},
        0x5A: {name: NOP, mode: IMMEDIATE  , len: 1, cycle: 2},
        0x7A: {name: NOP, mode: IMMEDIATE  , len: 1, cycle: 2},
        0xDA: {name: NOP, mode: IMMEDIATE  , len: 1, cycle: 2},
        0xFA: {name: NOP, mode: IMMEDIATE  , len: 1, cycle: 2},
        0x80: {name: SKB, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x82: {name: SKB, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x89: {name: SKB, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xC2: {name: SKB, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xE2: {name: SKB, mode: IMMEDIATE  , len: 2, cycle: 2},
        0x0C: {name: IGN, mode: ABSOLUTE   , len: 3, cycle: 4},
        0x1C: {name: IGN, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0x3C: {name: IGN, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0x5C: {name: IGN, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0x7C: {name: IGN, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0xDC: {name: IGN, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0xFC: {name: IGN, mode: ABSOLUTE_X , len: 3, cycle: 4},
        0x04: {name: IGN, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x44: {name: IGN, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x64: {name: IGN, mode: ZERO_PAGE  , len: 2, cycle: 3},
        0x14: {name: IGN, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0x34: {name: IGN, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0x54: {name: IGN, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0x74: {name: IGN, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0xD4: {name: IGN, mode: ZERO_PAGE_X, len: 2, cycle: 4},
        0xF4: {name: IGN, mode: ZERO_PAGE_X, len: 2, cycle: 4},
    };
    
    
}