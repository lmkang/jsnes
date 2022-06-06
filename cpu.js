// CPU memory map: https://wiki.nesdev.com/w/index.php/CPU_memory_map
// 2A03 register map: http://wiki.nesdev.com/w/index.php/2A03
function CPUBus(nes) {
  this.nes = nes;
  this.ram = new Uint8Array(0x800);
}

CPUBus.prototype.writeByte = function(address, data) {
  if (address < 0x2000) {
    // RAM
    this.ram[address & 0x07FF] = data;
  } else if (address < 0x4000) {
    // PPU Registers
    this.nes.ppu.cpuWrite(address & 0x2007, data);
  } else if (address === 0x4014) {
    // OAM DMA
    // TODO: DMA needs 512 cycles
    var j = data << 8;
    var buf = new Uint8Array(256);
    for(var i = 0; i < buf.length; i++) {
        buf[i] = this.readByte(j + i);
    }
    this.nes.ppu.dmaCopy(buf);
    this.nes.cpu.suspendCycles += this.nes.cpu.clocks & 0x01 ? 513 : 514;
  } else if (address === 0x4016) {
    // Controller
    this.nes.controller1.writeByte(data);
    this.nes.controller2.writeByte(data);
  } else if (address < 0x4018) {
    // APU: $4000-$4013, $4015 and $4017
    
  } else if (address < 0x4020) {
    // APU and I/O functionality that is normally disabled
  } else {
    // ROM
    this.nes.mapper.writeByte(address, data);
  }
}

CPUBus.prototype.writeWord = function(address, data) {
  this.writeByte(address, data & 0xFF);
  this.writeByte(address + 1, (data >> 8) & 0xFF)
}

CPUBus.prototype.readByte = function(address) {
  if (address < 0x2000) {
    // RAM
    return this.ram[address & 0x07FF];
  } else if (address < 0x4000) {
    // PPU Registers
    return this.nes.ppu.cpuRead(address & 0x2007);
  } else if (address === 0x4014) {
    // OAM DMA
    return 0;
  } else if (address === 0x4016 || address === 0x4017) {
    // Controller
    return address === 0x4016 ? this.nes.controller1.readByte() : this.nes.controller2.readByte();
  } else if (address < 0x4018) {
    // APU: $4000-$4013, $4015
    return 0;
  } else if (address < 0x4020) {
    // APU and I/O functionality that is normally disabled
    return 0;
  } else {
    // ROM
    return this.nes.mapper.readByte(address);
  }
}

CPUBus.prototype.readWord = function(address) {
  return (this.readByte(address + 1) << 8 | this.readByte(address)) & 0xFFFF;
}



var Instruction = {
  ADC: 0, AND: 1, ASL: 2, BCC: 3, BCS: 4, BEQ: 5, BIT: 6, BMI: 7,
  BNE: 8, BPL: 9, BRK: 10, BVC: 11, BVS: 12, CLC: 13, CLD: 14, CLI: 15,
  CLV: 16, CMP: 17, CPX: 18, CPY: 19, DEC: 20, DEX: 21, DEY: 22, EOR: 23,
  INC: 24, INX: 25, INY: 26, JMP: 27, JSR: 28, LDA: 29, LDX: 30, LDY: 31,
  LSR: 32, NOP: 33, ORA: 34, PHA: 35, PHP: 36, PLA: 37, PLP: 38, ROL: 39,
  ROR: 40, RTI: 41, RTS: 42, SBC: 43, SEC: 44, SED: 45, SEI: 46, STA: 47,
  STX: 48, STY: 49, TAX: 50, TAY: 51, TSX: 52, TXA: 53, TXS: 54, TYA: 55,

  // Illegal opcode
  DCP: 56, ISC: 57, LAX: 58, RLA: 59, RRA: 60, SAX: 61, SLO: 62, SRE: 63,

  INVALID: 64,
}

// Refer to http://obelisk.me.uk/6502/addressing.html#IMP
var AddressingMode = {
  IMPLICIT: 0, // CLC | RTS
  ACCUMULATOR: 1, // LSR A
  IMMEDIATE: 2, // LDA #10
  ZERO_PAGE: 3, // LDA $00
  ZERO_PAGE_X: 4, // STY $10, X
  ZERO_PAGE_Y: 5, // LDX $10, Y
  RELATIVE: 6, // BEQ label | BNE *+4
  ABSOLUTE: 7, // JMP $1234
  ABSOLUTE_X: 8, // STA $3000, X
  ABSOLUTE_Y: 9, // AND $4000, Y
  INDIRECT: 10, // JMP ($FFFC)
  X_INDEXED_INDIRECT: 11, // LDA ($40, X)
  INDIRECT_Y_INDEXED: 12, // LDA ($40), Y
}

function E(instruction, addressingMode, bytes, cycles, pageCycles) {
  return {
    instruction: instruction,
    addressingMode: addressingMode,
    bytes: bytes,
    cycles: cycles,
    pageCycles: pageCycles,
  };
}

