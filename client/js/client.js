"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const CallStatus_1 = require("./CallStatus");
const VideoDirection_1 = require("./VideoDirection");
const CountDownTimer_1 = require("./CountDownTimer");
const CallManager_1 = require("./CallManager");
const callButton = document.getElementById("call-button");
const hangUpButton = document.getElementById("hang-up-button");
const nextButton = document.getElementById("next-button");
let countdown = new CountDownTimer_1.CountDownTimer(nextButton, 120, nextButton.innerHTML);
let callManager = new CallManager_1.CallManager(setUI, handleVideoView);
function handleVideoView(view, type) {
    return __awaiter(this, void 0, void 0, function* () {
        let element;
        switch (type) {
            case VideoDirection_1.VideoDirection.Local:
                const myVideoElement = document.getElementById("myVideo");
                element = myVideoElement;
                break;
            case VideoDirection_1.VideoDirection.Remote:
                const remoteVideoElement = document.getElementById("remoteVideo");
                element = remoteVideoElement;
                break;
            default:
                element = null;
                break;
        }
        function removeAllChildNodes(parent) {
            if (parent != null) {
                while (parent.firstChild) {
                    parent.removeChild(parent.firstChild);
                }
            }
        }
        if (element != null) {
            removeAllChildNodes(element);
            element.appendChild(view.target);
        }
    });
}
window.addEventListener("beforeunload", function (e) {
    return __awaiter(this, void 0, void 0, function* () {
        delete e["returnValue"];
        yield callManager.hangUpCall();
    });
});
callButton.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    yield callManager.call();
}));
nextButton.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    yield callManager.next();
}));
hangUpButton.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    yield callManager.hangUpCall();
}));
function setUI(status) {
    const waitingLabel = document.getElementById("waiting");
    switch (status) {
        case CallStatus_1.CallStatus.Disconnected:
            hangUpButton.disabled = true;
            callButton.disabled = false;
            nextButton.disabled = true;
            waitingLabel.style.visibility = "hidden";
            countdown.resetCountdown();
            break;
        case CallStatus_1.CallStatus.Connected:
            hangUpButton.disabled = false;
            callButton.disabled = true;
            nextButton.disabled = false;
            waitingLabel.style.visibility = "hidden";
            countdown.startCountdown();
            break;
        case CallStatus_1.CallStatus.Waiting:
            hangUpButton.disabled = false;
            callButton.disabled = true;
            nextButton.disabled = true;
            waitingLabel.style.visibility = "visible";
            countdown.resetCountdown();
            break;
    }
}
callManager.init();
//# sourceMappingURL=client.js.map