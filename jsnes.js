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
    // Zero Page,X
    var ZERO_PAGE_X = 1;
    // Zero Page,Y
    var ZERO_PAGE_Y = 2;
    // Absolute,X
    var ABSOLUTE_X = 3;
    // Absolute,Y
    var ABSOLUTE_Y = 4;
    // Indirect,X
    var INDIRECT_X = 5;
    // Indirect,Y
    var INDIRECT_Y = 6;
    // Implicit
    var IMPLICIT = 7;
    // Accumulator
    var ACCUMULATOR = 8;
    // Immediate
    var IMMEDIATE = 9;
    // Zero Page
    var ZERO_PAGE = 10;
    // Absolute
    var ABSOLUTE = 11;
    // Relative
    var RELATIVE = 12;
    // Indirect
    var INDIRECT = 13;
    
    // interrupt request
    var IRQ_NORMAL = 1;
    // Non-maskable interrupt
    var IRQ_NMI = 2;
    // reset
    var IRQ_RESET = 3;
    
    this.reset = function() {
        this.mem = [];
        for(var i = 0; i < 0x2000; i++) {
            this.mem[i] = 0xff;
        }
        for(var i = 0; i < 4; i++) {
            var j = i * 0x800;
            this.mem[j + 0x008] = 0xf7;
            this.mem[j + 0x009] = 0xe7;
            this.mem[j + 0x00a] = 0xd7;
            this.mem[j + 0x00f] = 0xb7;
        }
        for(var i = 0x2001; i < this.mem.length; i++) {
            this.mem[i] = 0;
        }
        
        // Accumulator(A)
        this.regA = 0;
        // Index Register(X)
        this.regX = 0;
        // Index Register(Y)
        this.regY = 0;
        // Program Counter(PC)
        this.regPC = 0xC000;
        // Stack Pointer(SP)
        this.regSP = 0x01fd;
        
        // Negative(7)
        this.flagN = 0;
        // Overflow(6)
        this.flagV = 0;
        // Break(4)
        this.flagB = 0;
        // Decimal mode(3)
        this.flagD = 0;
        // Interrupt(2)
        this.flagI = 1;
        // Zero(1)
        this.flagZ = 0;
        // Carry(0)
        this.flagC = 0;
        
        this.cycles = 7;
        
        this.opData = {
            // ADC(ADd with Carry)
            0x69: {mode: IMMEDIATE,   len: 2, cycle: 2},
            0x65: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x75: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0x6D: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0x7D: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0x79: {mode: ABSOLUTE_Y,  len: 3, cycle: 4},
            0x61: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0x71: {mode: INDIRECT_Y,  len: 2, cycle: 5},
            
            // AND(bitwise AND with accumulator)
            0x29: {mode: IMMEDIATE,   len: 2, cycle: 2},
            0x25: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x35: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0x2D: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0x3D: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0x39: {mode: ABSOLUTE_Y,  len: 3, cycle: 4},
            0x21: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0x31: {mode: INDIRECT_Y,  len: 2, cycle: 5},
            
            // ASL(Arithmetic Shift Left)
            0x0A: {mode: ACCUMULATOR, len: 1, cycle: 2},
            0x06: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0x16: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0x0E: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0x1E: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // BIT(test BITs)
            0x24: {mode: ZERO_PAGE,  len: 2, cycle: 3},
            0x2C: {mode: ABSOLUTE,   len: 3, cycle: 4},
            
            // Branch Instructions
            // BPL(Branch on PLus)
            0x10: {mode: RELATIVE, len: 2, cycle: 2},
            // BMI(Branch on MInus)
            0x30: {mode: RELATIVE, len: 2, cycle: 2},
            // BVC(Branch on oVerflow Clear)
            0x50: {mode: RELATIVE, len: 2, cycle: 2},
            // BVS(Branch on oVerflow Set)
            0x70: {mode: RELATIVE, len: 2, cycle: 2},
            // BCC(Branch on Carry Clear)
            0x90: {mode: RELATIVE, len: 2, cycle: 2},
            // BCS(Branch on Carry Set)
            0xB0: {mode: RELATIVE, len: 2, cycle: 2},
            // BNE (Branch on Not Equal)
            0xD0: {mode: RELATIVE, len: 2, cycle: 2},
            // BEQ(Branch on EQual)
            0xF0: {mode: RELATIVE, len: 2, cycle: 2},
            
            // BRK(BReaK)
            0x00: {mode: IMPLICIT, len: 1, cycle: 7},
            
            // CMP(CoMPare accumulator)
            0xC9: {mode: IMMEDIATE,   len: 2, cycle: 2},
            0xC5: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0xD5: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0xCD: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0xDD: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0xD9: {mode: ABSOLUTE_Y,  len: 3, cycle: 4},
            0xC1: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0xD1: {mode: INDIRECT_Y,  len: 2, cycle: 5},
            
            // CPX(ComPare X register)
            0xE0: {mode: IMMEDIATE,  len: 2, cycle: 2},
            0xE4: {mode: ZERO_PAGE,  len: 2, cycle: 3},
            0xEC: {mode: ABSOLUTE,   len: 3, cycle: 4},
            
            // CPY(ComPare Y register)
            0xC0: {mode: IMMEDIATE,  len: 2, cycle: 2},
            0xC4: {mode: ZERO_PAGE,  len: 2, cycle: 3},
            0xCC: {mode: ABSOLUTE,   len: 3, cycle: 4},
            
            // DEC(DECrement memory)
            0xC6: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0xD6: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0xCE: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0xDE: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // EOR(bitwise Exclusive OR)
            0x49: {mode: IMMEDIATE,   len: 2, cycle: 2},
            0x45: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x55: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0x4D: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0x5D: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0x59: {mode: ABSOLUTE_Y,  len: 3, cycle: 4},
            0x41: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0x51: {mode: INDIRECT_Y,  len: 2, cycle: 5},
            
            // Flag(Processor Status) Instructions
            // CLC(CLear Carry)
            0x18: {mode: IMPLICIT, len: 1, cycle: 2},
            // SEC(SEt Carry)
            0x38: {mode: IMPLICIT, len: 1, cycle: 2},
            // CLI(CLear Interrupt)
            0x58: {mode: IMPLICIT, len: 1, cycle: 2},
            // SEI(SEt Interrupt)
            0x78: {mode: IMPLICIT, len: 1, cycle: 2},
            // CLV(CLear oVerflow)
            0xB8: {mode: IMPLICIT, len: 1, cycle: 2},
            // CLD(CLear Decimal)
            0xD8: {mode: IMPLICIT, len: 1, cycle: 2},
            // SED(SEt Decimal)
            0xF8: {mode: IMPLICIT, len: 1, cycle: 2},
            
            // INC(INCrement memory)
            0xE6: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0xF6: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0xEE: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0xFE: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // JMP(JuMP)
            0x4C: {mode: ABSOLUTE, len: 3, cycle: 3},
            0x6C: {mode: INDIRECT, len: 3, cycle: 5},
            
            // JSR(Jump to SubRoutine)
            0x20: {mode: ABSOLUTE, len: 3, cycle: 6},
            
            // LDA(LoaD Accumulator)
            0xA9: {mode: IMMEDIATE,   len: 2, cycle: 2},
            0xA5: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0xB5: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0xAD: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0xBD: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0xB9: {mode: ABSOLUTE_Y,  len: 3, cycle: 4},
            0xA1: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0xB1: {mode: INDIRECT_Y,  len: 2, cycle: 5},
            
            // LDX(LoaD X register)
            0xA2: {mode: IMMEDIATE,   len: 2, cycle: 2},
            0xA6: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0xB6: {mode: ZERO_PAGE_Y, len: 2, cycle: 4},
            0xAE: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0xBE: {mode: ABSOLUTE_Y,  len: 3, cycle: 4},
            
            // LDY(LoaD Y register)
            0xA0: {mode: IMMEDIATE,   len: 2, cycle: 2},
            0xA4: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0xB4: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0xAC: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0xBC: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            
            // LSR(Logical Shift Right)
            0x4A: {mode: ACCUMULATOR, len: 1, cycle: 2},
            0x46: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0x56: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0x4E: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0x5E: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // NOP(No OPeration)
            0xEA: {mode: IMPLICIT, len: 1, cycle: 2},
            
            // ORA(bitwise OR with Accumulator)
            0x09: {mode: IMMEDIATE,   len: 2, cycle: 2},
            0x05: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x15: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0x0D: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0x1D: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0x19: {mode: ABSOLUTE_Y,  len: 3, cycle: 4},
            0x01: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0x11: {mode: INDIRECT_Y,  len: 2, cycle: 5},
            
            // Register Instructions
            // TAX(Transfer A to X)
            0xAA: {mode: IMPLICIT, len: 1, cycle: 2},
            // TXA(Transfer X to A)
            0x8A: {mode: IMPLICIT, len: 1, cycle: 2},
            // DEX(DEcrement X)
            0xCA: {mode: IMPLICIT, len: 1, cycle: 2},
            // INX(INcrement X)
            0xE8: {mode: IMPLICIT, len: 1, cycle: 2},
            // TAY(Transfer A to Y)
            0xA8: {mode: IMPLICIT, len: 1, cycle: 2},
            // TYA(Transfer Y to A)
            0x98: {mode: IMPLICIT, len: 1, cycle: 2},
            // DEY(DEcrement Y)
            0x88: {mode: IMPLICIT, len: 1, cycle: 2},
            // INY(INcrement Y)
            0xC8: {mode: IMPLICIT, len: 1, cycle: 2},
            
            // ROL(ROtate Left)
            0x2A: {mode: ACCUMULATOR, len: 1, cycle: 2},
            0x26: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0x36: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0x2E: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0x3E: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // ROR(ROtate Right)
            0x6A: {mode: ACCUMULATOR, len: 1, cycle: 2},
            0x66: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0x76: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0x6E: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0x7E: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // RTI(ReTurn from Interrupt)
            0x40: {mode: IMPLICIT, len: 1, cycle: 6},
            
            // RTS(ReTurn from Subroutine)
            0x60: {mode: IMPLICIT, len: 1, cycle: 6},
            
            // SBC(SuBtract with Carry)
            0xE9: {mode: IMMEDIATE,   len: 2, cycle: 2},
            0xE5: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0xF5: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0xED: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0xFD: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0xF9: {mode: ABSOLUTE_Y,  len: 3, cycle: 4},
            0xE1: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0xF1: {mode: INDIRECT_Y,  len: 2, cycle: 5},
            
            // STA(STore Accumulator)
            0x85: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x95: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0x8D: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0x9D: {mode: ABSOLUTE_X,  len: 3, cycle: 5},
            0x99: {mode: ABSOLUTE_Y,  len: 3, cycle: 5},
            0x81: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0x91: {mode: INDIRECT_Y,  len: 2, cycle: 6},
            
            // Stack Instructions
            // TXS(Transfer X to Stack ptr)
            0x9A: {mode: IMPLICIT, len: 1, cycle: 2},
            // TSX(Transfer Stack ptr to X)
            0xBA: {mode: IMPLICIT, len: 1, cycle: 2},
            // PHA(PusH Accumulator)
            0x48: {mode: IMPLICIT, len: 1, cycle: 3},
            // PLA(PuLl Accumulator)
            0x68: {mode: IMPLICIT, len: 1, cycle: 4},
            // PHP(PusH Processor status)
            0x08: {mode: IMPLICIT, len: 1, cycle: 3},
            // PLP(PuLl Processor status)
            0x28: {mode: IMPLICIT, len: 1, cycle: 4},
            
            // STX(STore X register)
            0x86: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x96: {mode: ZERO_PAGE_Y, len: 2, cycle: 4},
            0x8E: {mode: ABSOLUTE,    len: 3, cycle: 4},
            
            // STY(STore Y register)
            0x84: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x94: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0x8C: {mode: ABSOLUTE,    len: 3, cycle: 4},
            
            // ============================================
            
            // NOP(No OPeration)
            0x1A: {mode: IMPLICIT, len: 1, cycle: 2},
            0x3A: {mode: IMPLICIT, len: 1, cycle: 2},
            0x5A: {mode: IMPLICIT, len: 1, cycle: 2},
            0x7A: {mode: IMPLICIT, len: 1, cycle: 2},
            0xDA: {mode: IMPLICIT, len: 1, cycle: 2},
            0xFA: {mode: IMPLICIT, len: 1, cycle: 2},
            
            // ALR
            0x4B: {mode: IMMEDIATE, len: 2, cycle: 2},
            
            // ANC
            0x0B: {mode: IMMEDIATE, len: 2, cycle: 2},
            0x2B: {mode: IMMEDIATE, len: 2, cycle: 2},
            
            // ARR
            0x6B: {mode: IMMEDIATE, len: 2, cycle: 2},
            
            // AXS
            0xCB: {mode: IMMEDIATE, len: 2, cycle: 2},
            
            // LAX
            0xA3: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0xA7: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0xAF: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0xB3: {mode: INDIRECT_Y,  len: 2, cycle: 5},
            0xB7: {mode: ZERO_PAGE_Y, len: 2, cycle: 4},
            0xBF: {mode: ABSOLUTE_Y,  len: 3, cycle: 4},
            
            // SAX
            0x83: {mode: INDIRECT_X,  len: 2, cycle: 6},
            0x87: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x8F: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0x97: {mode: ZERO_PAGE_Y, len: 2, cycle: 4},
            
            // DCP
            0xC3: {mode: INDIRECT_X,  len: 2, cycle: 8},
            0xC7: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0xCF: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0xD3: {mode: INDIRECT_Y,  len: 2, cycle: 8},
            0xD7: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0xDB: {mode: ABSOLUTE_Y,  len: 3, cycle: 7},
            0xDF: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // ISC
            0xE3: {mode: INDIRECT_X,  len: 2, cycle: 8},
            0xE7: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0xEF: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0xF3: {mode: INDIRECT_Y,  len: 2, cycle: 8},
            0xF7: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0xFB: {mode: ABSOLUTE_Y,  len: 3, cycle: 7},
            0xFF: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // RLA
            0x23: {mode: INDIRECT_X,  len: 2, cycle: 8},
            0x27: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0x2F: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0x33: {mode: INDIRECT_Y,  len: 2, cycle: 8},
            0x37: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0x3B: {mode: ABSOLUTE_Y,  len: 3, cycle: 7},
            0x3F: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // RRA
            0x63: {mode: INDIRECT_X,  len: 2, cycle: 8},
            0x67: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0x6F: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0x73: {mode: INDIRECT_Y,  len: 2, cycle: 8},
            0x77: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0x7B: {mode: ABSOLUTE_Y,  len: 3, cycle: 7},
            0x7F: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // SLO
            0x03: {mode: INDIRECT_X,  len: 2, cycle: 8},
            0x07: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0x0F: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0x13: {mode: INDIRECT_Y,  len: 2, cycle: 8},
            0x17: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0x1B: {mode: ABSOLUTE_Y,  len: 3, cycle: 7},
            0x1F: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // SRE
            0x43: {mode: INDIRECT_X,  len: 2, cycle: 8},
            0x47: {mode: ZERO_PAGE,   len: 2, cycle: 5},
            0x4F: {mode: ABSOLUTE,    len: 3, cycle: 6},
            0x53: {mode: INDIRECT_Y,  len: 2, cycle: 8},
            0x57: {mode: ZERO_PAGE_X, len: 2, cycle: 6},
            0x5B: {mode: ABSOLUTE_Y,  len: 3, cycle: 7},
            0x5F: {mode: ABSOLUTE_X,  len: 3, cycle: 7},
            
            // SKB
            0x80: {mode: IMMEDIATE, len: 2, cycle: 2},
            0x82: {mode: IMMEDIATE, len: 2, cycle: 2},
            0x89: {mode: IMMEDIATE, len: 2, cycle: 2},
            0xC2: {mode: IMMEDIATE, len: 2, cycle: 2},
            0xE2: {mode: IMMEDIATE, len: 2, cycle: 2},
            
            // IGN
            0x0C: {mode: ABSOLUTE,    len: 3, cycle: 4},
            0x1C: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0x3C: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0x5C: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0x7C: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0xDC: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0xFC: {mode: ABSOLUTE_X,  len: 3, cycle: 4},
            0x04: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x44: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x64: {mode: ZERO_PAGE,   len: 2, cycle: 3},
            0x14: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0x34: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0x54: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0x74: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0xD4: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
            0xF4: {mode: ZERO_PAGE_X, len: 2, cycle: 4},
        };
    };
    
    this.simulate = function(callback) {
        var opAddr = this.regPC;
        var op = this.mem[opAddr];
        var opInf = this.opData[op];
        
        // test start================================
        var inst = [];
        for(var i = 0; i < opInf.len; i++) {
            inst.push(this.mem[opAddr + i]);
        }
        var result = {
            addr: opAddr,
            inst: inst,
            A: this.regA,
            X: this.regX,
            Y: this.regY,
            P: this.getStatus(),
            SP: this.regSP & 0xff,
            CYC: this.cycles
        };
        callback(result);
        // test end================================
        
        this.regPC += opInf.len;
        this.cycles += opInf.cycle;
        var addr = 0;
        var cycleAdd = 0;
        switch(opInf.mode) {
            // Zero Page,X
            case ZERO_PAGE_X:
                addr = (this.regX + this.mem[opAddr + 1]) & 0xff;
                break;
            
            // Zero Page,Y
            case ZERO_PAGE_Y:
                addr = (this.regY + this.mem[opAddr + 1]) & 0xff;
                break;
            
            // Absolute,X
            case ABSOLUTE_X:
                addr = this.mem[opAddr + 1] | this.mem[opAddr + 2] << 8;
                addr += this.regX;
                if(addr & 0xff00 !== (addr + this.regX) & 0xff00) {
                    cycleAdd = 1;
                }
                break;
            
            // Absolute,Y
            case ABSOLUTE_Y:
                addr = this.mem[opAddr + 1] | this.mem[opAddr + 2] << 8;
                addr += this.regY;
                if(addr & 0xff00 !== (addr + this.regY) & 0xff00) {
                    cycleAdd = 1;
                }
                break;
            
            // Indirect,X
            case INDIRECT_X:
                var x1 = this.mem[this.mem[opAddr + 1] + this.regX];
                var x2 = this.mem[this.mem[opAddr + 1] + this.regX + 1];
                addr = x1 | x2 << 8;
                if(addr & 0xff00 !== (addr + this.regX) & 0xff00) {
                    cycleAdd = 1;
                }
                break;
            
            // Indirect,Y
            case INDIRECT_Y:
                var y1 = this.mem[this.mem[opAddr + 1]];
                var y2 = this.mem[this.mem[opAddr + 1] + 1];
                addr = (y1 | y2 << 8) + this.regY;
                if(addr & 0xff00 !== (addr + this.regY) & 0xff00) {
                    cycleAdd = 1;
                }
                break;
            
            // Implicit
            case IMPLICIT:
                break;
            
            // Accumulator
            case ACCUMULATOR:
                addr = this.regA;
                break;
            
            // Immediate
            case IMMEDIATE:
                addr = opAddr + 1;
                break;
            
            // Zero Page
            case ZERO_PAGE:
                addr = this.mem[opAddr + 1];
                break;
            
            // Absolute
            case ABSOLUTE:
                addr = this.mem[opAddr + 1] | this.mem[opAddr + 2] << 8;
                break;
            
            // Relative
            case RELATIVE:
                addr = opAddr + 1;
                break;
            
            // Indirect
            case INDIRECT:
                addr = this.mem[opAddr + 1] | this.mem[opAddr + 2] << 8;
                addr = this.mem[addr] | this.mem[addr + 1] << 8;
                break;
        }
        
        var tmp;
        var tmp2;
        switch(op) {
            // ADC(ADd with Carry)
            // Affects Flags: N V Z C
            case 0x69:
            case 0x65:
            case 0x75:
            case 0x6D:
            case 0x7D:
            case 0x79:
            case 0x61:
            case 0x71:
                tmp = this.regA + this.mem[addr] + this.flagC;
                if(((this.regA ^ this.mem[addr]) & 0x80) === 0
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
            
            // AND(bitwise AND with accumulator)
            // Affects Flags: N Z
            case 0x29:
            case 0x25:
            case 0x35:
            case 0x2D:
            case 0x3D:
            case 0x39:
            case 0x21:
            case 0x31:
                this.regA &= this.mem[addr];
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
            
            // ASL(Arithmetic Shift Left)
            // Affects Flags: N Z C
            case 0x0A:
            case 0x06:
            case 0x16:
            case 0x0E:
            case 0x1E:
                if(opInf.mode === ACCUMULATOR) {
                    this.flagC = (this.regA >> 7) & 1;
                    this.regA = (this.regA << 1) & 0xff;
                    this.flagN = (this.regA >> 7) & 1;
                    this.flagZ = this.regA === 0 ? 1 : 0;
                } else {
                    tmp = this.mem[addr];
                    this.flagC = (tmp >> 7) & 1;
                    tmp = (tmp << 1) & 0xff;
                    this.flagN = (tmp >> 7) & 1;
                    this.flagZ = tmp;
                    this.mem[addr] = tmp;
                }
                break;
            
            // BIT(test BITs)
            // Affects Flags: N V Z
            case 0x24:
            case 0x2C:
                tmp = this.mem[addr];
                this.flagN = (tmp >> 7) & 1;
                this.flagV = (tmp >> 6) & 1;
                tmp &= this.regA;
                this.flagZ = tmp === 0 ? 1 : 0;
                break;
            
            // Branch Instructions
            // BPL(Branch on PLus)
            case 0x10:
                if(this.flagN === 0) {
                    this.cycles += 1;
                    var newAddr = this.regPC + this.mem[addr];
                    if(opAddr & 0xff00 !== newAddr & 0xff00) {
                        this.cycles += 1;
                    }
                    this.regPC = newAddr;
                }
                break;
            // BMI(Branch on MInus)
            case 0x30:
                if(this.flagN === 1) {
                    this.cycles += 1;
                    this.regPC = addr;
                }
                break;
            // BVC(Branch on oVerflow Clear)
            case 0x50:
                if(this.flagV === 0) {
                    this.cycles += 1;
                    var newAddr = this.regPC + this.mem[addr];
                    if(opAddr & 0xff00 !== newAddr & 0xff00) {
                        this.cycles += 1;
                    }
                    this.regPC = newAddr;
                }
                break;
            // BVS(Branch on oVerflow Set)
            case 0x70:
                if(this.flagV === 1) {
                    this.cycles += 1;
                    var newAddr = this.regPC + this.mem[addr];
                    if(opAddr & 0xff00 !== newAddr & 0xff00) {
                        this.cycles += 1;
                    }
                    this.regPC = newAddr;
                }
                break;
            // BCC(Branch on Carry Clear)
            case 0x90:
                if(this.flagC === 0) {
                    this.cycles += 1;
                    var newAddr = this.regPC + this.mem[addr];
                    if(opAddr & 0xff00 !== newAddr & 0xff00) {
                        this.cycles += 1;
                    }
                    this.regPC = newAddr;
                }
                break;
            // BCS(Branch on Carry Set)
            case 0xB0:
                if(this.flagC === 1) {
                    this.cycles += 1;
                    var newAddr = this.regPC + this.mem[addr];
                    if(opAddr & 0xff00 !== newAddr & 0xff00) {
                        this.cycles += 1;
                    }
                    this.regPC = newAddr;
                }
                break;
            // BNE (Branch on Not Equal)
            case 0xD0:
                if(this.flagZ === 0) {
                    this.cycles += 1;
                    var newAddr = this.regPC + this.mem[addr];
                    if(opAddr & 0xff00 !== newAddr & 0xff00) {
                        this.cycles += 1;
                    }
                    this.regPC = newAddr;
                }
                break;
            // BEQ(Branch on EQual)
            case 0xF0:
                if(this.flagZ === 1) {
                    this.cycles += 1;
                    var newAddr = this.regPC + this.mem[addr];
                    if(opAddr & 0xff00 !== newAddr & 0xff00) {
                        this.cycles += 1;
                    }
                    this.regPC = newAddr;
                }
                break;
            
            // BRK(BReaK)
            // Affects Flags: B
            case 0x00:
                this.regPC += 2;
                this.push((this.regPC >> 8) & 0xff);
                this.push(this.regPC & 0xff);
                this.flagB = 1;
                this.push(this.getStatus());
                this.flagI = 1;
                this.regPC = this.mem[0xfffe] | this.mem[0xffff] << 8;
                this.regPC--;
                break;
            
            // CMP(CoMPare accumulator)
            // Affects Flags: N Z C
            case 0xC9:
            case 0xC5:
            case 0xD5:
            case 0xCD:
            case 0xDD:
            case 0xD9:
            case 0xC1:
            case 0xD1:
                tmp = this.regA - this.mem[addr];
                this.flagC = tmp >= 0 ? 1 : 0;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                this.cycles += cycleAdd;
                break;
            
            // CPX(ComPare X register)
            // Affects Flags: N Z C
            case 0xE0:
            case 0xE4:
            case 0xEC:
                tmp = this.regX - this.mem[addr];
                this.flagC = tmp >= 0 ? 1 : 0;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                break;
            
            // CPY(ComPare Y register)
            // Affects Flags: N Z C
            case 0xC0:
            case 0xC4:
            case 0xCC:
                tmp = this.regY - this.mem[addr];
                this.flagC = tmp >= 0 ? 1 : 0;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                break;
            
            // DEC(DECrement memory)
            // Affects Flags: N Z
            case 0xC6:
            case 0xD6:
            case 0xCE:
            case 0xDE:
                tmp = (this.mem[addr] - 1) & 0xff;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = tmp === 0 ? 1 : 0;
                this.mem[addr] = tmp;
                break;
            
            // EOR(bitwise Exclusive OR)
            // Affects Flags: N Z
            case 0x49:
            case 0x45:
            case 0x55:
            case 0x4D:
            case 0x5D:
            case 0x59:
            case 0x41:
            case 0x51:
                this.regA = (this.mem[addr] ^ this.regA) & 0xff;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.cycles += cycleAdd;
                break;
            
            // Flag(Processor Status) Instructions
            // Affect Flags: as noted
            // CLC(CLear Carry)
            case 0x18:
                this.flagC = 0;
                break;
            // SEC(SEt Carry)
            case 0x38:
                this.flagC = 1;
                break;
            // CLI(CLear Interrupt)
            case 0x58:
                this.flagI = 0;
                break;
            // SEI(SEt Interrupt)
            case 0x78:
                this.flagI = 1;
                break;
            // CLV(CLear oVerflow)
            case 0xB8:
                this.flagV = 0;
                break;
            // CLD(CLear Decimal)
            case 0xD8:
                this.flagD = 0;
                break;
            // SED(SEt Decimal)
            case 0xF8:
                this.flagD = 1;
                break;
            
            // INC(INCrement memory)
            // Affects Flags: N Z
            case 0xE6:
            case 0xF6:
            case 0xEE:
            case 0xFE:
                tmp = (this.mem[addr] + 1) & 0xff;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = tmp === 0 ? 1 : 0;
                this.mem[addr] = tmp & 0xff;
                break;
            
            // JMP(JuMP)
            // Affects Flags: none
            case 0x4C:
            case 0x6C:
                this.regPC = addr;
                break;
            
            // JSR(Jump to SubRoutine)
            // Affects Flags: none
            case 0x20:
                this.push((this.regPC >> 8) & 0xff);
                this.push(this.regPC & 0xff);
                this.regPC = addr;
                break;
            
            // LDA(LoaD Accumulator)
            // Affects Flags: N Z
            case 0xA9:
            case 0xA5:
            case 0xB5:
            case 0xAD:
            case 0xBD:
            case 0xB9:
            case 0xA1:
            case 0xB1:
                this.regA = this.mem[addr];
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            
            // LDX(LoaD X register)
            // Affects Flags: N Z
            case 0xA2:
            case 0xA6:
            case 0xB6:
            case 0xAE:
            case 0xBE:
                this.regX = this.mem[addr];
                this.flagN = (this.regX >>7) & 1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                break;
            
            // LDY(LoaD Y register)
            // Affects Flags: N Z
            case 0xA0:
            case 0xA4:
            case 0xB4:
            case 0xAC:
            case 0xBC:
                this.regY = this.mem[addr];
                this.flagN = (this.regY >> 7) & 1;
                this.flagZ = this.regY === 0 ? 1 : 0;
                this.cycles += cycleAdd;
                break;
            
            // LSR(Logical Shift Right)
            // Affects Flags: N Z C
            case 0x4A:
            case 0x46:
            case 0x56:
            case 0x4E:
            case 0x5E:
                if(opInf.mode === ACCUMULATOR) {
                    tmp = this.regA & 0xff;
                    this.flagC = tmp & 1;
                    tmp >>= 1;
                    this.regA = tmp;
                } else {
                    tmp = this.mem[addr] & 0xff;
                    this.flagC = tmp & 1;
                    tmp >>= 1;
                    this.mem[addr] = tmp;
                }
                this.flagN = 0;
                this.flagZ = tmp === 0 ? 1 : 0;
                break;
            
            // NOP(No OPeration)
            // Affects Flags: none
            case 0xEA:
                // Ignore
                break;
            
            // ORA(bitwise OR with Accumulator)
            // Affects Flags: N Z
            case 0x09:
            case 0x05:
            case 0x15:
            case 0x0D:
            case 0x1D:
            case 0x19:
            case 0x01:
            case 0x11:
                tmp = (this.mem[addr] | this.regA) & 0xff;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = tmp === 0 ? 1 : 0;
                this.regA = tmp;
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
            
            // Register Instructions
            // Affect Flags: N Z
            // TAX(Transfer A to X)
            case 0xAA:
                this.regX = this.regA;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            // TXA(Transfer X to A)
            case 0x8A:
                this.regA = this.regX;
                this.flagN = (this.regX >> 7) & 1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                break;
            // DEX(DEcrement X)
            case 0xCA:
                this.regX = (this.regX - 1) & 0xff;
                this.flagN = (this.regX >> 7) & 1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                break;
            // INX(INcrement X)
            case 0xE8:
                this.regX = (this.regX + 1) & 0xff;
                this.flagN = (this.regX >> 7) & 1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                break;
            // TAY(Transfer A to Y)
            case 0xA8:
                this.regY = this.regA;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            // TYA(Transfer Y to A)
            case 0x98:
                this.regA = this.regY;
                this.flagN = (this.regY >> 7) & 1;
                this.flagZ = this.regY === 0 ? 1 : 0;
                break;
            // DEY(DEcrement Y)
            case 0x88:
                this.regY = (this.regY - 1) & 0xff;
                this.flagN = (this.regY >> 7) & 1;
                this.flagZ = this.regY === 0 ? 1 : 0;
                break;
            // INY(INcrement Y)
            case 0xC8:
                this.regY++;
                this.regY &= 0xff;
                this.flagN = (this.regY >> 7) & 1;
                this.flagZ = this.regY === 0 ? 1 : 0;
                break;
            
            // ROL(ROtate Left)
            // Affects Flags: N Z C
            case 0x2A:
            case 0x26:
            case 0x36:
            case 0x2E:
            case 0x3E:
                if(opInf.mode === ACCUMULATOR) {
                    tmp = this.regA;
                    tmp2 = this.flagC;
                    this.flagC = (tmp >> 7) & 1;
                    tmp = ((tmp << 1) & 0xff) + tmp2;
                    this.regA = tmp;
                } else {
                    tmp = this.mem[addr];
                    tmp2 = this.flagC;
                    this.flagC = (tmp >> 7) & 1;
                    tmp = ((tmp << 1) & 0xff) + tmp2;
                    this.mem[addr] = tmp;
                }
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = tmp === 0 ? 1 : 0;
                break;
            
            // ROR(ROtate Right)
            // Affects Flags: N Z C
            case 0x6A:
            case 0x66:
            case 0x76:
            case 0x6E:
            case 0x7E:
                if(opInf.mode === ACCUMULATOR) {
                    tmp2 = this.flagC << 7;
                    this.flagC = this.regA & 1;
                    tmp = (this.regA >> 1) + tmp2;
                    this.regA = tmp;
                } else {
                    tmp = this.mem[addr];
                    tmp2 = this.flagC << 7;
                    this.flagC = tmp & 1;
                    tmp = (tmp >> 1) + tmp2;
                    this.mem[addr] = tmp;
                }
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = tmp === 0 ? 1 : 0;
                break;
            
            // RTI(ReTurn from Interrupt)
            // Affects Flags: all
            case 0x40:
                tmp = this.pop();
                this.setStatus(tmp);
                this.regPC = this.pop() | this.pop() << 8;
                if(this.regPC === 0xffff) {
                    return;
                }
                this.regPC--;
                break;
            
            // RTS(ReTurn from Subroutine)
            // Affects Flags: none
            case 0x60:
                this.regPC = this.pop() | this.pop() << 8;
                if(this.regPC === 0xffff) {
                    return;
                }
                break;
            
            // SBC(SuBtract with Carry)
            // Affects Flags: N V Z C
            case 0xE9:
            case 0xE5:
            case 0xF5:
            case 0xED:
            case 0xFD:
            case 0xF9:
            case 0xE1:
            case 0xF1:
                tmp = this.regA - this.mem[addr] - (1 - this.flagC);
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                if(((this.regA ^ tmp) & 0x80) !== 0
                    && ((this.regA ^ this.mem[addr]) & 0x80) !== 0) {
                    this.flagV = 1;
                } else {
                    this.flagV = 0;
                }
                this.flagC = tmp < 0 ? 0 : 1;
                this.regA = tmp & 0xff;
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
            
            // STA(STore Accumulator)
            // Affects Flags: none
            case 0x85:
            case 0x95:
            case 0x8D:
            case 0x9D:
            case 0x99:
            case 0x81:
            case 0x91:
                this.mem[addr] = this.regA;
                break;
            
            // Stack Instructions
            // TXS(Transfer X to Stack ptr)
            case 0x9A:
                this.regSP = this.regX + 0x0100;
                this.regSP = 0x0100 | (this.regSP & 0xff);
                break;
            // TSX(Transfer Stack ptr to X)
            case 0xBA:
                this.regX = this.regSP - 0x0100;
                this.flagN = (this.regSP >> 7) & 1;
                this.flagZ = this.regX === 0 ? 1 : 0;
                break;
            // PHA(PusH Accumulator)
            case 0x48:
                this.push(this.regA);
                break;
            // PLA(PuLl Accumulator)
            case 0x68:
                this.regA = this.pop();
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                break;
            // PHP(PusH Processor status)
            case 0x08:
                this.flagB = 1;
                this.push(this.getStatus());
                break;
            // PLP(PuLl Processor status)
            case 0x28:
                var tmp = this.pop();
                this.setStatus(tmp);
                break;
            
            // STX(STore X register)
            // Affects Flags: none
            case 0x86:
            case 0x96:
            case 0x8E:
                this.mem[addr] = this.regX;
                break;
            
            // STY(STore Y register)
            // Affects Flags: none
            case 0x84:
            case 0x94:
            case 0x8C:
                this.mem[addr] = this.regY;
                break;
            
            // =============================
            
            // NOP(No OPeration)
            case 0x1A:
            case 0x3A:
            case 0X5A:
            case 0x7A:
            case 0xDA:
            case 0xFA:
                break;
            
            // ALR
            case 0x4B:
                tmp = this.regA & this.mem[addr];
                this.flagC = tmp & 1;
                this.regA = tmp >> 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.flagN = 0;
                break;
            
            // ANC
            case 0x0B:
            case 0x2B:
                this.regA &= this.mem[addr];
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.flagC = this.flagN = (this.regA >> 7) & 1;
                break;
            
            // ARR
            case 0x6B:
                tmp = this.regA & this.mem[addr];
                this.regA = (tmp >> 1) + (this.flagC << 7);
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.flagN = this.flagC;
                this.flagC = (tmp >> 7) & 1;
                this.flagV = ((tmp >> 7) ^ (tmp >> 6)) & 1;
                break;
            
            // AXS
            case 0xCB:
                tmp = (this.regX & this.regA) - this.mem[addr];
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                if(((this.regX ^ tmp) & 0x80) !== 0
                    && ((this.regX & this.mem[addr]) & 0x80) !== 0) {
                    this.flagV = 1;
                } else {
                    this.flagV = 0;
                }
                this.flagC = tmp < 0 ? 0 : 1;
                this.regX = tmp & 0xff;
                break;
            
            // LAX
            case 0xA3:
            case 0xA7:
            case 0xAF:
            case 0xB3:
            case 0xB7:
            case 0xBF:
                this.regA = this.regX = this.mem[addr];
                this.flagZ = this.regA === 0 ? 1 : 0;
                this.flagN = (this.regA >> 7) & 1;
                this.cycles += cycleAdd;
                break;
            
            // SAX
            case 0x83:
            case 0x87:
            case 0x8F:
            case 0x97:
                this.mem[addr] = this.regA & this.regX;
                break;
            
            // DCP
            case 0xC3:
            case 0xC7:
            case 0xCF:
            case 0xD3:
            case 0xD7:
            case 0xDB:
            case 0xDF:
                tmp = (this.mem[addr] - 1) & 0xff;
                this.mem[addr] = tmp;
                tmp = this.regA - tmp;
                this.flagC = tmp >= 0 ? 1 : 0;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
            
            // ISC
            case 0xE3:
            case 0xE7:
            case 0xEF:
            case 0xF3:
            case 0xF7:
            case 0xFB:
            case 0xFF:
                tmp = (this.mem[addr] + 1) & 0xff;
                this.mem[addr] = tmp;
                tmp = this.regA - tmp - (1 - this.flagC);
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                if(((this.regA ^ tmp) & 0x80) !== 0
                    && ((this.regA ^ this.mem[addr]) & 0x80) !== 0) {
                    this.flagV = 1;
                } else {
                    this.flagV = 0;
                }
                this.flagC = tmp < 0 ? 0 : 1;
                this.regA = tmp & 0xff;
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
            
            // RLA
            case 0x23:
            case 0x27:
            case 0x2F:
            case 0x33:
            case 0x37:
            case 0x3B:
            case 0x3F:
                tmp = this.mem[addr];
                tmp2 = this.flagC;
                this.flagC = (tmp >> 7) & 1;
                tmp = ((tmp << 1) & 0xff) + tmp2;
                this.mem[addr] = tmp;
                this.regA &= tmp;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
            
            // RRA
            case 0x63:
            case 0x67:
            case 0x6F:
            case 0x73:
            case 0x77:
            case 0x7B:
            case 0x7F:
                tmp = this.mem[addr];
                tmp2 = this.flagC << 7;
                this.flagC = tmp & 1;
                tmp = (tmp >> 1) + tmp2;
                this.mem[addr] = tmp;
                tmp = this.regA + this.mem[addr] + this.flagC;
                if(((this.regA ^ this.mem[addr]) & 0x80) === 0
                    && ((this.regA ^ tmp) & 0x80) !== 0) {
                    this.flagV = 1;
                } else {
                    this.flagV = 0;
                }
                this.flagC = tmp > 0xff ? 1 : 0;
                this.flagN = (tmp >> 7) & 1;
                this.flagZ = (tmp & 0xff) === 0 ? 1 : 0;
                this.regA = tmp & 0xff;
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
            
            // SLO
            case 0x03:
            case 0x07:
            case 0x0F:
            case 0x13:
            case 0x17:
            case 0x1B:
            case 0x1F:
                tmp = this.mem[addr];
                this.flagC = (tmp >> 7) & 1;
                tmp = (tmp << 1) & 0xff;
                this.mem[addr] = tmp;
                this.regA |= tmp;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
            
            // SRE
            case 0x43:
            case 0x47:
            case 0x4F:
            case 0x53:
            case 0x57:
            case 0x5B:
            case 0x5F:
                tmp = this.mem[addr] & 0xff;
                this.flagC = tmp & 1;
                tmp >>= 1;
                this.mem[addr] = tmp;
                this.regA ^= tmp;
                this.flagN = (this.regA >> 7) & 1;
                this.flagZ = this.regA === 0 ? 1 : 0;
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
            
            // SKB
            case 0x80:
            case 0x82:
            case 0x89:
            case 0xC2:
            case 0xE2:
                // Do nothing
                break;
            
            // IGN
            case 0x0C:
            case 0x1C:
            case 0x3C:
            case 0x5C:
            case 0x7C:
            case 0xDC:
            case 0xFC:
            case 0x04:
            case 0x44:
            case 0x64:
            case 0x14:
            case 0x34:
            case 0x54:
            case 0x74:
            case 0xD4:
            case 0xF4:
                // Do nothing but load
                tmp = this.mem[addr];
                if(opInf.mode !== INDIRECT_Y) {
                    this.cycles += cycleAdd;
                }
                break;
        }
    };
    
    this.push = function(value) {
        this.mem[this.regSP] = value;
        this.regSP--;
        this.regSP = 0x0100 | (this.regSP & 0xff);
    };
    
    this.pop = function() {
        this.regSP++;
        this.regSP = 0x0100 | (this.regSP & 0xff);
        return this.mem[this.regSP];
    };
    
    this.setStatus = function(value) {
        this.flagN = (value >> 7) & 1;
        this.flagV = (value >> 6) & 1;
        this.flagB = (value >> 4) & 1;
        this.flagD = (value >> 3) & 1;
        this.flagI = (value >> 2) & 1;
        this.flagZ = (value >> 1) & 1;
        this.flagC = value & 1;
    };
    
    this.getStatus = function() {
        return (this.flagN << 7)
            | (this.flagV << 6)
            | (1 << 5)
            | (this.flagB << 4)
            | (this.flagD << 3)
            | (this.flagI << 2)
            | (this.flagZ << 1)
            | this.flagC;
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
        var lines = content.split('\r\n');
        for(var i = 0; i < 1000; i++) {
            var line = lines[i];
            cpu.simulate(function(result) {
                checkResult(line, result);
            });
        }
    });
});

