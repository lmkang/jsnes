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

function CPU() {
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
        this.regSP = 0x01ff;
        // Processor Status(P)
        this.regP = 0x28;
        
        // Negative(7)
        this.flagN = 0;
        // Overflow(6)
        this.flagV = 0;
        // Unused(5)
        this.flagU = 1;
        // Break(4)
        this.flagB = 1;
        // Decimal mode(3)
        this.flagD = 0;
        // Interrupt(2)
        this.flagI = 1;
        // Zero(1)
        this.flagZ = 1;
        // Carry(0)
        this.flagC = 0;
        
        this.cycles = 7;
        
        // Zero Page,X
        var ZP_X = 0;
        // Zero Page,Y
        var ZP_Y = 1;
        // Absolute,X
        var ABS_X = 2;
        // Absolute,Y
        var ABS_Y = 3;
        // Indirect,X
        var IND_X = 4;
        // Indirect,Y
        var IND_Y = 5;
        // Implicit
        var IMP = 6;
        // Accumulator
        var ACC = 7;
        // Immediate
        var IMM = 8;
        // Zero Page
        var ZP = 9;
        // Absolute
        var ABS = 10;
        // Relative
        var REL = 11;
        // Indirect
        var IND = 12;
        
        this.opData = {
            // ADC(ADd with Carry)
            0x69: {mode: IMM,   len: 2, cycle: 2},
            0x65: {mode: ZP,    len: 2, cycle: 3},
            0x75: {mode: ZP_X,  len: 2, cycle: 4},
            0x6D: {mode: ABS,   len: 3, cycle: 4},
            0x7D: {mode: ABS_X, len: 3, cycle: 4},
            0x79: {mode: ABS_Y, len: 3, cycle: 4},
            0x61: {mode: IND_X, len: 2, cycle: 6},
            0x71: {mode: IND_Y, len: 2, cycle: 5},
            
            // AND(bitwise AND with accumulator)
            0x29: {mode: IMM,   len: 2, cycle: 2},
            0x25: {mode: ZP,    len: 2, cycle: 3},
            0x35: {mode: ZP_X,  len: 2, cycle: 4},
            0x2D: {mode: ABS,   len: 3, cycle: 4},
            0x3D: {mode: ABS_X, len: 3, cycle: 4},
            0x39: {mode: ABS_Y, len: 3, cycle: 4},
            0x21: {mode: IND_X, len: 2, cycle: 6},
            0x31: {mode: IND_Y, len: 2, cycle: 5},
            
            // ASL(Arithmetic Shift Left)
            0x0A: {mode: ACC,   len: 1, cycle: 2},
            0x06: {mode: ZP,    len: 2, cycle: 5},
            0x16: {mode: ZP_X,  len: 2, cycle: 6},
            0x0E: {mode: ABS,   len: 3, cycle: 6},
            0x1E: {mode: ABS_X, len: 3, cycle: 7},
            
            // BIT(test BITs)
            0x24: {mode: ZP,  len: 2, cycle: 3},
            0x2C: {mode: ABS, len: 3, cycle: 4},
            
            // Branch Instructions
            // BPL(Branch on PLus)
            0x10: {mode: REL, len: 2, cycle: 2},
            // BMI(Branch on MInus)
            0x30: {mode: REL, len: 2, cycle: 2},
            // BVC(Branch on oVerflow Clear)
            0x50: {mode: REL, len: 2, cycle: 2},
            // BVS(Branch on oVerflow Set)
            0x70: {mode: REL, len: 2, cycle: 2},
            // BCC(Branch on Carry Clear)
            0x90: {mode: REL, len: 2, cycle: 2},
            // BCS(Branch on Carry Set)
            0xB0: {mode: REL, len: 2, cycle: 2},
            // BNE (Branch on Not Equal)
            0xD0: {mode: REL, len: 2, cycle: 2},
            // BEQ(Branch on EQual)
            0xF0: {mode: REL, len: 2, cycle: 2},
            
            // BRK(BReaK)
            0x00: {mode: IMP, len: 1, cycle: 7},
            
            // CMP(CoMPare accumulator)
            0xC9: {mode: IMM,   len: 2, cycle: 2},
            0xC5: {mode: ZP,    len: 2, cycle: 3},
            0xD5: {mode: ZP_X,  len: 2, cycle: 4},
            0xCD: {mode: ABS,   len: 3, cycle: 4},
            0xDD: {mode: ABS_X, len: 3, cycle: 4},
            0xD9: {mode: ABS_Y, len: 3, cycle: 4},
            0xC1: {mode: IND_X, len: 2, cycle: 6},
            0xD1: {mode: IND_Y, len: 2, cycle: 5},
            
            // CPX(ComPare X register)
            0xE0: {mode: IMM, len: 2, cycle: 2},
            0xE4: {mode: ZP,  len: 2, cycle: 3},
            0xEC: {mode: ABS, len: 3, cycle: 4},
            
            // CPY(ComPare Y register)
            0xC0: {mode: IMM, len: 2, cycle: 2},
            0xC4: {mode: ZP,  len: 2, cycle: 3},
            0xCC: {mode: ABS, len: 3, cycle: 4},
            
            // DEC(DECrement memory)
            0xC6: {mode: ZP,    len: 2, cycle: 5},
            0xD6: {mode: ZP_X,  len: 2, cycle: 6},
            0xCE: {mode: ABS,   len: 3, cycle: 6},
            0xDE: {mode: ABS_X, len: 3, cycle: 7},
            
            // EOR(bitwise Exclusive OR)
            0x49: {mode: IMM,   len: 2, cycle: 2},
            0x45: {mode: ZP,    len: 2, cycle: 3},
            0x55: {mode: ZP_X,  len: 2, cycle: 4},
            0x4D: {mode: ABS,   len: 3, cycle: 4},
            0x5D: {mode: ABS_X, len: 3, cycle: 4},
            0x59: {mode: ABS_Y, len: 3, cycle: 4},
            0x41: {mode: IND_X, len: 2, cycle: 6},
            0x51: {mode: IND_Y, len: 2, cycle: 5},
            
            // Flag(Processor Status) Instructions
            // CLC(CLear Carry)
            0x18: {mode: IMP, len: 1, cycle: 2},
            // SEC(SEt Carry)
            0x38: {mode: IMP, len: 1, cycle: 2},
            // CLI(CLear Interrupt)
            0x58: {mode: IMP, len: 1, cycle: 2},
            // SEI(SEt Interrupt)
            0x78: {mode: IMP, len: 1, cycle: 2},
            // CLV(CLear oVerflow)
            0xB8: {mode: IMP, len: 1, cycle: 2},
            // CLD(CLear Decimal)
            0xD8: {mode: IMP, len: 1, cycle: 2},
            // SED(SEt Decimal)
            0xF8: {mode: IMP, len: 1, cycle: 2},
            
            // INC(INCrement memory)
            0xE6: {mode: ZP,    len: 2, cycle: 5},
            0xF6: {mode: ZP_X,  len: 2, cycle: 6},
            0xEE: {mode: ABS,   len: 3, cycle: 6},
            0xFE: {mode: ABS_X, len: 3, cycle: 7},
            
            // JMP(JuMP)
            0x4C: {mode: ABS, len: 3, cycle: 3},
            0x6C: {mode: IND, len: 3, cycle: 5},
            
            // JSR(Jump to SubRoutine)
            0x20: {mode: ABS, len: 3, cycle: 6},
            
            // LDA(LoaD Accumulator)
            0xA9: {mode: IMM,   len: 2, cycle: 2},
            0xA5: {mode: ZP,    len: 2, cycle: 3},
            0xB5: {mode: ZP_X,  len: 2, cycle: 4},
            0xAD: {mode: ABS,   len: 3, cycle: 4},
            0xBD: {mode: ABS_X, len: 3, cycle: 4},
            0xB9: {mode: ABS_Y, len: 3, cycle: 4},
            0xA1: {mode: IND_X, len: 2, cycle: 6},
            0xB1: {mode: IND_Y, len: 2, cycle: 5},
            
            // LDX(LoaD X register)
            0xA2: {mode: IMM,   len: 2, cycle: 2},
            0xA6: {mode: ZP,    len: 2, cycle: 3},
            0xB6: {mode: ZP_Y,  len: 2, cycle: 4},
            0xAE: {mode: ABS,   len: 3, cycle: 4},
            0xBE: {mode: ABS_Y, len: 3, cycle: 4},
            
            // LDY(LoaD Y register)
            0xA0: {mode: IMM,   len: 2, cycle: 2},
            0xA4: {mode: ZP,    len: 2, cycle: 3},
            0xB4: {mode: ZP_X,  len: 2, cycle: 4},
            0xAC: {mode: ABS,   len: 3, cycle: 4},
            0xBC: {mode: ABS_X, len: 3, cycle: 4},
            
            // LSR(Logical Shift Right)
            0x4A: {mode: ACC,   len: 1, cycle: 2},
            0x46: {mode: ZP,    len: 2, cycle: 5},
            0x56: {mode: ZP_X,  len: 2, cycle: 6},
            0x4E: {mode: ABS,   len: 3, cycle: 6},
            0x5E: {mode: ABS_X, len: 3, cycle: 7},
            
            // NOP(No OPeration)
            0xEA: {mode: IMP, len: 1, cycle: 2},
            
            // ORA(bitwise OR with Accumulator)
            0x09: {mode: IMM,   len: 2, cycle: 2},
            0x05: {mode: ZP,    len: 2, cycle: 3},
            0x15: {mode: ZP_X,  len: 2, cycle: 4},
            0x0D: {mode: ABS,   len: 3, cycle: 4},
            0x1D: {mode: ABS_X, len: 3, cycle: 4},
            0x19: {mode: ABS_Y, len: 3, cycle: 4},
            0x01: {mode: IND_X, len: 2, cycle: 6},
            0x11: {mode: IND_Y, len: 2, cycle: 5},
            
            // Register Instructions
            // TAX(Transfer A to X)
            0xAA: {mode: IMP, len: 1, cycle: 2},
            // TXA(Transfer X to A)
            0x8A: {mode: IMP, len: 1, cycle: 2},
            // DEX(DEcrement X)
            0xCA: {mode: IMP, len: 1, cycle: 2},
            // INX(INcrement X)
            0xE8: {mode: IMP, len: 1, cycle: 2},
            // TAY(Transfer A to Y)
            0xA8: {mode: IMP, len: 1, cycle: 2},
            // TYA(Transfer Y to A)
            0x98: {mode: IMP, len: 1, cycle: 2},
            // DEY(DEcrement Y)
            0x88: {mode: IMP, len: 1, cycle: 2},
            // INY(INcrement Y)
            0xC8: {mode: IMP, len: 1, cycle: 2},
            
            // ROL(ROtate Left)
            0x2A: {mode: ACC,   len: 1, cycle: 2},
            0x26: {mode: ZP,    len: 2, cycle: 5},
            0x36: {mode: ZP_X,  len: 2, cycle: 6},
            0x2E: {mode: ABS,   len: 3, cycle: 6},
            0x3E: {mode: ABS_X, len: 3, cycle: 7},
            
            // ROR(ROtate Right)
            0x6A: {mode: ACC,   len: 1, cycle: 2},
            0x66: {mode: ZP,    len: 2, cycle: 5},
            0x76: {mode: ZP_X,  len: 2, cycle: 6},
            0x6E: {mode: ABS,   len: 3, cycle: 6},
            0x7E: {mode: ABS_X, len: 3, cycle: 7},
            
            // RTI(ReTurn from Interrupt)
            0x40: {mode: IMP, len: 1, cycle: 6},
            
            // RTS(ReTurn from Subroutine)
            0x60: {mode: IMP, len: 1, cycle: 6},
            
            // SBC(SuBtract with Carry)
            0xE9: {mode: IMM,   len: 2, cycle: 2},
            0xE5: {mode: ZP,    len: 2, cycle: 3},
            0xF5: {mode: ZP_X,  len: 2, cycle: 4},
            0xED: {mode: ABS,   len: 3, cycle: 4},
            0xFD: {mode: ABS_X, len: 3, cycle: 4},
            0xF9: {mode: ABS_Y, len: 3, cycle: 4},
            0xE1: {mode: IND_X, len: 2, cycle: 6},
            0xF1: {mode: IND_Y, len: 2, cycle: 5},
            
            // STA(STore Accumulator)
            0x85: {mode: ZP,    len: 2, cycle: 3},
            0x95: {mode: ZP_X,  len: 2, cycle: 4},
            0x8D: {mode: ABS,   len: 3, cycle: 4},
            0x9D: {mode: ABS_X, len: 3, cycle: 5},
            0x99: {mode: ABS_Y, len: 3, cycle: 5},
            0x81: {mode: IND_X, len: 2, cycle: 6},
            0x91: {mode: IND_Y, len: 2, cycle: 6},
            
            // Stack Instructions
            // TXS(Transfer X to Stack ptr)
            0x9A: {mode: IMP, len: 1, cycle: 2},
            // TSX(Transfer Stack ptr to X)
            0xBA: {mode: IMP, len: 1, cycle: 2},
            // PHA(PusH Accumulator)
            0x48: {mode: IMP, len: 1, cycle: 3},
            // PLA(PuLl Accumulator)
            0x68: {mode: IMP, len: 1, cycle: 4},
            // PHP(PusH Processor status)
            0x08: {mode: IMP, len: 1, cycle: 3},
            // PLP(PuLl Processor status)
            0x28: {mode: IMP, len: 1, cycle: 4},
            
            // STX(STore X register)
            0x86: {mode: ZP,   len: 2, cycle: 3},
            0x96: {mode: ZP_Y, len: 2, cycle: 4},
            0x8E: {mode: ABS,  len: 3, cycle: 4},
            
            // STY(STore Y register)
            0x84: {mode: ZP,   len: 2, cycle: 3},
            0x94: {mode: ZP_X, len: 2, cycle: 4},
            0x8C: {mode: ABS,  len: 3, cycle: 4},
            
            // ============================================
            
            // NOP(No OPeration)
            0x1A: {mode: IMP, len: 1, cycle: 2},
            0x3A: {mode: IMP, len: 1, cycle: 2},
            0x5A: {mode: IMP, len: 1, cycle: 2},
            0x7A: {mode: IMP, len: 1, cycle: 2},
            0xDA: {mode: IMP, len: 1, cycle: 2},
            0xFA: {mode: IMP, len: 1, cycle: 2},
            
            // ALR
            0x4B: {mode: IMM, len: 2, cycle: 2},
            
            // ANC
            0x0B: {mode: IMM, len: 2, cycle: 2},
            0x2B: {mode: IMM, len: 2, cycle: 2},
            
            // ARR
            0x6B: {mode: IMM, len: 2, cycle: 2},
            
            // AXS
            0xCB: {mode: IMM, len: 2, cycle: 2},
            
            // LAX
            0xA3: {mode: IND_X, len: 2, cycle: 6},
            0xA7: {mode: ZP,    len: 2, cycle: 3},
            0xAF: {mode: ABS,   len: 3, cycle: 4},
            0xB3: {mode: IND_Y, len: 2, cycle: 5},
            0xB7: {mode: ZP_Y,  len: 2, cycle: 4},
            0xBF: {mode: ABS_Y, len: 3, cycle: 4},
            
            // SAX
            0x83: {mode: IND_X, len: 2, cycle: 6},
            0x87: {mode: ZP,    len: 2, cycle: 3},
            0x8F: {mode: ABS,   len: 3, cycle: 4},
            0x97: {mode: ZP_Y,  len: 2, cycle: 4},
            
            // DCP
            0xC3: {mode: IND_X, len: 2, cycle: 8},
            0xC7: {mode: ZP,    len: 2, cycle: 5},
            0xCF: {mode: ABS,   len: 3, cycle: 6},
            0xD3: {mode: IND_Y, len: 2, cycle: 8},
            0xD7: {mode: ZP_X,  len: 2, cycle: 6},
            0xDB: {mode: ABS_Y, len: 3, cycle: 7},
            0xDF: {mode: ABS_X, len: 3, cycle: 7},
            
            // ISC
            0xE3: {mode: IND_X, len: 2, cycle: 8},
            0xE7: {mode: ZP,    len: 2, cycle: 5},
            0xEF: {mode: ABS,   len: 3, cycle: 6},
            0xF3: {mode: IND_Y, len: 2, cycle: 8},
            0xF7: {mode: ZP_X,  len: 2, cycle: 6},
            0xFB: {mode: ABS_Y, len: 3, cycle: 7},
            0xFF: {mode: ABS_X, len: 3, cycle: 7},
            
            // RLA
            0x23: {mode: IND_X, len: 2, cycle: 8},
            0x27: {mode: ZP,    len: 2, cycle: 5},
            0x2F: {mode: ABS,   len: 3, cycle: 6},
            0x33: {mode: IND_Y, len: 2, cycle: 8},
            0x37: {mode: ZP_X,  len: 2, cycle: 6},
            0x3B: {mode: ABS_Y, len: 3, cycle: 7},
            0x3F: {mode: ABS_X, len: 3, cycle: 7},
            
            // RRA
            0x63: {mode: IND_X, len: 2, cycle: 8},
            0x67: {mode: ZP,    len: 2, cycle: 5},
            0x6F: {mode: ABS,   len: 3, cycle: 6},
            0x73: {mode: IND_Y, len: 2, cycle: 8},
            0x77: {mode: ZP_X,  len: 2, cycle: 6},
            0x7B: {mode: ABS_Y, len: 3, cycle: 7},
            0x7F: {mode: ABS_X, len: 3, cycle: 7},
            
            // SLO
            0x03: {mode: IND_X, len: 2, cycle: 8},
            0x07: {mode: ZP,    len: 2, cycle: 5},
            0x0F: {mode: ABS,   len: 3, cycle: 6},
            0x13: {mode: IND_Y, len: 2, cycle: 8},
            0x17: {mode: ZP_X,  len: 2, cycle: 6},
            0x1B: {mode: ABS_Y, len: 3, cycle: 7},
            0x1F: {mode: ABS_X, len: 3, cycle: 7},
            
            // SRE
            0x43: {mode: IND_X, len: 2, cycle: 8},
            0x47: {mode: ZP,    len: 2, cycle: 5},
            0x4F: {mode: ABS,   len: 3, cycle: 6},
            0x53: {mode: IND_Y, len: 2, cycle: 8},
            0x57: {mode: ZP_X,  len: 2, cycle: 6},
            0x5B: {mode: ABS_Y, len: 3, cycle: 7},
            0x5F: {mode: ABS_X, len: 3, cycle: 7},
            
            // SKB
            0x80: {mode: IMM, len: 2, cycle: 2},
            0x82: {mode: IMM, len: 2, cycle: 2},
            0x89: {mode: IMM, len: 2, cycle: 2},
            0xC2: {mode: IMM, len: 2, cycle: 2},
            0xE2: {mode: IMM, len: 2, cycle: 2},
            
            // SKB
            0x0C: {mode: ABS,   len: 3, cycle: 4},
            0x1C: {mode: ABS_X, len: 3, cycle: 4},
            0x3C: {mode: ABS_X, len: 3, cycle: 4},
            0x5C: {mode: ABS_X, len: 3, cycle: 4},
            0x7C: {mode: ABS_X, len: 3, cycle: 4},
            0xDC: {mode: ABS_X, len: 3, cycle: 4},
            0xFC: {mode: ABS_X, len: 3, cycle: 4},
            0x04: {mode: ZP,    len: 2, cycle: 3},
            0x44: {mode: ZP,    len: 2, cycle: 3},
            0x64: {mode: ZP,    len: 2, cycle: 3},
            0x14: {mode: ZP_X,  len: 2, cycle: 4},
            0x34: {mode: ZP_X,  len: 2, cycle: 4},
            0x54: {mode: ZP_X,  len: 2, cycle: 4},
            0x74: {mode: ZP_X,  len: 2, cycle: 4},
            0xD4: {mode: ZP_X,  len: 2, cycle: 4},
            0xF4: {mode: ZP_X,  len: 2, cycle: 4},
        };
    };
    
    this.regLoad = function(address) {
        // use fourth nibble(0xF000)
        switch(address >> 12) {
            case 0:
                break;
            
            case 1:
                break;
            
            case 2:
                // Fall through to case 3
            case 3:
                // PPU Registers
                switch(address & 0x7) {
                    case 0x0:
                        // 0x2000:
                        // PPU Control Register 1.
                        // (the value is stored both
                        // in main memory and in the
                        // PPU as flags):
                        // (not in the real NES)
                        return this.mem[0x2000];

                    case 0x1:
                        // 0x2001:
                        // PPU Control Register 2.
                        // (the value is stored both
                        // in main memory and in the
                        // PPU as flags):
                        // (not in the real NES)
                        return this.mem[0x2001];

                    case 0x2:
                        // 0x2002:
                        // PPU Status Register.
                        // The value is stored in
                        // main memory in addition
                        // to as flags in the PPU.
                        // (not in the real NES)
                        return 0;

                    case 0x3:
                        return 0;

                    case 0x4:
                        // 0x2004:
                        // Sprite Memory read.
                        return 0;
                    case 0x5:
                        return 0;

                    case 0x6:
                        return 0;

                    case 0x7:
                        // 0x2007:
                        // VRAM read:
                        return 0;
                }
                break;
            case 4:
                // Sound+Joypad registers
                switch (address - 0x4015) {
                    case 0:
                        // 0x4015:
                        // Sound channel enable, DMC Status
                        return 0;

                    case 1:
                        // 0x4016:
                        // Joystick 1 + Strobe
                        return 0;

                    case 2:
                        // 0x4017:
                        // Joystick 2 + Strobe
                        // https://wiki.nesdev.com/w/index.php/Zapper
                        return 0;
                }
                break;
        }
        return 0;
    };
    
    this.mmap = function(address) {
        // Wrap around
        address &= 0xffff;
        // Check address range
        if(address > 0x4017) {
            // ROM
            return this.mem[address];
        } else if(address >= 0x2000) {
            // I/O Port
            return this.regLoad(address);
        } else {
            // RAM(mirrored)
            return this.mem[address & 0x7ff];
        }
    };
    
    this.load = function(address) {
        if(address < 0x2000) {
            return this.mem[address & 0x7ff];
        } else {
            return this.mmap(address);
        }
    };
    
    this.load16bit = function(address) {
        if(address < 0x1fff) {
            return this.mem[address & 0x7ff] 
                | (this.mem[(address + 1) & 0x7ff] << 8);
        } else {
            return this.mmap(address) | (this.mmap(address + 1) << 8);
        }
    };
    
    this.simulate = function() {
        var opAddr = this.regPC;
        var opInf = this.opData[opAddr];
        this.regPC += opInf.len;
        this.cycles += opInf.cycle;
        var addr = 0;
        switch(opInf.mode) {
            // Zero Page,X
            case ZP_X:
                break;
            
            // Zero Page,Y
            case ZP_Y:
                break;
            
            // Absolute,X
            case ABS_X:
                break;
            
            // Absolute,Y
            case ABS_Y:
                break;
            
            // Indirect,X
            case IND_X:
                break;
            
            // Indirect,Y
            case IND_Y:
                break;
            
            // Implicit
            case IMP:
                break;
            
            // Accumulator
            case ACC:
                break;
            
            // Immediate
            case IMM:
                break;
            
            // Zero Page
            case ZP:
                
                break;
            
            // Absolute
            case ABS:
                break;
            
            // Relative
            case REL:
                break;
            
            // Indirect
            case IND:
                break;
        }
        
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
                break;
            
            // ASL(Arithmetic Shift Left)
            // Affects Flags: N Z C
            case 0x0A:
            case 0x06:
            case 0x16:
            case 0x0E:
            case 0x1E:
                break;
            
            // BIT(test BITs)
            // Affects Flags: N V Z
            case 0x24:
            case 0x2C:
                break;
            
            // Branch Instructions
            // BPL(Branch on PLus)
            case 0x10:
                break;
            // BMI(Branch on MInus)
            case 0x30:
                break;
            // BVC(Branch on oVerflow Clear)
            case 0x50:
                break;
            // BVS(Branch on oVerflow Set)
            case 0x70:
                break;
            // BCC(Branch on Carry Clear)
            case 0x90:
                break;
            // BCS(Branch on Carry Set)
            case 0xB0:
                break;
            // BNE (Branch on Not Equal)
            case 0xD0:
                break;
            // BEQ(Branch on EQual)
            case 0xF0:
                break;
            
            // BRK(BReaK)
            // Affects Flags: B
            case 0x00:
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
                break;
            
            // CPX(ComPare X register)
            // Affects Flags: N Z C
            case 0xE0:
            case 0xE4:
            case 0xEC:
                break;
            
            // CPY(ComPare Y register)
            // Affects Flags: N Z C
            case 0xC0:
            case 0xC4:
            case 0xCC:
                break;
            
            // DEC(DECrement memory)
            // Affects Flags: N Z
            case 0xC6:
            case 0xD6:
            case 0xCE:
            case 0xDE:
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
                break;
            
            // Flag(Processor Status) Instructions
            // Affect Flags: as noted
            // CLC(CLear Carry)
            case 0x18:
                break;
            // SEC(SEt Carry)
            case 0x38:
                break;
            // CLI(CLear Interrupt)
            case 0x58:
                break;
            // SEI(SEt Interrupt)
            case 0x78:
                break;
            // CLV(CLear oVerflow)
            case 0xB8:
                break;
            // CLD(CLear Decimal)
            case 0xD8:
                break;
            // SED(SEt Decimal)
            case 0xF8:
                break;
            
            // INC(INCrement memory)
            // Affects Flags: N Z
            case 0xE6:
            case 0xF6:
            case 0xEE:
            case 0xFE:
                break;
            
            // JMP(JuMP)
            // Affects Flags: none
            case 0x4C:
            case 0x6C:
                break;
            
            // JSR(Jump to SubRoutine)
            // Affects Flags: none
            case 0x20:
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
                break;
            
            // LDX(LoaD X register)
            // Affects Flags: N Z
            case 0xA2:
            case 0xA6:
            case 0xB6:
            case 0xAE:
            case 0xBE:
                break;
            
            // LDY(LoaD Y register)
            // Affects Flags: N Z
            case 0xA0:
            case 0xA4:
            case 0xB4:
            case 0xAC:
            case 0xBC:
                break;
            
            // LSR(Logical Shift Right)
            // Affects Flags: N Z C
            case 0x4A:
            case 0x46:
            case 0x56:
            case 0x4E:
            case 0x5E:
                break;
            
            // NOP(No OPeration)
            // Affects Flags: none
            case 0xEA:
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
                break;
            
            // Register Instructions
            // Affect Flags: N Z
            // TAX(Transfer A to X)
            case 0xAA:
                break;
            // TXA(Transfer X to A)
            case 0x8A:
                break;
            // DEX(DEcrement X)
            case 0xCA:
                break;
            // INX(INcrement X)
            case 0xE8:
                break;
            // TAY(Transfer A to Y)
            case 0xA8:
                break;
            // TYA(Transfer Y to A)
            case 0x98:
                break;
            // DEY(DEcrement Y)
            case 0x88:
                break;
            // INY(INcrement Y)
            case 0xC8:
                break;
            
            // ROL(ROtate Left)
            // Affects Flags: N Z C
            case 0x2A:
            case 0x26:
            case 0x36:
            case 0x2E:
            case 0x3E:
                break;
            
            // ROR(ROtate Right)
            // Affects Flags: N Z C
            case 0x6A:
            case 0x66:
            case 0x76:
            case 0x6E:
            case 0x7E:
                break;
            
            // RTI(ReTurn from Interrupt)
            // Affects Flags: all
            case 0x40:
                break;
            
            // RTS(ReTurn from Subroutine)
            // Affects Flags: none
            case 0x60:
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
                break;
            
            // Stack Instructions
            // TXS(Transfer X to Stack ptr)
            case 0x9A:
                break;
            // TSX(Transfer Stack ptr to X)
            case 0xBA:
                break;
            // PHA(PusH Accumulator)
            case 0x48:
                break;
            // PLA(PuLl Accumulator)
            case 0x68:
                break;
            // PHP(PusH Processor status)
            case 0x08:
                break;
            // PLP(PuLl Processor status)
            case 0x28:
                break;
            
            // STX(STore X register)
            // Affects Flags: none
            case 0x86:
            case 0x96:
            case 0x8E:
                break;
            
            // STY(STore Y register)
            // Affects Flags: none
            case 0x84:
            case 0x94:
            case 0x8C:
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
                break;
            
            // ANC
            case 0x0B:
            case 0x2B:
                break;
            
            // ARR
            case 0x6B:
                break;
            
            // AXS
            case 0xCB:
                break;
            
            // LAX
            case 0xA3:
            case 0xA7:
            case 0xAF:
            case 0xB3:
            case 0xB7:
            case 0xBF:
                break;
            
            // SAX
            case 0x83:
            case 0x87:
            case 0x8F:
            case 0x97:
                break;
            
            // DCP
            case 0xC3:
            case 0xC7:
            case 0xCF:
            case 0xD3:
            case 0xD7:
            case 0xDB:
            case 0xDF:
                break;
            
            // ISC
            case 0xE3:
            case 0xE7:
            case 0xEF:
            case 0xF3:
            case 0xF7:
            case 0xFB:
            case 0xFF:
                break;
            
            // RLA
            case 0x23:
            case 0x27:
            case 0x2F:
            case 0x33:
            case 0x37:
            case 0x3B:
            case 0x3F:
                break;
            
            // RRA
            case 0x63:
            case 0x67:
            case 0x6F:
            case 0x73:
            case 0x77:
            case 0x7B:
            case 0x7F:
                break;
            
            // SLO
            case 0x03:
            case 0x07:
            case 0x0F:
            case 0x13:
            case 0x17:
            case 0x1B:
            case 0x1F:
                break;
            
            // SRE
            case 0x43:
            case 0x47:
            case 0x4F:
            case 0x53:
            case 0x57:
            case 0x5B:
            case 0x5F:
                break;
            
            // SKB
            case 0x80:
            case 0x82:
            case 0x89:
            case 0xC2:
            case 0xE2:
                break;
            
            // SKB
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
                break;
        }
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
    
});































































































































































































