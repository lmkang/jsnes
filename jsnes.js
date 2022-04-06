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
        var prgBanks = [];
        for(var i = 0; i < this.prgCount; i++) {
            prgBanks[i] = [];
            for(var j = 0; j < 16384; j++) {
                prgBanks[i][j] = buf[offset + j];
            }
            offset += 16384;
        }
        // CHR-ROM banks
        var chrBanks = [];
        for(var i = 0; i < this.prgCount; i++) {
            chrBanks[i] = [];
            for(var j = 0; j < 8192; j++) {
                chrBanks[i][j] = buf[offset + j];
            }
            offset += 8192;
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
        
        this.regA = 0;
        this.regX = 0;
        this.regY = 0;
        // Program Counter
        this.regPC = 0x8000 - 1;
        // Stack Pointer
        this.regSP = 0x01ff;
        
        // Negative(7)
        this.flagN = 0;
        // Overflow(6)
        this.flagV = 0;
        // Unused(5)
        this.flagUnused = 1;
        // Break(4)
        this.flagB = 1;
        // Decimal mode(3)
        this.flagD = 0;
        // IRQ(2)
        this.flagI = 1;
        // Zero(1)
        this.flagZ = 1;
        // Carry(0)
        this.flagC = 0;
        
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
            0x69: {mode: IMM,   op: 0x69, len: 2, cycle: 2},
            0x65: {mode: ZP,    op: 0x65, len: 2, cycle: 3},
            0x75: {mode: ZP_X,  op: 0x75, len: 2, cycle: 4},
            0x6D: {mode: ABS,   op: 0x6D, len: 3, cycle: 4},
            0x7D: {mode: ABS_X, op: 0x7D, len: 3, cycle: 4},
            0x79: {mode: ABS_Y, op: 0x79, len: 3, cycle: 4},
            0x61: {mode: IND_X, op: 0x61, len: 2, cycle: 6},
            0x71: {mode: IND_Y, op: 0x71, len: 2, cycle: 5},
            
            // AND(bitwise AND with accumulator)
            0x29: {mode: IMM,   op: 0x29, len: 2, cycle: 2},
            0x25: {mode: ZP,    op: 0x25, len: 2, cycle: 3},
            0x35: {mode: ZP_X,  op: 0x35, len: 2, cycle: 4},
            0x2D: {mode: ABS,   op: 0x2D, len: 3, cycle: 4},
            0x3D: {mode: ABS_X, op: 0x3D, len: 3, cycle: 4},
            0x39: {mode: ABS_Y, op: 0x39, len: 3, cycle: 4},
            0x21: {mode: IND_X, op: 0x21, len: 2, cycle: 6},
            0x31: {mode: IND_Y, op: 0x31, len: 2, cycle: 5},
            
            // ASL(Arithmetic Shift Left)
            0x0A: {mode: ACC,   op: 0x0A, len: 1, cycle: 2},
            0x06: {mode: ZP,    op: 0x06, len: 2, cycle: 5},
            0x16: {mode: ZP_X,  op: 0x16, len: 2, cycle: 6},
            0x0E: {mode: ABS,   op: 0x0E, len: 3, cycle: 6},
            0x1E: {mode: ABS_X, op: 0x1E, len: 3, cycle: 7},
            
            // BIT(test BITs)
            0x24: {mode: ZP,  op: 0x24, len: 2, cycle: 3},
            0x2C: {mode: ABS, op: 0x2C, len: 3, cycle: 4},
            
            // Branch Instructions
            // BPL(Branch on PLus)
            0x10: {mode: REL, op: 0x10, len: 2, cycle: 2},
            // BMI(Branch on MInus)
            0x30: {mode: REL, op: 0x30, len: 2, cycle: 2},
            // BVC(Branch on oVerflow Clear)
            0x50: {mode: REL, op: 0x50, len: 2, cycle: 2},
            // BVS(Branch on oVerflow Set)
            0x70: {mode: REL, op: 0x70, len: 2, cycle: 2},
            // BCC(Branch on Carry Clear)
            0x90: {mode: REL, op: 0x90, len: 2, cycle: 2},
            // BCS(Branch on Carry Set)
            0xB0: {mode: REL, op: 0xB0, len: 2, cycle: 2},
            // BNE (Branch on Not Equal)
            0xD0: {mode: REL, op: 0xD0, len: 2, cycle: 2},
            // BEQ(Branch on EQual)
            0xF0: {mode: REL, op: 0xF0, len: 2, cycle: 2},
            
            // BRK(BReaK)
            0x00: {mode: IMP, op: 0x00, len: 1, cycle: 7},
            
            // CMP(CoMPare accumulator)
            0xC9: {mode: IMM,   op: 0xC9, len: 2, cycle: 2},
            0xC5: {mode: ZP,    op: 0xC5, len: 2, cycle: 3},
            0xD5: {mode: ZP_X,  op: 0xD5, len: 2, cycle: 4},
            0xCD: {mode: ABS,   op: 0xCD, len: 3, cycle: 4},
            0xDD: {mode: ABS_X, op: 0xDD, len: 3, cycle: 4},
            0xD9: {mode: ABS_Y, op: 0xD9, len: 3, cycle: 4},
            0xC1: {mode: IND_X, op: 0xC1, len: 2, cycle: 6},
            0xD1: {mode: IND_Y, op: 0xD1, len: 2, cycle: 5},
            
            // CPX(ComPare X register)
            0xE0: {mode: IMM, op: 0xE0, len: 2, cycle: 2},
            0xE4: {mode: ZP,  op: 0xE4, len: 2, cycle: 3},
            0xEC: {mode: ABS, op: 0xEC, len: 3, cycle: 4},
            
            // CPY(ComPare Y register)
            0xC0: {mode: IMM, op: 0xC0, len: 2, cycle: 2},
            0xC4: {mode: ZP,  op: 0xC4, len: 2, cycle: 3},
            0xCC: {mode: ABS, op: 0xCC, len: 3, cycle: 4},
            
            // DEC(DECrement memory)
            0xC6: {mode: ZP,    op: 0xC6, len: 2, cycle: 5},
            0xD6: {mode: ZP_X,  op: 0xD6, len: 2, cycle: 6},
            0xCE: {mode: ABS,   op: 0xCE, len: 3, cycle: 6},
            0xDE: {mode: ABS_X, op: 0xDE, len: 3, cycle: 7},
            
            // EOR(bitwise Exclusive OR)
            0x49: {mode: IMM,   op: 0x49, len: 2, cycle: 2},
            0x45: {mode: ZP,    op: 0x45, len: 2, cycle: 3},
            0x55: {mode: ZP_X,  op: 0x55, len: 2, cycle: 4},
            0x4D: {mode: ABS,   op: 0x4D, len: 3, cycle: 4},
            0x5D: {mode: ABS_X, op: 0x5D, len: 3, cycle: 4},
            0x59: {mode: ABS_Y, op: 0x59, len: 3, cycle: 4},
            0x41: {mode: IND_X, op: 0x41, len: 2, cycle: 6},
            0x51: {mode: IND_Y, op: 0x51, len: 2, cycle: 5},
            
            // Flag(Processor Status) Instructions
            // CLC(CLear Carry)
            0x18: {mode: IMP, op: 0x18, len: 1, cycle: 2},
            // SEC(SEt Carry)
            0x38: {mode: IMP, op: 0x38, len: 1, cycle: 2},
            // CLI(CLear Interrupt)
            0x58: {mode: IMP, op: 0x58, len: 1, cycle: 2},
            // SEI(SEt Interrupt)
            0x78: {mode: IMP, op: 0x78, len: 1, cycle: 2},
            // CLV(CLear oVerflow)
            0xB8: {mode: IMP, op: 0xB8, len: 1, cycle: 2},
            // CLD(CLear Decimal)
            0xD8: {mode: IMP, op: 0xD8, len: 1, cycle: 2},
            // SED(SEt Decimal)
            0xF8: {mode: IMP, op: 0xF8, len: 1, cycle: 2},
            
            // INC(INCrement memory)
            0xE6: {mode: ZP,    op: 0xE6, len: 2, cycle: 5},
            0xF6: {mode: ZP_X,  op: 0xF6, len: 2, cycle: 6},
            0xEE: {mode: ABS,   op: 0xEE, len: 3, cycle: 6},
            0xFE: {mode: ABS_X, op: 0xFE, len: 3, cycle: 7},
            
            // JMP(JuMP)
            0x4C: {mode: ABS, op: 0x4C, len: 3, cycle: 3},
            0x6C: {mode: IND, op: 0x6C, len: 3, cycle: 5},
            
            // JSR(Jump to SubRoutine)
            0x20: {mode: ABS, op: 0x20, len: 3, cycle: 6},
            
            // LDA(LoaD Accumulator)
            0xA9: {mode: IMM,   op: 0xA9, len: 2, cycle: 2},
            0xA5: {mode: ZP,    op: 0xA5, len: 2, cycle: 3},
            0xB5: {mode: ZP_X,  op: 0xB5, len: 2, cycle: 4},
            0xAD: {mode: ABS,   op: 0xAD, len: 3, cycle: 4},
            0xBD: {mode: ABS_X, op: 0xBD, len: 3, cycle: 4},
            0xB9: {mode: ABS_Y, op: 0xB9, len: 3, cycle: 4},
            0xA1: {mode: IND_X, op: 0xA1, len: 2, cycle: 6},
            0xB1: {mode: IND_Y, op: 0xB1, len: 2, cycle: 5},
            
            // LDX(LoaD X register)
            0xA2: {mode: IMM,   op: 0xA2, len: 2, cycle: 2},
            0xA6: {mode: ZP,    op: 0xA6, len: 2, cycle: 3},
            0xB6: {mode: ZP_Y,  op: 0xB6, len: 2, cycle: 4},
            0xAE: {mode: ABS,   op: 0xAE, len: 3, cycle: 4},
            0xBE: {mode: ABS_Y, op: 0xBE, len: 3, cycle: 4},
            
            // LDY(LoaD Y register)
            0xA0: {mode: IMM,   op: 0xA0, len: 2, cycle: 2},
            0xA4: {mode: ZP,    op: 0xA4, len: 2, cycle: 3},
            0xB4: {mode: ZP_X,  op: 0xB4, len: 2, cycle: 4},
            0xAC: {mode: ABS,   op: 0xAC, len: 3, cycle: 4},
            0xBC: {mode: ABS_X, op: 0xBC, len: 3, cycle: 4},
            
            // LSR(Logical Shift Right)
            0x4A: {mode: ACC,   op: 0x4A, len: 1, cycle: 2},
            0x46: {mode: ZP,    op: 0x46, len: 2, cycle: 5},
            0x56: {mode: ZP_X,  op: 0x56, len: 2, cycle: 6},
            0x4E: {mode: ABS,   op: 0x4E, len: 3, cycle: 6},
            0x5E: {mode: ABS_X, op: 0x5E, len: 3, cycle: 7},
            
            // NOP(No OPeration)
            0x1A: {mode: IMP, op: 0xEA, len: 1, cycle: 2},
            0x3A: {mode: IMP, op: 0xEA, len: 1, cycle: 2},
            0x5A: {mode: IMP, op: 0xEA, len: 1, cycle: 2},
            0x7A: {mode: IMP, op: 0xEA, len: 1, cycle: 2},
            0xDA: {mode: IMP, op: 0xEA, len: 1, cycle: 2},
            0xEA: {mode: IMP, op: 0xEA, len: 1, cycle: 2},
            0xFA: {mode: IMP, op: 0xEA, len: 1, cycle: 2},
            
            // ORA(bitwise OR with Accumulator)
            0x09: {mode: IMM,   op: 0x09, len: 2, cycle: 2},
            0x05: {mode: ZP,    op: 0x05, len: 2, cycle: 3},
            0x15: {mode: ZP_X,  op: 0x15, len: 2, cycle: 4},
            0x0D: {mode: ABS,   op: 0x0D, len: 3, cycle: 4},
            0x1D: {mode: ABS_X, op: 0x1D, len: 3, cycle: 4},
            0x19: {mode: ABS_Y, op: 0x19, len: 3, cycle: 4},
            0x01: {mode: IND_X, op: 0x01, len: 2, cycle: 6},
            0x11: {mode: IND_Y, op: 0x11, len: 2, cycle: 5},
            
            // Register Instructions
            // TAX(Transfer A to X)
            0xAA: {mode: IMP, op: 0xAA, len: 1, cycle: 2},
            // TXA(Transfer X to A)
            0x8A: {mode: IMP, op: 0x8A, len: 1, cycle: 2},
            // DEX(DEcrement X)
            0xCA: {mode: IMP, op: 0xCA, len: 1, cycle: 2},
            // INX(INcrement X)
            0xE8: {mode: IMP, op: 0xE8, len: 1, cycle: 2},
            // TAY(Transfer A to Y)
            0xA8: {mode: IMP, op: 0xA8, len: 1, cycle: 2},
            // TYA(Transfer Y to A)
            0x98: {mode: IMP, op: 0x98, len: 1, cycle: 2},
            // DEY(DEcrement Y)
            0x88: {mode: IMP, op: 0x88, len: 1, cycle: 2},
            // INY(INcrement Y)
            0xC8: {mode: IMP, op: 0xC8, len: 1, cycle: 2},
            
            // ROL(ROtate Left)
            0x2A: {mode: ACC,   op: 0x2A, len: 1, cycle: 2},
            0x26: {mode: ZP,    op: 0x26, len: 2, cycle: 5},
            0x36: {mode: ZP_X,  op: 0x36, len: 2, cycle: 6},
            0x2E: {mode: ABS,   op: 0x2E, len: 3, cycle: 6},
            0x3E: {mode: ABS_X, op: 0x3E, len: 3, cycle: 7},
            
            // ROR(ROtate Right)
            0x6A: {mode: ACC,   op: 0x6A, len: 1, cycle: 2},
            0x66: {mode: ZP,    op: 0x66, len: 2, cycle: 5},
            0x76: {mode: ZP_X,  op: 0x76, len: 2, cycle: 6},
            0x6E: {mode: ABS,   op: 0x6E, len: 3, cycle: 6},
            0x7E: {mode: ABS_X, op: 0x7E, len: 3, cycle: 7},
            
            // RTI(ReTurn from Interrupt)
            0x40: {mode: IMP, op: 0x40, len: 1, cycle: 6},
            
            // RTS(ReTurn from Subroutine)
            0x60: {mode: IMP, op: 0x60, len: 1, cycle: 6},
            
            // SBC(SuBtract with Carry)
            0xE9: {mode: IMM,   op: 0xE9, len: 2, cycle: 2},
            0xE5: {mode: ZP,    op: 0xE5, len: 2, cycle: 3},
            0xF5: {mode: ZP_X,  op: 0xF5, len: 2, cycle: 4},
            0xED: {mode: ABS,   op: 0xED, len: 3, cycle: 4},
            0xFD: {mode: ABS_X, op: 0xFD, len: 3, cycle: 4},
            0xF9: {mode: ABS_Y, op: 0xF9, len: 3, cycle: 4},
            0xE1: {mode: IND_X, op: 0xE1, len: 2, cycle: 6},
            0xF1: {mode: IND_Y, op: 0xF1, len: 2, cycle: 5},
            
            // STA(STore Accumulator)
            0x85: {mode: ZP,    op: 0x85, len: 2, cycle: 3},
            0x95: {mode: ZP_X,  op: 0x95, len: 2, cycle: 4},
            0x8D: {mode: ABS,   op: 0x8D, len: 3, cycle: 4},
            0x9D: {mode: ABS_X, op: 0x9D, len: 3, cycle: 5},
            0x99: {mode: ABS_Y, op: 0x99, len: 3, cycle: 5},
            0x81: {mode: IND_X, op: 0x81, len: 2, cycle: 6},
            0x91: {mode: IND_Y, op: 0x91, len: 2, cycle: 6},
            
            // Stack Instructions
            // TXS(Transfer X to Stack ptr)
            0x9A: {mode: IMP, op: 0x9A, len: 1, cycle: 2},
            // TSX(Transfer Stack ptr to X)
            0xBA: {mode: IMP, op: 0xBA, len: 1, cycle: 2},
            // PHA(PusH Accumulator)
            0x48: {mode: IMP, op: 0x48, len: 1, cycle: 3},
            // PLA(PuLl Accumulator)
            0x68: {mode: IMP, op: 0x68, len: 1, cycle: 4},
            // PHP(PusH Processor status)
            0x08: {mode: IMP, op: 0x08, len: 1, cycle: 3},
            // PLP(PuLl Processor status)
            0x28: {mode: IMP, op: 0x28, len: 1, cycle: 4},
            
            // STX(STore X register)
            0x86: {mode: ZP,   op: 0x86, len: 2, cycle: 3},
            0x96: {mode: ZP_Y, op: 0x96, len: 2, cycle: 4},
            0x8E: {mode: ABS,  op: 0x8E, len: 3, cycle: 4},
            
            // STY(STore Y register)
            0x84: {mode: ZP,   op: 0x84, len: 2, cycle: 3},
            0x94: {mode: ZP_X, op: 0x94, len: 2, cycle: 4},
            0x8C: {mode: ABS,  op: 0x8C, len: 3, cycle: 4},
            
            // ============================================
            
            // ALR
            0x4B: {mode: IMM, op: 0x4B, len: 2, cycle: 2},
            
            // ANC
            0x0B: {mode: IMM, op: 0x0B, len: 2, cycle: 2},
            0x2B: {mode: IMM, op: 0x2B, len: 2, cycle: 2},
            
            // ARR
            0x6B: {mode: IMM, op: 0x6B, len: 2, cycle: 2},
            
            // AXS
            0xCB: {mode: IMM, op: 0xCB, len: 2, cycle: 2},
            
            // LAX
            0xA3: {mode: IND_X, op: 0xA3, len: 2, cycle: 6},
            0xA7: {mode: ZP,    op: 0xA7, len: 2, cycle: 3},
            0xAF: {mode: ABS,   op: 0xAF, len: 3, cycle: 4},
            0xB3: {mode: IND_Y, op: 0xB3, len: 2, cycle: 5},
            0xB7: {mode: ZP_Y,  op: 0xB7, len: 2, cycle: 4},
            0xBF: {mode: ABS_Y, op: 0xBF, len: 3, cycle: 4},
            
            // SAX
            0x83: {mode: IND_X, op: 0x83, len: 2, cycle: 6},
            0x87: {mode: ZP,    op: 0x87, len: 2, cycle: 3},
            0x8F: {mode: ABS,   op: 0x8F, len: 3, cycle: 4},
            0x97: {mode: ZP_Y,  op: 0x97, len: 2, cycle: 4},
            
            // DCP
            0xC3: {mode: IND_X, op: 0xC3, len: 2, cycle: 8},
            0xC7: {mode: ZP,    op: 0xC7, len: 2, cycle: 5},
            0xCF: {mode: ABS,   op: 0xCF, len: 3, cycle: 6},
            0xD3: {mode: IND_Y, op: 0xD3, len: 2, cycle: 8},
            0xD7: {mode: ZP_X,  op: 0xD7, len: 2, cycle: 6},
            0xDB: {mode: ABS_Y, op: 0xDB, len: 3, cycle: 7},
            0xDF: {mode: ABS_X, op: 0xDF, len: 3, cycle: 7},
            
            // ISC
            0xE3: {mode: IND_X, op: 0xE3, len: 2, cycle: 8},
            0xE7: {mode: ZP,    op: 0xE7, len: 2, cycle: 5},
            0xEF: {mode: ABS,   op: 0xEF, len: 3, cycle: 6},
            0xF3: {mode: IND_Y, op: 0xF3, len: 2, cycle: 8},
            0xF7: {mode: ZP_X,  op: 0xF7, len: 2, cycle: 6},
            0xFB: {mode: ABS_Y, op: 0xFB, len: 3, cycle: 7},
            0xFF: {mode: ABS_X, op: 0xFF, len: 3, cycle: 7},
            
            // RLA
            0x23: {mode: IND_X, op: 0x23, len: 2, cycle: 8},
            0x27: {mode: ZP,    op: 0x27, len: 2, cycle: 5},
            0x2F: {mode: ABS,   op: 0x2F, len: 3, cycle: 6},
            0x33: {mode: IND_Y, op: 0x33, len: 2, cycle: 8},
            0x37: {mode: ZP_X,  op: 0x37, len: 2, cycle: 6},
            0x3B: {mode: ABS_Y, op: 0x3B, len: 3, cycle: 7},
            0x3F: {mode: ABS_X, op: 0x3F, len: 3, cycle: 7},
            
            // RRA
            0x63: {mode: IND_X, op: 0x63, len: 2, cycle: 8},
            0x67: {mode: ZP,    op: 0x67, len: 2, cycle: 5},
            0x6F: {mode: ABS,   op: 0x6F, len: 3, cycle: 6},
            0x73: {mode: IND_Y, op: 0x73, len: 2, cycle: 8},
            0x77: {mode: ZP_X,  op: 0x77, len: 2, cycle: 6},
            0x7B: {mode: ABS_Y, op: 0x7B, len: 3, cycle: 7},
            0x7F: {mode: ABS_X, op: 0x7F, len: 3, cycle: 7},
            
            // SLO
            0x03: {mode: IND_X, op: 0x03, len: 2, cycle: 8},
            0x07: {mode: ZP,    op: 0x07, len: 2, cycle: 5},
            0x0F: {mode: ABS,   op: 0x0F, len: 3, cycle: 6},
            0x13: {mode: IND_Y, op: 0x13, len: 2, cycle: 8},
            0x17: {mode: ZP_X,  op: 0x17, len: 2, cycle: 6},
            0x1B: {mode: ABS_Y, op: 0x1B, len: 3, cycle: 7},
            0x1F: {mode: ABS_X, op: 0x1F, len: 3, cycle: 7},
            
            // SRE
            0x43: {mode: IND_X, op: 0x43, len: 2, cycle: 8},
            0x47: {mode: ZP,    op: 0x47, len: 2, cycle: 5},
            0x4F: {mode: ABS,   op: 0x4F, len: 3, cycle: 6},
            0x53: {mode: IND_Y, op: 0x53, len: 2, cycle: 8},
            0x57: {mode: ZP_X,  op: 0x57, len: 2, cycle: 6},
            0x5B: {mode: ABS_Y, op: 0x5B, len: 3, cycle: 7},
            0x5F: {mode: ABS_X, op: 0x5F, len: 3, cycle: 7},
            
            // SKB
            0x80: {mode: IMM, op: 0x80, len: 2, cycle: 2},
            0x82: {mode: IMM, op: 0x82, len: 2, cycle: 2},
            0x89: {mode: IMM, op: 0x89, len: 2, cycle: 2},
            0xC2: {mode: IMM, op: 0xC2, len: 2, cycle: 2},
            0xE2: {mode: IMM, op: 0xE2, len: 2, cycle: 2},
            
            // SKB
            0x0C: {mode: ABS,   op: 0x0C, len: 3, cycle: 4},
            0x1C: {mode: ABS_X, op: 0x1C, len: 3, cycle: 4},
            0x3C: {mode: ABS_X, op: 0x3C, len: 3, cycle: 4},
            0x5C: {mode: ABS_X, op: 0x5C, len: 3, cycle: 4},
            0x7C: {mode: ABS_X, op: 0x7C, len: 3, cycle: 4},
            0xDC: {mode: ABS_X, op: 0xDC, len: 3, cycle: 4},
            0xFC: {mode: ABS_X, op: 0xFC, len: 3, cycle: 4},
            0x04: {mode: ZP,    op: 0x04, len: 2, cycle: 3},
            0x44: {mode: ZP,    op: 0x44, len: 2, cycle: 3},
            0x64: {mode: ZP,    op: 0x64, len: 2, cycle: 3},
            0x14: {mode: ZP_X,  op: 0x14, len: 2, cycle: 4},
            0x34: {mode: ZP_X,  op: 0x34, len: 2, cycle: 4},
            0x54: {mode: ZP_X,  op: 0x54, len: 2, cycle: 4},
            0x74: {mode: ZP_X,  op: 0x74, len: 2, cycle: 4},
            0xD4: {mode: ZP_X,  op: 0xD4, len: 2, cycle: 4},
            0xF4: {mode: ZP_X,  op: 0xF4, len: 2, cycle: 4},
        };
    };
    
    this.simulate = function() {
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
    var rom = new ROM();
    rom.load(buf);
});































































































































































