function checkResult(line, result) {
    var values = /([0-9A-F]{4})\s{2}([\s\S]*?)\s{2}[\s\S]*?A:([0-9A-F]{2})[\s\S]*?X:([0-9A-F]{2})[\s\S]*?Y:([0-9A-F]{2})[\s\S]*?P:([0-9A-F]{2})[\s\S]*?SP:([0-9A-F]{2})[\s\S]*?CYC:([0-9]+)/.exec(line);
    var addr = parseInt('0x' + values[1]);
    var strs = values[2].split(' ');
    var inst = [];
    for(var i = 0; i < strs.length; i++) {
        inst.push(parseInt('0x' + strs[i]));
    }
    var a = parseInt('0x' + values[3]);
    var x = parseInt('0x' + values[4]);
    var y = parseInt('0x' + values[5]);
    var p = parseInt('0x' + values[6]);
    var sp = parseInt('0x' + values[7]);
    var cyc = parseInt(values[8]);
    var err = {
        addr: addr !== result.addr,
        inst: false,
        A: a !== result.A,
        X: x !== result.X,
        Y: y !== result.Y,
        P: p !== result.P,
        SP: sp !== result.SP,
        CYC: cyc !== result.CYC
    };
    for(var i = 0; i < inst.length; i++) {
        if(inst[i] !== result.inst[i]) {
            err.inst = true;
            break;
        }
    }
    /*for(var i = 0, keys = Object.keys(err); i < keys.length; i++) {
        if(err[keys[i]]) {
            printResult(result, err);
            break;
        }
    }*/
    printResult(result, err);
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





























































































































































































