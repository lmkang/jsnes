function Controller() {
    this.data = 0;
    this.isStrobe = false;
    this.offset = 0;
}

Controller.prototype.readByte = function() {
    var value;
    if(this.isStrobe) {
        value = this.data & 0x80;
    } else {
        value = this.data & (0x80 >> this.offset++);
    }
    return value ? 1 : 0;
};

Controller.prototype.writeByte = function(value) {
    if(value & 0x01) {
        this.isStrobe = true;
    } else {
        this.isStrobe = false;
        this.offset = 0;
    }
};

Controller.prototype.pressButton = function(value, isDown) {
    if(isDown) {
        this.data |= value;
    } else {
        this.data &= ~value & 0xff;
    }
};




























































