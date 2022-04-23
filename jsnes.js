function ROM() {
    this.load = function(buf) {
        if(buf[0] !== 0x4e
            || buf[1] !== 0x45
            || buf[2] !== 0x53
            || buf[3] !== 0x1a) {
            throw new Error('Not a valid nes');
        }
        
        // PRG-ROM count(16KB)
        this.prgCount = buf[4];
        // CHR-ROM count(4KB)
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
        // PRG-ROM banks
        this.prgBanks = [];
        for(var i = 0; i < this.prgCount; i++) {
            this.prgBanks[i] = [];
            for(var j = 0; j < 16384; j++) {
                this.prgBanks[i][j] = buf[offset + j];
            }
            offset += 16384;
        }
        // CHR-ROM banks
        this.chrBanks = [];
        for(var i = 0; i < this.chrCount; i++) {
            this.chrBanks[i] = [];
            for(var j = 0; j < 4096; j++) {
                this.chrBanks[i][j] = buf[offset + j];
            }
            offset += 4096;
        }
    };
}

var Mappers = {};
Mappers[0] = function() {
    function copyArray(src, index1, dst, index2, len) {
        for(var i = 0; i < len; i++) {
            dst[index2++] = src[index1++];
        }
    }
    
    this.loadROM = function(rom, mem) {
        // load PRG-ROM
        if(rom.prgCount > 1) {
            copyArray(rom.prgBanks[0], 0, mem, 0x8000, 16384);
            copyArray(rom.prgBanks[1], 0, mem, 0xc000, 16384);
        } else {
            copyArray(rom.prgBanks[0], 0, mem, 0x8000, 16384);
            copyArray(rom.prgBanks[0], 0, mem, 0xc000, 16384);
        }
        // load CHR-ROM
        
    };
};

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
        
        // Duplicated instructions
        0x69: {name: ADC, mode: IMMEDIATE  , len: 2, cycle: 2},
        0xEB: {name: SBC, mode: IMMEDIATE  , len: 2, cycle: 2},
        
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
    
    this.reset = function() {
        // Main memory
        this.mem = [];
        for(var i = 0; i < 0x2000; i++) {
            this.mem[i] = 0xff;
        }
        for(var i = 0; i < 4; i++) {
            var j = i * 0x800;
            this.mem[j + 0x008] = 0xf7;
            this.mem[j + 0x009] = 0xef;
            this.mem[j + 0x00a] = 0xdf;
            this.mem[j + 0x00f] = 0xbf;
        }
        for(var i = 0x2001; i < 0x10000; i++) {
            this.mem[i] = 0;
        }
        
        // CPU Registers
        this.regA = 0;
        this.regX = 0;
        this.regY = 0;
        this.regSP = 0x01fd;
        this.regPC = 0xC000 - 1;
        
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
    
    this.step = function(callback) {
        var opinf = OP_DATA[this.readByte(this.regPC + 1)];
        if(!opinf) {
            console.log('unknowd op: ' + this.readByte(this.regPC + 1).toString(16));
            return;
        }
        var opaddr = this.regPC;
        
        // =============test start===============
        var inst = [];
        for(var i = 0; i < opinf.len; i++) {
            inst.push(this.mem[opaddr + 1 + i]);
        }
        var result = {
            addr: opaddr + 1,
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
            case ZERO_PAGE:
                addr = this.readByte(opaddr + 2);
                break;
            
            case RELATIVE:
                addr = this.readByte(opaddr + 2);
                if(addr & 0x80) {
                    addr -= 0x100;
                }
                addr += this.regPC;
                break;
            
            case IMPLIED:
                // Ignore
                break;
            
            case ABSOLUTE:
                addr = this.read2Byte(opaddr + 2);
                break;
            
            case ACCUMULATOR:
                addr = this.regPC;
                break;
            
            case IMMEDIATE:
                addr = this.regPC;
                break;
            
            case ZERO_PAGE_X:
                addr = (this.readByte(opaddr + 2) + this.regX) & 0xff;
                break;
            
            case ZERO_PAGE_Y:
                addr = (this.readByte(opaddr + 2) + this.regY) & 0xff;
                break;
            
            case ABSOLUTE_X:
                tmp = this.read2Byte(opaddr + 2);
                addr = tmp + this.regX;
                if(this.isCrossPage(tmp, addr)) {
                    cycleAdd = 1;
                }
                break;
            
            case ABSOLUTE_Y:
                tmp = this.read2Byte(opaddr + 2);
                addr = tmp + this.regY;
                if(this.isCrossPage(tmp, addr)) {
                    cycleAdd = 1;
                }
                break;
            
            case INDIRECT_X:
                tmp = this.readByte(opaddr + 2) + this.regX;
                addr = this.readByte(tmp & 0xff) 
                    | this.readByte((tmp + 1) & 0xff) << 8;
                break;
            
            case INDIRECT_Y:
                tmp = this.readByte(opaddr + 2);
                tmp = this.readByte(tmp & 0xff) 
                    | this.readByte((tmp + 1) & 0xff) << 8;
                addr = tmp + this.regY;
                if(this.isCrossPage(tmp, addr)) {
                    cycleAdd = 1;
                }
                break;
            
            case INDIRECT:
                addr = this.read2Byte(opaddr + 2);
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
            case ADC:
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
            
            case AND:
                this.regA = this.regA & this.readByte(addr);
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                //if(mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                //}
                break;
            
            case ASL:
                if(mode === ACCUMULATOR) {
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
            
            case BCC:
                if(this.flagC === 0) {
                    this.cycles += 1;
                    if(this.isCrossPage(this.regPC + 1, addr + 1)) {
                        this.cycles += 1;
                    }
                    this.regPC = addr;
                }
                break;
            
            case BCS:
                if(this.flagC === 1) {
                    this.cycles += 1;
                    if(this.isCrossPage(this.regPC + 1, addr + 1)) {
                        this.cycles += 1;
                    }
                    this.regPC = addr;
                }
                break;
            
            case BEQ:
                if(this.flagZ === 1) {
                    this.cycles += 1;
                    if(this.isCrossPage(this.regPC + 1, addr + 1)) {
                        this.cycles += 1;
                    }
                    this.regPC = addr;
                }
                break;
            
            case BIT:
                tmp = this.readByte(addr);
                this.flagN = (tmp >> 7) & 1;
                this.flagV = (tmp >> 6) & 1;
                tmp &= this.regA;
                this.flagZ = tmp === 0 ? 1 : 0;
                break;
            
            case BMI:
                if(this.flagN === 1) {
                    this.cycles += 1;
                    this.regPC = addr;
                }
                break;
            
            case BNE:
                if(this.flagZ === 0) {
                    this.cycles += 1;
                    if(this.isCrossPage(this.regPC + 1, addr + 1)) {
                        this.cycles += 1;
                    }
                    this.regPC = addr;
                }
                break;
            
            case BPL:
                if(this.flagN === 0) {
                    this.cycles += 1;
                    if(this.isCrossPage(this.regPC + 1, addr + 1)) {
                        this.cycles += 1;
                    }
                    this.regPC = addr;
                }
                break;
            
            case BRK:
                this.regPC += 2;
                this.push((this.regPC >> 8) & 0xff);
                this.push(this.regPC & 0xff);
                this.flagB = 1;
                this.push(this.getFlags());
                this.flagI = 1;
                this.regPC = this.read2Byte(0xfffe);
                this.regPC--;
                break;
            
            case BVC:
                if(this.flagV === 0) {
                    this.cycles += 1;
                    if(this.isCrossPage(this.regPC + 1, addr + 1)) {
                        this.cycles += 1;
                    }
                    this.regPC = addr;
                }
                break;
            
            case BVS:
                if(this.flagV === 1) {
                    this.cycles += 1;
                    if(this.isCrossPage(this.regPC + 1, addr + 1)) {
                        this.cycles += 1;
                    }
                    this.regPC = addr;
                }
                break;
            
            case CLC:
                this.flagC = 0;
                break;
            
            case CLD:
                this.flagD = 0;
                break;
            
            case CLI:
                this.flagI = 0;
                break;
            
            case CLV:
                this.flagV = 0;
                break;
            
            case CMP:
                tmp = this.regA - this.readByte(addr);
                this.flagC = tmp >= 0 ? 1 : 0;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                this.cycles += cycleAdd;
                break;
            
            case CPX:
                tmp = this.regX - this.readByte(addr);
                this.flagC = tmp >= 0 ? 1 : 0;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                break;
            
            case CPY:
                tmp = this.regY - this.readByte(addr);
                this.flagC = tmp >= 0 ? 1 : 0;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                break;
            
            case DEC:
                tmp = (this.readByte(addr) - 1) & 0xff;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = tmp === 0 ? 1 : 0;
                this.writeByte(addr, tmp);
                break;
            
            case DEX:
                this.regX = (this.regX - 1) & 0xff;
                this.flagN = (this.regX >> 7) &  1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                break;
            
            case DEY:
                this.regY = (this.regY - 1) & 0xff;
                this.flagN = (this.regY >> 7) & 1;
                this.flagZ = this.regY === 0 ? 1 : 0;
                break;
            
            case EOR:
                this.regA = (this.readByte(addr) ^ this.regA) & 0xff;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.cycles += cycleAdd;
                break;
            
            case INC:
                tmp = (this.readByte(addr) + 1) & 0xff;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = tmp === 0 ? 1 : 0;
                this.writeByte(addr, tmp);
                break;
            
            case INX:
                this.regX = (this.regX + 1) & 0xff;
                this.flagN = (this.regX >> 7) & 1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                break;
            
            case INY:
                this.regY++;
                this.regY &= 0xff;
                this.flagN = (this.regY >> 7) & 1;
                this.flagZ = this.regY === 0 ? 1 : 0;
                break;
            
            case JMP:
                this.regPC = addr - 1;
                break;
            
            case JSR:
                this.push((this.regPC >> 8) & 0xff);
                this.push(this.regPC & 0xff);
                this.regPC = addr - 1;
                break;
            
            case LDA:
                this.regA = this.readByte(addr);
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.cycles += cycleAdd;
                break;
            
            case LDX:
                this.regX = this.readByte(addr);
                this.flagN = (this.regX >> 7) & 1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                this.cycles += cycleAdd;
                break;
            
            case LDY:
                this.regY = this.readByte(addr);
                this.flagN = (this.regY >> 7) & 1;
                this.flagZ = this.regY === 0 ? 1 : 0;
                this.cycles += cycleAdd;
                break;
            
            case LSR:
                if(mode === ACCUMULATOR) {
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
            
            case NOP:
                // Ignore
                break;
            
            case ORA:
                tmp = (this.readByte(addr) | this.regA) & 0xff;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = tmp === 0 ? 1 : 0;
                this.regA = tmp;
                //if(mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                //}
                break;
            
            case PHA:
                this.push(this.regA);
                break;
            
            case PHP:
                this.flagB = 1;
                this.push(this.getFlags());
                this.flagB = 0;
                break;
            
            case PLA:
                this.regA = this.pop();
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            
            case PLP:
                tmp = this.pop();
                this.setFlags(tmp);
                this.flagB = 0;
                break;
            
            case ROL:
                if(mode === ACCUMULATOR) {
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
            
            case ROR:
                if(mode === ACCUMULATOR) {
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
            
            case RTI:
                tmp = this.pop();
                this.setFlags(tmp);
                this.regPC = this.pop() | this.pop() << 8;
                if(this.regPC === 0xffff) {
                    return;
                }
                this.regPC--;
                break;
            
            case RTS:
                this.regPC = this.pop() | this.pop() << 8;
                if(this.regPC === 0xffff) {
                    return;
                }
                break;
            
            case SBC:
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
            
            case SEC:
                this.flagC = 1;
                break;
            
            case SED:
                this.flagD = 1;
                break;
            
            case SEI:
                this.flagI = 1;
                break;
            
            case STA:
                this.writeByte(addr, this.regA);
                break;
            
            case STX:
                this.writeByte(addr, this.regX);
                break;
            
            case STY:
                this.writeByte(addr, this.regY);
                break;
            
            case TAX:
                this.regX = this.regA;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;;
                break;
            
            case TAY:
                this.regY = this.regA;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            
            case TSX:
                this.regX = this.regSP - 0x0100;
                this.flagN = (this.regSP >> 7) & 1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                break;
            
            case TXA:
                this.regA = this.regX;
                this.flagN = (this.regX >> 7) & 1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                break;
            
            case TXS:
                this.regSP = this.regX + 0x0100;
                this.regSP = 0x0100 | (this.regSP & 0xff);
                break;
            
            case TYA:
                this.regA = this.regY;
                this.flagN = (this.regY >> 7) & 1;
                this.flagZ = this.regY === 0 ? 1 : 0;
                break;
            
            case ALR:
                tmp = this.regA & this.readByte(addr);
                this.regA = tmp >> 1;
                this.flagC = tmp & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.flagN = 0;
                break;
            
            case ANC:
                this.regA &= this.readByte(addr);
                this.flagC = this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            
            case ARR:
                tmp = this.regA & this.readByte(addr);
                this.regA = (tmp >> 1) + (this.flagC << 7);
                this.flagN = this.flagC;
                this.flagC = (tmp >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.flagV = ((tmp >> 7) ^ (tmp >> 6)) & 1;
                break;
            
            case AXS:
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
            
            case LAX:
                this.regA = this.regX = this.readByte(addr);
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.cycles += cycleAdd;
                break;
            
            case SAX:
                this.writeByte(addr, this.regA & this.regX);
                break;
            
            case DCP:
                tmp = (this.readByte(addr) - 1) & 0xff;
                this.writeByte(addr, tmp);
                tmp = this.regA - tmp;
                this.flagC = tmp >= 0 ? 1 : 0;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                break;
            
            case ISC:
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
            
            case RLA:
                tmp = this.readByte(addr);
                add = this.flagC;
                this.flagC = (tmp >> 7) & 1;
                tmp = ((tmp << 1) & 0xff) + add;
                this.writeByte(addr, tmp);
                this.regA &= tmp;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            
            case RRA:
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
            
            case SLO:
                tmp = this.readByte(addr);
                this.flagC = (tmp >> 7) & 1;
                tmp = (tmp << 1) & 0xff;
                this.writeByte(addr, tmp);
                this.regA |= tmp;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            
            case SRE:
                tmp = this.readByte(addr) & 0xff;
                this.flagC = tmp & 1;
                tmp >>= 1;
                this.writeByte(addr, tmp);
                this.regA ^= tmp;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            
            case SKB:
                // Do nothing
                break;
            
            case IGN:
                this.readByte(addr);
                if(mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
        }
    };
    
    this.isCrossPage = function(addr1, addr2) {
        return (addr1 & 0xff00) !== (addr2 & 0xff00);
    };
    
    this.push = function(value) {
        this.writeByte(this.regSP, value);
        this.regSP--;
        this.regSP = 0x0100 | (this.regSP & 0xff);
    };
    
    this.pop = function() {
        this.regSP++;
        this.regSP = 0x0100 | (this.regSP & 0xff);
        return this.readByte(this.regSP);
    };
    
    this.readByte = function(addr) {
        return this.mem[addr];
    };
    
    this.read2Byte = function(addr) {
        var b1 = this.readByte(addr);
        var b2 = this.readByte(addr + 1);
        return b1 | b2 << 8;
    };
    
    this.writeByte = function(addr, value) {
        this.mem[addr] = value;
    };
    
    this.getFlags = function() {
        return this.flagC
            | (this.flagZ << 1)
            | (this.flagI << 2)
            | (this.flagD << 3)
            | (this.flagB << 4)
            | (this.flagU << 5)
            | (this.flagV << 6)
            | (this.flagN << 7);
    };
    
    this.setFlags = function(value) {
        this.flagC = value & 1;
        this.flagZ = (value >> 1) & 1;
        this.flagI = (value >> 2) & 1;
        this.flagD = (value >> 3) & 1;
        this.flagB = (value >> 4) & 1;
        this.flagU = 1;
        this.flagV = (value >> 6) & 1;
        this.flagN = (value >> 7) & 1;
    };
}

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


// =====================================================


httpGet('./test.nes', 'arraybuffer', function(res) {
    var buf = new Uint8Array(res);
    var rom = new ROM();
    rom.load(buf);
    var cpu = new CPU();
    cpu.reset();
    var mapper = new Mappers[rom.mapperType]();
    mapper.loadROM(rom, cpu.mem);
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




















































































































































































