export let timeoutObj: NodeJS.Timeout;

export class CountDownTimer {
  constructor(
    private button: HTMLButtonElement,
    private seconds: number,
    private prefix: string
  ) {}

  startCountdown(): void {
    var endTime: number, mins, msLeft, time;
    let _this = this;

    function twoDigits(n: number) {
      return n <= 9 ? "0" + n : n;
    }

    function updateTimer() {
      msLeft = endTime - +new Date();
      if (msLeft < 1000) {
        _this.button.click();
      } else {
        time = new Date(msLeft);
        mins = time.getUTCMinutes();
        _this.button.innerHTML =
          _this.prefix + mins + ":" + twoDigits(time.getUTCSeconds());
        timeoutObj = setTimeout(updateTimer, time.getUTCMilliseconds() + 500);
      }
    }

    endTime = +new Date() + 1000 * this.seconds + 500;
    updateTimer();
  }

  resetCountdown(): void {
    clearTimeout(timeoutObj);
    this.button.innerHTML = this.prefix;
  }
}
