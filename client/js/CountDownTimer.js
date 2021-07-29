"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountDownTimer = exports.timeoutObj = void 0;
class CountDownTimer {
    constructor(button, seconds, prefix) {
        this.button = button;
        this.seconds = seconds;
        this.prefix = prefix;
    }
    startCountdown() {
        var endTime, mins, msLeft, time;
        let _this = this;
        function twoDigits(n) {
            return n <= 9 ? "0" + n : n;
        }
        function updateTimer() {
            msLeft = endTime - +new Date();
            if (msLeft < 1000) {
                _this.button.click();
            }
            else {
                time = new Date(msLeft);
                mins = time.getUTCMinutes();
                _this.button.innerHTML =
                    _this.prefix + mins + ":" + twoDigits(time.getUTCSeconds());
                exports.timeoutObj = setTimeout(updateTimer, time.getUTCMilliseconds() + 500);
            }
        }
        endTime = +new Date() + 1000 * this.seconds + 500;
        updateTimer();
    }
    resetCountdown() {
        clearTimeout(exports.timeoutObj);
        this.button.innerHTML = this.prefix;
    }
}
exports.CountDownTimer = CountDownTimer;
//# sourceMappingURL=CountDownTimer.js.map