var OPCODE_TABLE = [
  // http://nesdev.com/the%20%27B%27%20flag%20&%20BRK%20instruction.txt Says:
  //   Regardless of what ANY 6502 documentation says, BRK is a 2 byte opcode. The
  //   first is #$00, and the second is a padding byte. This explains why interrupt
  //   routines called by BRK always return 2 bytes after the actual BRK opcode,
  //   and not just 1.
  // So we use ZERO_PAGE instead of IMPLICIT addressing mode
  E(Instruction.BRK, AddressingMode.ZERO_PAGE, 2, 7, 0), // 0

  E(Instruction.ORA, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 1, 1h
  undefined, // 2
  E(Instruction.SLO, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 3, 3h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE, 2, 3, 0), // 4, 4h
  E(Instruction.ORA, AddressingMode.ZERO_PAGE, 2, 3, 0), // 5, 5h
  E(Instruction.ASL, AddressingMode.ZERO_PAGE, 2, 5, 0), // 6, 6h
  E(Instruction.SLO, AddressingMode.ZERO_PAGE, 2, 5, 0), // 7, 7h
  E(Instruction.PHP, AddressingMode.IMPLICIT, 1, 3, 0), // 8, 8h
  E(Instruction.ORA, AddressingMode.IMMEDIATE, 2, 2, 0), // 9, 9h
  E(Instruction.ASL, AddressingMode.ACCUMULATOR, 1, 2, 0), // 10, Ah
  undefined, // 11
  E(Instruction.NOP, AddressingMode.ABSOLUTE, 3, 4, 0), // 12, Ch
  E(Instruction.ORA, AddressingMode.ABSOLUTE, 3, 4, 0), // 13, Dh
  E(Instruction.ASL, AddressingMode.ABSOLUTE, 3, 6, 0), // 14, Eh
  E(Instruction.SLO, AddressingMode.ABSOLUTE, 3, 6, 0), // 15, Fh
  E(Instruction.BPL, AddressingMode.RELATIVE, 2, 2, 1), // 16, 10h
  E(Instruction.ORA, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 17, 11h
  undefined, // 18
  E(Instruction.SLO, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 19, 13h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 20, 14h
  E(Instruction.ORA, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 21, 15h
  E(Instruction.ASL, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 22, 16h
  E(Instruction.SLO, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 23, 17h
  E(Instruction.CLC, AddressingMode.IMPLICIT, 1, 2, 0), // 24, 18h
  E(Instruction.ORA, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 25, 19h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 26, 1Ah
  E(Instruction.SLO, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 27, 1Bh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 28, 1Ch
  E(Instruction.ORA, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 29, 1Dh
  E(Instruction.ASL, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 30, 1Eh
  E(Instruction.SLO, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 31, 1Fh
  E(Instruction.JSR, AddressingMode.ABSOLUTE, 3, 6, 0), // 32, 20h
  E(Instruction.AND, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 33, 21h
  undefined, // 34
  E(Instruction.RLA, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 35, 23h
  E(Instruction.BIT, AddressingMode.ZERO_PAGE, 2, 3, 0), // 36, 24h
  E(Instruction.AND, AddressingMode.ZERO_PAGE, 2, 3, 0), // 37, 25h
  E(Instruction.ROL, AddressingMode.ZERO_PAGE, 2, 5, 0), // 38, 26h
  E(Instruction.RLA, AddressingMode.ZERO_PAGE, 2, 5, 0), // 39, 27h
  E(Instruction.PLP, AddressingMode.IMPLICIT, 1, 4, 0), // 40, 28h
  E(Instruction.AND, AddressingMode.IMMEDIATE, 2, 2, 0), // 41, 29h
  E(Instruction.ROL, AddressingMode.ACCUMULATOR, 1, 2, 0), // 42, 2Ah
  undefined, // 43
  E(Instruction.BIT, AddressingMode.ABSOLUTE, 3, 4, 0), // 44, 2Ch
  E(Instruction.AND, AddressingMode.ABSOLUTE, 3, 4, 0), // 45, 2Dh
  E(Instruction.ROL, AddressingMode.ABSOLUTE, 3, 6, 0), // 46, 2Eh
  E(Instruction.RLA, AddressingMode.ABSOLUTE, 3, 6, 0), // 47, 2Fh
  E(Instruction.BMI, AddressingMode.RELATIVE, 2, 2, 1), // 48, 30h
  E(Instruction.AND, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 49, 31h
  undefined, // 50
  E(Instruction.RLA, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 51, 33h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 52, 34h
  E(Instruction.AND, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 53, 35h
  E(Instruction.ROL, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 54, 36h
  E(Instruction.RLA, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 55, 37h
  E(Instruction.SEC, AddressingMode.IMPLICIT, 1, 2, 0), // 56, 38h
  E(Instruction.AND, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 57, 39h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 58, 3Ah
  E(Instruction.RLA, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 59, 3Bh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 60, 3Ch
  E(Instruction.AND, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 61, 3Dh
  E(Instruction.ROL, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 62, 3Eh
  E(Instruction.RLA, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 63, 3Fh
  E(Instruction.RTI, AddressingMode.IMPLICIT, 1, 6, 0), // 64, 40h
  E(Instruction.EOR, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 65, 41h
  undefined, // 66
  E(Instruction.SRE, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 67, 43h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE, 2, 3, 0), // 68, 44h
  E(Instruction.EOR, AddressingMode.ZERO_PAGE, 2, 3, 0), // 69, 45h
  E(Instruction.LSR, AddressingMode.ZERO_PAGE, 2, 5, 0), // 70, 46h
  E(Instruction.SRE, AddressingMode.ZERO_PAGE, 2, 5, 0), // 71, 47h
  E(Instruction.PHA, AddressingMode.IMPLICIT, 1, 3, 0), // 72, 48H
  E(Instruction.EOR, AddressingMode.IMMEDIATE, 2, 2, 0), // 73, 49H
  E(Instruction.LSR, AddressingMode.ACCUMULATOR, 1, 2, 0), // 74, 4Ah
  undefined, // 75
  E(Instruction.JMP, AddressingMode.ABSOLUTE, 3, 3, 0), // 76, 4Ch
  E(Instruction.EOR, AddressingMode.ABSOLUTE, 3, 4, 0), // 77, 4Dh
  E(Instruction.LSR, AddressingMode.ABSOLUTE, 3, 6, 0), // 78, 4Eh
  E(Instruction.SRE, AddressingMode.ABSOLUTE, 3, 6, 0), // 79, 4Fh
  E(Instruction.BVC, AddressingMode.RELATIVE, 2, 2, 1), // 80, 50h
  E(Instruction.EOR, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 81, 51h
  undefined, // 82
  E(Instruction.SRE, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 83, 53h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 84, 54h
  E(Instruction.EOR, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 85, 55h
  E(Instruction.LSR, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 86, 56h
  E(Instruction.SRE, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 87, 57h
  E(Instruction.CLI, AddressingMode.IMPLICIT, 1, 2, 0), // 88, 58h
  E(Instruction.EOR, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 89, 59h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 90, 5Ah
  E(Instruction.SRE, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 91, 5Bh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 92, 5Ch
  E(Instruction.EOR, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 93, 5Dh
  E(Instruction.LSR, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 94, 5Eh
  E(Instruction.SRE, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 95, 5Fh
  E(Instruction.RTS, AddressingMode.IMPLICIT, 1, 6, 0), // 96, 60h
  E(Instruction.ADC, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 97, 61h
  undefined, // 98
  E(Instruction.RRA, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 99, 63h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE, 2, 3, 0), // 100, 64h
  E(Instruction.ADC, AddressingMode.ZERO_PAGE, 2, 3, 0), // 101, 65h
  E(Instruction.ROR, AddressingMode.ZERO_PAGE, 2, 5, 0), // 102, 66h
  E(Instruction.RRA, AddressingMode.ZERO_PAGE, 2, 5, 0), // 103, 67h
  E(Instruction.PLA, AddressingMode.IMPLICIT, 1, 4, 0), // 104, 68h
  E(Instruction.ADC, AddressingMode.IMMEDIATE, 2, 2, 0), // 105, 69h
  E(Instruction.ROR, AddressingMode.ACCUMULATOR, 1, 2, 0), // 106, 6Ah
  undefined, // 107
  E(Instruction.JMP, AddressingMode.INDIRECT, 3, 5, 0), // 108, 6Ch
  E(Instruction.ADC, AddressingMode.ABSOLUTE, 3, 4, 0), // 109, 6Dh
  E(Instruction.ROR, AddressingMode.ABSOLUTE, 3, 6, 0), // 110, 6Eh
  E(Instruction.RRA, AddressingMode.ABSOLUTE, 3, 6, 0), // 111, 6Fh
  E(Instruction.BVS, AddressingMode.RELATIVE, 2, 2, 1), // 112, 70h
  E(Instruction.ADC, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 113, 71h
  undefined, // 114
  E(Instruction.RRA, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 115, 73h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 116, 74h
  E(Instruction.ADC, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 117, 75h
  E(Instruction.ROR, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 118, 76h
  E(Instruction.RRA, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 119, 77h
  E(Instruction.SEI, AddressingMode.IMPLICIT, 1, 2, 0), // 120, 78h
  E(Instruction.ADC, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 121, 79h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 122, 7Ah
  E(Instruction.RRA, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 123, 7Bh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 124, 7Ch
  E(Instruction.ADC, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 125, 7Dh
  E(Instruction.ROR, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 126, 7Eh
  E(Instruction.RRA, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 127, 7Fh
  E(Instruction.NOP, AddressingMode.IMMEDIATE, 2, 2, 0), // 128, 80h
  E(Instruction.STA, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 129, 81h
  E(Instruction.NOP, AddressingMode.IMMEDIATE, 2, 2, 0), // 130, 82h
  E(Instruction.SAX, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 131, 83h
  E(Instruction.STY, AddressingMode.ZERO_PAGE, 2, 3, 0), // 132, 84h
  E(Instruction.STA, AddressingMode.ZERO_PAGE, 2, 3, 0), // 133, 85h
  E(Instruction.STX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 134, 86h
  E(Instruction.SAX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 135, 87h
  E(Instruction.DEY, AddressingMode.IMPLICIT, 1, 2, 0), // 136, 88h
  undefined, // 137
  E(Instruction.TXA, AddressingMode.IMPLICIT, 1, 2, 0), // 138, 8Ah
  undefined, // 139
  E(Instruction.STY, AddressingMode.ABSOLUTE, 3, 4, 0), // 140, 8Ch
  E(Instruction.STA, AddressingMode.ABSOLUTE, 3, 4, 0), // 141, 8Dh
  E(Instruction.STX, AddressingMode.ABSOLUTE, 3, 4, 0), // 142, 8Eh
  E(Instruction.SAX, AddressingMode.ABSOLUTE, 3, 4, 0), // 143, 8Fh
  E(Instruction.BCC, AddressingMode.RELATIVE, 2, 2, 1), // 144, 90h
  E(Instruction.STA, AddressingMode.INDIRECT_Y_INDEXED, 2, 6, 0), // 145, 91h
  undefined, // 146
  undefined, // 147
  E(Instruction.STY, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 148, 94h
  E(Instruction.STA, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 149, 95h
  E(Instruction.STX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0), // 150, 96h
  E(Instruction.SAX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0), // 151, 97h
  E(Instruction.TYA, AddressingMode.IMPLICIT, 1, 2, 0), // 152, 98h
  E(Instruction.STA, AddressingMode.ABSOLUTE_Y, 3, 5, 0), // 153, 99h
  E(Instruction.TXS, AddressingMode.IMPLICIT, 1, 2, 0), // 154, 9Ah
  undefined, // 155
  undefined, // 156
  E(Instruction.STA, AddressingMode.ABSOLUTE_X, 3, 5, 0), // 157, 9Dh
  undefined, // 158
  undefined, // 159
  E(Instruction.LDY, AddressingMode.IMMEDIATE, 2, 2, 0), // 160, A0h
  E(Instruction.LDA, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 161, A1h
  E(Instruction.LDX, AddressingMode.IMMEDIATE, 2, 2, 0), // 162, A2h
  E(Instruction.LAX, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 163, A3h
  E(Instruction.LDY, AddressingMode.ZERO_PAGE, 2, 3, 0), // 164, A4h
  E(Instruction.LDA, AddressingMode.ZERO_PAGE, 2, 3, 0), // 165, A5h
  E(Instruction.LDX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 166, A6h
  E(Instruction.LAX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 167, A7h
  E(Instruction.TAY, AddressingMode.IMPLICIT, 1, 2, 0), // 168, A8h
  E(Instruction.LDA, AddressingMode.IMMEDIATE, 2, 2, 0), // 169, A9h
  E(Instruction.TAX, AddressingMode.IMPLICIT, 1, 2, 0), // 170, AAh
  undefined, // 171
  E(Instruction.LDY, AddressingMode.ABSOLUTE, 3, 4, 0), // 172, ACh
  E(Instruction.LDA, AddressingMode.ABSOLUTE, 3, 4, 0), // 173, ADh
  E(Instruction.LDX, AddressingMode.ABSOLUTE, 3, 4, 0), // 174, AEh
  E(Instruction.LAX, AddressingMode.ABSOLUTE, 3, 4, 0), // 175, AFh
  E(Instruction.BCS, AddressingMode.RELATIVE, 2, 2, 1), // 176, B0h
  E(Instruction.LDA, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 177, B1h
  undefined, // 178
  E(Instruction.LAX, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 179, B3h
  E(Instruction.LDY, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 180, B4h
  E(Instruction.LDA, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 181, B5h
  E(Instruction.LDX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0), // 182, B6h
  E(Instruction.LAX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0), // 183, B7h
  E(Instruction.CLV, AddressingMode.IMPLICIT, 1, 2, 0), // 184, B8h
  E(Instruction.LDA, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 185, B9h
  E(Instruction.TSX, AddressingMode.IMPLICIT, 1, 2, 0), // 186, BAh
  undefined, // 187
  E(Instruction.LDY, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 188, BCh
  E(Instruction.LDA, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 189, BDh
  E(Instruction.LDX, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 190, BEh
  E(Instruction.LAX, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 191, BFh
  E(Instruction.CPY, AddressingMode.IMMEDIATE, 2, 2, 0), // 192, C0h
  E(Instruction.CMP, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 193, C1h
  undefined, // 194
  E(Instruction.DCP, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 195, C3h
  E(Instruction.CPY, AddressingMode.ZERO_PAGE, 2, 3, 0), // 196, C4h
  E(Instruction.CMP, AddressingMode.ZERO_PAGE, 2, 3, 0), // 197, C5h
  E(Instruction.DEC, AddressingMode.ZERO_PAGE, 2, 5, 0), // 198, C6h
  E(Instruction.DCP, AddressingMode.ZERO_PAGE, 2, 5, 0), // 199, C7h
  E(Instruction.INY, AddressingMode.IMPLICIT, 1, 2, 0), // 200, C8h
  E(Instruction.CMP, AddressingMode.IMMEDIATE, 2, 2, 0), // 201, C9h
  E(Instruction.DEX, AddressingMode.IMPLICIT, 1, 2, 0), // 202, CAh
  undefined, // 203
  E(Instruction.CPY, AddressingMode.ABSOLUTE, 3, 4, 0), // 204, CCh
  E(Instruction.CMP, AddressingMode.ABSOLUTE, 3, 4, 0), // 205, CDh
  E(Instruction.DEC, AddressingMode.ABSOLUTE, 3, 6, 0), // 206, CEh
  E(Instruction.DCP, AddressingMode.ABSOLUTE, 3, 6, 0), // 207, CFh
  E(Instruction.BNE, AddressingMode.RELATIVE, 2, 2, 1), // 208, D0h
  E(Instruction.CMP, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 209, D1h
  undefined, // 210
  E(Instruction.DCP, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 211, D3h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 212, D4h
  E(Instruction.CMP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 213, D5h
  E(Instruction.DEC, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 214, D6h
  E(Instruction.DCP, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 215, D7h
  E(Instruction.CLD, AddressingMode.IMPLICIT, 1, 2, 0), // 216, D8h
  E(Instruction.CMP, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 217, D9h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 218, DAh
  E(Instruction.DCP, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 219, DBh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 220, DCh
  E(Instruction.CMP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 221, DDh
  E(Instruction.DEC, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 222, DEh
  E(Instruction.DCP, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 223, DFh
  E(Instruction.CPX, AddressingMode.IMMEDIATE, 2, 2, 0), // 224, E0h
  E(Instruction.SBC, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 225, E1h
  undefined, // 226
  E(Instruction.ISC, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 227, E3h
  E(Instruction.CPX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 228, E4h
  E(Instruction.SBC, AddressingMode.ZERO_PAGE, 2, 3, 0), // 229, E5h
  E(Instruction.INC, AddressingMode.ZERO_PAGE, 2, 5, 0), // 230, E6h
  E(Instruction.ISC, AddressingMode.ZERO_PAGE, 2, 5, 0), // 231, E7h
  E(Instruction.INX, AddressingMode.IMPLICIT, 1, 2, 0), // 232, E8h
  E(Instruction.SBC, AddressingMode.IMMEDIATE, 2, 2, 0), // 233, E9h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 234, EAh
  E(Instruction.SBC, AddressingMode.IMMEDIATE, 2, 2, 0), // 235, EBh
  E(Instruction.CPX, AddressingMode.ABSOLUTE, 3, 4, 0), // 236, ECh
  E(Instruction.SBC, AddressingMode.ABSOLUTE, 3, 4, 0), // 237, EDh
  E(Instruction.INC, AddressingMode.ABSOLUTE, 3, 6, 0), // 238, EEh
  E(Instruction.ISC, AddressingMode.ABSOLUTE, 3, 6, 0), // 239, EFh
  E(Instruction.BEQ, AddressingMode.RELATIVE, 2, 2, 1), // 240, F0h
  E(Instruction.SBC, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 241, F1h
  undefined, // 242
  E(Instruction.ISC, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 243, F3h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 244, F4h
  E(Instruction.SBC, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 245, F5h
  E(Instruction.INC, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 246, F6h
  E(Instruction.ISC, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 247, F7h
  E(Instruction.SED, AddressingMode.IMPLICIT, 1, 2, 0), // 248, F8h
  E(Instruction.SBC, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 249, F9h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 250, FAh
  E(Instruction.ISC, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 251, FBh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 252, FCh
  E(Instruction.SBC, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 253, FDh
  E(Instruction.INC, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 254, FEh
  E(Instruction.ISC, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 255, FFh
];

var InterruptVector = {
  NMI : 0xFFFA,
  RESET : 0xFFFC,
  IRQ : 0xFFFE,
}

var Flags = {
  C : 1 << 0, // Carry
  Z : 1 << 1, // Zero
  I : 1 << 2, // Disable interrupt
  D : 1 << 3, // Decimal Mode ( unused in nes )
  B : 1 << 4, // Break
  U : 1 << 5, // Unused ( always 1 )
  V : 1 << 6, // Overflow
  N : 1 << 7, // Negative
}

// 6502 Instruction Reference: http://obelisk.me.uk/6502/reference.html
// 6502/6510/8500/8502 Opcode matrix: http://www.oxyron.de/html/opcodes02.html
function CPU(nes) {
  nes.cpu = this;
  this.nes = nes;
  this.bus = new CPUBus(nes);
  this.suspendCycles = 0;

  this.clocks = 0;
  this.deferCycles = 0;
  this.registers = {};
  this.instructionMap = new Map([
    [ Instruction.ADC, this.adc ],
    [ Instruction.AND, this.and ],
    [ Instruction.ASL, this.asl ],
    [ Instruction.BCC, this.bcc ],
    [ Instruction.BCS, this.bcs ],
    [ Instruction.BEQ, this.beq ],
    [ Instruction.BIT, this.bit ],
    [ Instruction.BMI, this.bmi ],
    [ Instruction.BNE, this.bne ],
    [ Instruction.BPL, this.bpl ],
    [ Instruction.BRK, this.brk ],
    [ Instruction.BVC, this.bvc ],
    [ Instruction.BVS, this.bvs ],
    [ Instruction.CLC, this.clc ],
    [ Instruction.CLD, this.cld ],
    [ Instruction.CLI, this.cli ],
    [ Instruction.CLV, this.clv ],
    [ Instruction.CMP, this.cmp ],
    [ Instruction.CPX, this.cpx ],
    [ Instruction.CPY, this.cpy ],
    [ Instruction.DEC, this.dec ],
    [ Instruction.DEX, this.dex ],
    [ Instruction.DEY, this.dey ],
    [ Instruction.EOR, this.eor ],
    [ Instruction.INC, this.inc ],
    [ Instruction.INX, this.inx ],
    [ Instruction.INY, this.iny ],
    [ Instruction.JMP, this.jmp ],
    [ Instruction.JSR, this.jsr ],
    [ Instruction.LDA, this.lda ],
    [ Instruction.LDX, this.ldx ],
    [ Instruction.LDY, this.ldy ],
    [ Instruction.LSR, this.lsr ],
    [ Instruction.NOP, this.nop ],
    [ Instruction.ORA, this.ora ],
    [ Instruction.PHA, this.pha ],
    [ Instruction.PHP, this.php ],
    [ Instruction.PLA, this.pla ],
    [ Instruction.PLP, this.plp ],
    [ Instruction.ROL, this.rol ],
    [ Instruction.ROR, this.ror ],
    [ Instruction.RTI, this.rti ],
    [ Instruction.RTS, this.rts ],
    [ Instruction.SBC, this.sbc ],
    [ Instruction.SEC, this.sec ],
    [ Instruction.SED, this.sed ],
    [ Instruction.SEI, this.sei ],
    [ Instruction.STA, this.sta ],
    [ Instruction.STX, this.stx ],
    [ Instruction.STY, this.sty ],
    [ Instruction.TAX, this.tax ],
    [ Instruction.TAY, this.tay ],
    [ Instruction.TSX, this.tsx ],
    [ Instruction.TXA, this.txa ],
    [ Instruction.TXS, this.txs ],
    [ Instruction.TYA, this.tya ],

    // Illegal instruction
    [ Instruction.DCP, this.dcp ],
    [ Instruction.ISC, this.isc ],
    [ Instruction.LAX, this.lax ],
    [ Instruction.RLA, this.rla ],
    [ Instruction.RRA, this.rra ],
    [ Instruction.SAX, this.sax ],
    [ Instruction.SLO, this.slo ],
    [ Instruction.SRE, this.sre ],
  ]);
  this.addressingModeMap = new Map([
    [ AddressingMode.ABSOLUTE, this.absolute ],
    [ AddressingMode.ABSOLUTE_X, this.absoluteX ],
    [ AddressingMode.ABSOLUTE_Y, this.absoluteY ],
    [ AddressingMode.ACCUMULATOR, this.accumulator ],
    [ AddressingMode.IMMEDIATE, this.immediate ],
    [ AddressingMode.IMPLICIT, this.implicit ],
    [ AddressingMode.INDIRECT, this.indirect ],
    [ AddressingMode.INDIRECT_Y_INDEXED, this.indirectYIndexed ],
    [ AddressingMode.RELATIVE, this.relative ],
    [ AddressingMode.X_INDEXED_INDIRECT, this.xIndexedIndirect ],
    [ AddressingMode.ZERO_PAGE, this.zeroPage ],
    [ AddressingMode.ZERO_PAGE_X, this.zeroPageX ],
    [ AddressingMode.ZERO_PAGE_Y, this.zeroPageY ],
  ]);
}
CPU.prototype.reset = function() {
  this.registers.A = 0;
  this.registers.X = 0;
  this.registers.Y = 0;
  this.registers.P = 0;
  this.registers.SP = 0xfd;
  this.registers.PC = this.bus.readWord(InterruptVector.RESET);

  this.deferCycles = 8;
  this.clocks = 0;
}

CPU.prototype.clock = function() {
  if (this.suspendCycles > 0) {
    this.suspendCycles--;
    return;
  }

  if (this.deferCycles === 0) {
    this.step();
  }

  this.deferCycles--;
  this.clocks++;
}

CPU.prototype.irq = function() {
  if (this.isFlagSet(Flags.I)) {
    return;
  }

  this.pushWord(this.registers.PC);
  this.pushByte((this.registers.P | Flags.U) & ~Flags.B);

  this.setFlag(Flags.I, true);

  this.registers.PC = this.bus.readWord(InterruptVector.IRQ);

  this.deferCycles += 7;
}

CPU.prototype.nmi = function() {
  this.pushWord(this.registers.PC);
  this.pushByte((this.registers.P | Flags.U) & ~Flags.B);

  this.setFlag(Flags.I, true);

  this.registers.PC = this.bus.readWord(InterruptVector.NMI);

  this.deferCycles += 7;
}

CPU.prototype.setFlag = function(flag, value) {
  if (value) {
    this.registers.P |= flag;
  } else {
    this.registers.P &= ~flag;
  }
}

CPU.prototype.isFlagSet = function(flag) {
  return !!(this.registers.P & flag);
}

CPU.prototype.step = function() {
  const opcode = this.bus.readByte(this.registers.PC++);
  const entry = OPCODE_TABLE[opcode];
  if (!entry) {
    throw new Error(`Invalid opcode '${opcode}(0x${opcode.toString(16)})', pc: 0x${(this.registers.PC - 1).toString(16)}`);
  }

  if (entry.instruction === Instruction.INVALID) {
    return;
  }

  const addrModeFunc = this.addressingModeMap.get(entry.addressingMode);
  if (!addrModeFunc) {
    throw new Error(`Unsuppored addressing mode: ${AddressingMode[entry.addressingMode]}`);
  }

  const ret = addrModeFunc.call(this);
  if (ret.isCrossPage) {
    this.deferCycles += entry.pageCycles;
  }

  const instrFunc = this.instructionMap.get(entry.instruction);
  if (!instrFunc) {
    throw new Error(`Unsupported instruction: ${Instruction[entry.instruction]}`);
  }
  instrFunc.call(this, ret, entry.addressingMode);

  this.deferCycles += entry.cycles;
}

CPU.prototype.pushWord = function(data) {
  this.pushByte(data >> 8);
  this.pushByte(data);
}

CPU.prototype.pushByte = function(data) {
  this.bus.writeByte(0x100 + this.registers.SP, data);
  this.registers.SP = (this.registers.SP - 1) & 0xFF;
}

CPU.prototype.popWord = function() {
  return this.popByte() | this.popByte() << 8;
}

CPU.prototype.popByte = function() {
  this.registers.SP = (this.registers.SP + 1) & 0xFF;
  return this.bus.readByte(0x100 + this.registers.SP);
}

CPU.prototype.setNZFlag = function(data) {
  this.setFlag(Flags.Z, (data & 0xFF) === 0);
  this.setFlag(Flags.N, !!(data & 0x80));
}

CPU.prototype.getData = function(addrData) {
  if (!isNaN(addrData.data)) {
    return addrData.data;
  } else {
    return this.bus.readByte(addrData.address);
  }
}

CPU.prototype.absolute = function() {
  const address = this.bus.readWord(this.registers.PC);
  this.registers.PC += 2;

  return {
    address: address & 0xFFFF,
    data: NaN,
    isCrossPage: false,
  };
}

CPU.prototype.absoluteX = function() {
  const baseAddress = this.bus.readWord(this.registers.PC);
  this.registers.PC += 2;

  const address = baseAddress + this.registers.X;

  return {
    address: address & 0xFFFF,
    data: NaN,
    isCrossPage: this.isCrossPage(baseAddress, address),
  };
}

CPU.prototype.absoluteY = function() {
  const baseAddress = this.bus.readWord(this.registers.PC);
  this.registers.PC += 2;
  const address = baseAddress + this.registers.Y;

  return {
    address: address & 0xFFFF,
    data: NaN,
    isCrossPage: this.isCrossPage(baseAddress, address),
  };
}

CPU.prototype.accumulator = function() {
  return {
    address: NaN,
    data: this.registers.A,
    isCrossPage: false,
  };
}

CPU.prototype.immediate = function() {
  return {
    address: NaN,
    data: this.bus.readByte(this.registers.PC++),
    isCrossPage: false,
  };
}

CPU.prototype.implicit = function() {
  return {
    address: NaN,
    data: NaN,
    isCrossPage: false,
  };
}

CPU.prototype.indirect = function() {
  let address = this.bus.readWord(this.registers.PC);
  this.registers.PC += 2;

  if ((address & 0xFF) === 0xFF) { // Hardware bug
    address = this.bus.readByte(address & 0xFF00) << 8 | this.bus.readByte(address);
  } else {
    address = this.bus.readWord(address);
  }

  return {
    address: address & 0xFFFF,
    data: NaN,
    isCrossPage: false,
  };
}

CPU.prototype.indirectYIndexed = function() {
  const value = this.bus.readByte(this.registers.PC++);

  const l = this.bus.readByte(value & 0xFF);
  const h = this.bus.readByte((value + 1) & 0xFF);

  const baseAddress = h << 8 | l;
  const address = baseAddress + this.registers.Y;

  return {
    address: address & 0xFFFF,
    data: NaN,
    isCrossPage: this.isCrossPage(baseAddress, address),
  };
}

CPU.prototype.relative = function() {
  // Range is -128 ~ 127
  let offset = this.bus.readByte(this.registers.PC++);
  if (offset & 0x80) {
    offset = offset - 0x100;
  }

  return {
    address: (this.registers.PC + offset) & 0xFFFF,
    data: NaN,
    isCrossPage: false,
  };
}

CPU.prototype.xIndexedIndirect = function() {
  const value = this.bus.readByte(this.registers.PC++);
  const address = (value + this.registers.X);

  const l = this.bus.readByte(address & 0xFF);
  const h = this.bus.readByte((address + 1) & 0xFF);

  return {
    address: (h << 8 | l) & 0xFFFF,
    data: NaN,
    isCrossPage: false,
  };
}

CPU.prototype.zeroPage = function() {
  const address = this.bus.readByte(this.registers.PC++);

  return {
    address: address & 0xFFFF,
    data: NaN,
    isCrossPage: false,
  };
}

CPU.prototype.zeroPageX = function() {
  const address = (this.bus.readByte(this.registers.PC++) + this.registers.X) & 0xFF;

  return {
    address: address & 0xFFFF,
    data: NaN,
    isCrossPage: false,
  };
}

CPU.prototype.zeroPageY = function() {
  const address = (this.bus.readByte(this.registers.PC++) + this.registers.Y) & 0xFF;

  return {
    address: address & 0xFFFF,
    data: NaN,
    isCrossPage: false,
  };
}

CPU.prototype.adc = function(addrData) {
  const data = this.getData(addrData);
  const value = data + this.registers.A + (this.isFlagSet(Flags.C) ? 1 : 0);

  this.setFlag(Flags.C, value > 0xFF);
  this.setFlag(Flags.V, !!((~(this.registers.A ^ data) & (this.registers.A ^ value)) & 0x80));
  this.setNZFlag(value);

  this.registers.A = value & 0xFF;
}

CPU.prototype.and = function(addrData) {
  this.registers.A &= this.getData(addrData);
  this.setNZFlag(this.registers.A);
}

CPU.prototype.asl = function(addrData) {
  let data = this.getData(addrData) << 1;

  this.setFlag(Flags.C, !!(data & 0x100));
  data = data & 0xFF;
  this.setNZFlag(data);

  if (isNaN(addrData.address)) {
    this.registers.A = data;
  } else {
    this.bus.writeByte(addrData.address, data);
  }
}

CPU.prototype.bcc = function(addrData) {
  if (!this.isFlagSet(Flags.C)) {
    this.deferCycles++;
    if (this.isCrossPage(this.registers.PC, addrData.address)) {
      this.deferCycles++;
    }

    this.registers.PC = addrData.address;
  }
}

CPU.prototype.bcs = function(addrData) {
  if (this.isFlagSet(Flags.C)) {
    this.deferCycles++;
    if (this.isCrossPage(this.registers.PC, addrData.address)) {
      this.deferCycles++;
    }

    this.registers.PC = addrData.address;
  }
}

CPU.prototype.beq = function(addrData) {
  if (this.isFlagSet(Flags.Z)) {
    this.deferCycles++;
    if (this.isCrossPage(this.registers.PC, addrData.address)) {
      this.deferCycles++;
    }

    this.registers.PC = addrData.address;
  }
}

CPU.prototype.bit = function(addrData) {
  const data = this.getData(addrData);

  this.setFlag(Flags.Z, !(this.registers.A & data));
  this.setFlag(Flags.N, !!(data & (1 << 7)));
  this.setFlag(Flags.V, !!(data & (1 << 6)));
}

CPU.prototype.bmi = function(addrData) {
  if (this.isFlagSet(Flags.N)) {
    this.deferCycles++;
    if (this.isCrossPage(this.registers.PC, addrData.address)) {
      this.deferCycles++;
    }

    this.registers.PC = addrData.address;
  }
}

CPU.prototype.bne = function(addrData) {
  if (!this.isFlagSet(Flags.Z)) {
    this.deferCycles++;
    if (this.isCrossPage(this.registers.PC, addrData.address)) {
      this.deferCycles++;
    }

    this.registers.PC = addrData.address;
  }
}

CPU.prototype.bpl = function(addrData) {
  if (!this.isFlagSet(Flags.N)) {
    this.deferCycles++;
    if (this.isCrossPage(this.registers.PC, addrData.address)) {
      this.deferCycles++;
    }

    this.registers.PC = addrData.address;
  }
}

CPU.prototype.brk = function(addrData) {
  this.pushWord(this.registers.PC);
  this.pushByte(this.registers.P | Flags.B | Flags.U);

  this.setFlag(Flags.I, true);

  this.registers.PC = this.bus.readWord(InterruptVector.IRQ);
}

CPU.prototype.bvc = function(addrData) {
  if (!this.isFlagSet(Flags.V)) {
    this.deferCycles++;
    if (this.isCrossPage(this.registers.PC, addrData.address)) {
      this.deferCycles++;
    }

    this.registers.PC = addrData.address;
  }
}

CPU.prototype.bvs = function(addrData) {
  if (this.isFlagSet(Flags.V)) {
    this.deferCycles++;
    if (this.isCrossPage(this.registers.PC, addrData.address)) {
      this.deferCycles++;
    }

    this.registers.PC = addrData.address;
  }
}

CPU.prototype.clc = function(addrData) {
  this.setFlag(Flags.C, false);
}

CPU.prototype.cld = function(addrData) {
  this.setFlag(Flags.D, false);
}

CPU.prototype.cli = function(addrData) {
  this.setFlag(Flags.I, false);
}

CPU.prototype.clv = function(addrData) {
  this.setFlag(Flags.V, false);
}

CPU.prototype.cmp = function(addrData) {
  const data = this.getData(addrData);
  const res = this.registers.A - data;

  this.setFlag(Flags.C, this.registers.A >= data);
  this.setNZFlag(res);
}

CPU.prototype.cpx = function(addrData) {
  const data = this.getData(addrData);
  const res = this.registers.X - data;

  this.setFlag(Flags.C, this.registers.X >= data);
  this.setNZFlag(res);
}

CPU.prototype.cpy = function(addrData) {
  const data = this.getData(addrData);
  const res = this.registers.Y - data;

  this.setFlag(Flags.C, this.registers.Y >= data);
  this.setNZFlag(res);
}

CPU.prototype.dec = function(addrData) {
  const data = (this.getData(addrData) - 1) & 0xFF;

  this.bus.writeByte(addrData.address, data);
  this.setNZFlag(data);
}

CPU.prototype.dex = function(addrData) {
  this.registers.X = (this.registers.X - 1) & 0xFF;
  this.setNZFlag(this.registers.X);
}

CPU.prototype.dey = function(addrData) {
  this.registers.Y = (this.registers.Y - 1) & 0xFF;
  this.setNZFlag(this.registers.Y);
}

CPU.prototype.eor = function(addrData) {
  this.registers.A ^= this.getData(addrData);
  this.setNZFlag(this.registers.A);
}

CPU.prototype.inc = function(addrData) {
  const data = (this.getData(addrData) + 1) & 0xFF;

  this.bus.writeByte(addrData.address, data);
  this.setNZFlag(data);
}

CPU.prototype.inx = function(addrData) {
  this.registers.X = (this.registers.X + 1) & 0xFF;
  this.setNZFlag(this.registers.X);
}

CPU.prototype.iny = function(addrData) {
  this.registers.Y = (this.registers.Y + 1) & 0xFF;
  this.setNZFlag(this.registers.Y);
}

CPU.prototype.jmp = function(addrData) {
  this.registers.PC = addrData.address;
}

CPU.prototype.jsr = function(addrData) {
  this.pushWord(this.registers.PC - 1);
  this.registers.PC = addrData.address;
}

CPU.prototype.lda = function(addrData) {
  this.registers.A = this.getData(addrData);

  this.setNZFlag(this.registers.A);
}

CPU.prototype.ldx = function(addrData) {
  this.registers.X = this.getData(addrData);

  this.setNZFlag(this.registers.X);
}

CPU.prototype.ldy = function(addrData) {
  this.registers.Y = this.getData(addrData);

  this.setNZFlag(this.registers.Y);
}

CPU.prototype.lsr = function(addrData) {
  let data = this.getData(addrData);

  this.setFlag(Flags.C, !!(data & 0x01));
  data >>= 1;
  this.setNZFlag(data);

  if (isNaN(addrData.address)) {
    this.registers.A = data;
  } else {
    this.bus.writeByte(addrData.address, data);
  }
}

CPU.prototype.nop = function(addrData) {
  // Do nothing
}

CPU.prototype.ora = function(addrData) {
  this.registers.A |= this.getData(addrData);
  this.setNZFlag(this.registers.A);
}

CPU.prototype.pha = function(addrData) {
  this.pushByte(this.registers.A);
}

CPU.prototype.php = function(addrData) {
  this.pushByte(this.registers.P | Flags.B | Flags.U);
}

CPU.prototype.pla = function(addrData) {
  this.registers.A = this.popByte();
  this.setNZFlag(this.registers.A);
}

CPU.prototype.plp = function(addrData) {
  this.registers.P = this.popByte();
  this.setFlag(Flags.B, false);
  this.setFlag(Flags.U, true);
}

CPU.prototype.rol = function(addrData) {
  let data = this.getData(addrData);

  const isCarry = this.isFlagSet(Flags.C);
  this.setFlag(Flags.C, !!(data & 0x80));
  data = (data << 1 | (isCarry ? 1 : 0)) & 0xFF;
  this.setNZFlag(data);

  if (isNaN(addrData.address)) {
    this.registers.A = data;
  } else {
    this.bus.writeByte(addrData.address, data);
  }
}

CPU.prototype.ror = function(addrData) {
  let data = this.getData(addrData);

  const isCarry = this.isFlagSet(Flags.C);
  this.setFlag(Flags.C, !!(data & 1));
  data = data >> 1 | (isCarry ? 1 << 7 : 0);
  this.setNZFlag(data);

  if (isNaN(addrData.address)) {
    this.registers.A = data;
  } else {
    this.bus.writeByte(addrData.address, data);
  }
}

CPU.prototype.rti = function(addrData) {
  this.registers.P = this.popByte();
  this.setFlag(Flags.B, false);
  this.setFlag(Flags.U, true);

  this.registers.PC = this.popWord();
}

CPU.prototype.rts = function(addrData) {
  this.registers.PC = this.popWord() + 1;
}

CPU.prototype.sbc = function(addrData) {
  const data = this.getData(addrData);
  const res = this.registers.A - data - (this.isFlagSet(Flags.C) ? 0 : 1);

  this.setNZFlag(res);
  this.setFlag(Flags.C, res >= 0);
  this.setFlag(Flags.V, !!((res ^ this.registers.A) & (res ^ data ^ 0xFF) & 0x0080));

  this.registers.A = res & 0xFF;
}

CPU.prototype.sec = function(addrData) {
  this.setFlag(Flags.C, true);
}

CPU.prototype.sed = function(addrData) {
  this.setFlag(Flags.D, true);
}

CPU.prototype.sei = function(addrData) {
  this.setFlag(Flags.I, true);
}

CPU.prototype.sta = function(addrData) {
  this.bus.writeByte(addrData.address, this.registers.A);
}

CPU.prototype.stx = function(addrData) {
  this.bus.writeByte(addrData.address, this.registers.X);
}

CPU.prototype.sty = function(addrData) {
  this.bus.writeByte(addrData.address, this.registers.Y);
}

CPU.prototype.tax = function(addrData) {
  this.registers.X = this.registers.A;
  this.setNZFlag(this.registers.X);
}

CPU.prototype.tay = function(addrData) {
  this.registers.Y = this.registers.A;
  this.setNZFlag(this.registers.Y);
}

CPU.prototype.tsx = function(addrData) {
  this.registers.X = this.registers.SP;
  this.setNZFlag(this.registers.X);
}

CPU.prototype.txa = function(addrData) {
  this.registers.A = this.registers.X;
  this.setNZFlag(this.registers.A);
}

CPU.prototype.txs = function(addrData) {
  this.registers.SP = this.registers.X;
}

CPU.prototype.tya = function(addrData) {
  this.registers.A = this.registers.Y;
  this.setNZFlag(this.registers.A);
}

// Illegal instruction
CPU.prototype.dcp = function(addrData) {
  this.dec(addrData);
  this.cmp(addrData);
}

CPU.prototype.isc = function(addrData) {
  this.inc(addrData);
  this.sbc(addrData);
}

CPU.prototype.lax = function(addrData) {
  this.lda(addrData);
  this.ldx(addrData);
}

CPU.prototype.rla = function(addrData) {
  this.rol(addrData);
  this.and(addrData);
}

CPU.prototype.rra = function(addrData) {
  this.ror(addrData);
  this.adc(addrData);
}

CPU.prototype.sax = function(addrData) {
  const value = this.registers.A & this.registers.X;
  this.bus.writeByte(addrData.address, value);
}

CPU.prototype.slo = function(addrData) {
  this.asl(addrData);
  this.ora(addrData);
}

CPU.prototype.sre = function(addrData) {
  this.lsr(addrData);
  this.eor(addrData);
}

CPU.prototype.isCrossPage = function(addr1, addr2) {
  return (addr1 & 0xff00) !== (addr2 & 0xff00);
}

