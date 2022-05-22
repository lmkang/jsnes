var Mappers = {};

Mappers[0] = function(nes) {
    nes.mapper = this;
    this.nes = nes;
    this.isMirror = nes.prgBuf.length === 16 * 1024;
    if(nes.chrCount === 0) {
        nes.chrBuf = new Uint8Array(0x2000);
    }
};

Mappers[0].prototype.readByte = function(addr) {
    addr &= 0xffff;
    if(addr < 0x2000) {
        return this.nes.chrBuf[this.parseAddr(addr)];
    } else if(addr >= 0x6000 && addr < 0x8000) {
        
    } else if(addr >= 0x8000) {
        return this.nes.prgBuf[this.parseAddr(addr)];
    } else {
        return 0;
    }
};

Mappers[0].prototype.writeByte = function(addr, value) {
    addr &= 0xffff;
    if(addr < 0x2000) {
        this.nes.chrBuf[this.parseAddr(addr)] = value;
    } else if(addr >= 0x6000 && addr < 0x8000) {
        
    } else if(addr >= 0x8000) {
        this.nes.prgBuf[this.parseAddr(addr)] = value;
    } else {
        
    }
};

Mappers[0].prototype.handlePPUClock = function() {
    
};

Mappers[0].prototype.parseAddr = function(addr) {
    if(addr < 0x2000) {
        // CHR
        return addr;
    } else {
        // PRG
        return (this.isMirror ? addr & 0xbfff : addr) - 0x8000;
    }
};

Mappers[2] = function(nes) {
    nes.mapper = this;
    this.nes = nes;
    this.bankSelect = 0;
    var chr = new Uint8Array(8 * 1024);
    chr.set(this.nes.chrBuf);
    this.nes.chrBuf = chr;
};

Mappers[2].prototype.readByte = function(addr) {
    addr &= 0xffff;
    if(addr < 0x2000) {
        return this.nes.chrBuf[addr];
    } else if(addr >= 0x8000) {
        var prgBuf = this.nes.prgBuf;
        if(addr < 0xc000) {
            // bank 0
            return prgBuf[(this.bankSelect << 14) + addr - 0x8000];
        } else {
            // bank 1
            return prgBuf[prgBuf.length - 0x4000 + (addr - 0xc000)];
        }
    } else if(addr >= 0x6000) {
        // RAM
        
    } else {
        return 0;
    }
};

Mappers[2].prototype.writeByte = function(addr, value) {
    addr &= 0xffff;
    if(addr < 0x2000) {
        this.nes.chrBuf[addr] = value;
    } else if(addr >= 0x8000) {
        this.bankSelect = value & 0x0f;
    } else if(addr >= 0x6000) {
        // RAM
        
    } else {
        // error handler
        
    }
};

Mappers[2].prototype.handlePPUClock = function() {
    
};







































































































































