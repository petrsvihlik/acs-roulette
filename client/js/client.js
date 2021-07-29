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
const communication_calling_1 = require("@azure/communication-calling");
const communication_common_1 = require("@azure/communication-common");
let call;
let callAgent;
let userId = null;
let iTerminated = false;
const callButton = document.getElementById("call-button");
const hangUpButton = document.getElementById("hang-up-button");
const nextButton = document.getElementById("next-button");
let deviceManager;
let localVideoStream;
let rendererLocal;
let rendererRemote;
function handleVideoStream(remoteVideoStream) {
    remoteVideoStream.on("isAvailableChanged", () => __awaiter(this, void 0, void 0, function* () {
        if (remoteVideoStream.isAvailable) {
            remoteVideoView(remoteVideoStream);
        }
        else {
            console.log("disposing handleVideoStream");
            rendererRemote.dispose();
        }
    }));
    if (remoteVideoStream.isAvailable) {
        remoteVideoView(remoteVideoStream);
    }
}
function subscribeToParticipantVideoStreams(remoteParticipant) {
    remoteParticipant.on("videoStreamsUpdated", (e) => {
        e.added.forEach((v) => {
            handleVideoStream(v);
        });
    });
    remoteParticipant.videoStreams.forEach((v) => {
        handleVideoStream(v);
    });
}
function subscribeToRemoteParticipantInCall(callInstance) {
    callInstance.on("remoteParticipantsUpdated", (e) => {
        e.added.forEach((p) => {
            subscribeToParticipantVideoStreams(p);
        });
    });
    callInstance.remoteParticipants.forEach((p) => {
        subscribeToParticipantVideoStreams(p);
    });
}
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield fetch("https://petr-acs-roulette-server.azurewebsites.net/init");
        let token = null;
        if (response.ok) {
            let json = yield response.json();
            token = json.token;
            userId = json.user.communicationUserId;
            console.log(json);
            console.log("userId: " + userId);
        }
        else {
            console.log(response.status + ": " + response.statusText);
        }
        const callClient = new communication_calling_1.CallClient();
        const tokenCredential = new communication_common_1.AzureCommunicationTokenCredential(token);
        callAgent = yield callClient.createCallAgent(tokenCredential, {
            displayName: "optional ACS user name",
        });
        deviceManager = yield callClient.getDeviceManager();
        callButton.disabled = false;
        callAgent.on("incomingCall", (e) => __awaiter(this, void 0, void 0, function* () {
            const videoDevices = yield deviceManager.getCameras();
            const videoDeviceInfo = videoDevices[0];
            localVideoStream = new communication_calling_1.LocalVideoStream(videoDeviceInfo);
            localVideoView();
            callButton.disabled = true;
            hangUpButton.disabled = false;
            nextButton.disabled = false;
            const addedCall = yield e.incomingCall.accept({
                videoOptions: { localVideoStreams: [localVideoStream] },
            });
            call = addedCall;
            subscribeToRemoteParticipantInCall(addedCall);
        }));
        callAgent.on("callsUpdated", (e) => {
            console.log("callsUpdated");
            console.log(e);
            e.removed.forEach((removedCall) => __awaiter(this, void 0, void 0, function* () {
                console.log("disposing onCallsUpdated");
                rendererLocal.dispose();
                hangUpButton.disabled = true;
                nextButton.disabled = true;
                callButton.disabled = false;
                console.log("call has been terminated");
                if (iTerminated === false) {
                    let callee = yield getNextCallee();
                    yield callUser(callee);
                    hangUpButton.disabled = false;
                    nextButton.disabled = false;
                    callButton.disabled = true;
                }
            }));
        });
    });
}
init();
function removeAllChildNodes(parent) {
    if (parent != null) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }
}
function localVideoView() {
    return __awaiter(this, void 0, void 0, function* () {
        rendererLocal = new communication_calling_1.VideoStreamRenderer(localVideoStream);
        const view = yield rendererLocal.createView();
        const myVideoElement = document.getElementById("myVideo");
        removeAllChildNodes(myVideoElement);
        myVideoElement.appendChild(view.target);
    });
}
function remoteVideoView(remoteVideoStream) {
    return __awaiter(this, void 0, void 0, function* () {
        rendererRemote = new communication_calling_1.VideoStreamRenderer(remoteVideoStream);
        const view = yield rendererRemote.createView();
        const remoteVideoElement = document.getElementById("remoteVideo");
        removeAllChildNodes(remoteVideoElement);
        remoteVideoElement.appendChild(view.target);
    });
}
callButton.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    let callee = yield getNextCallee();
    yield callUser(callee);
    hangUpButton.disabled = false;
    nextButton.disabled = false;
    callButton.disabled = true;
}));
nextButton.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    yield hangUp();
    let callee = yield getNextCallee();
    yield callUser(callee);
}));
hangUpButton.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    yield hangUp();
    hangUpButton.disabled = true;
    callButton.disabled = false;
    nextButton.disabled = true;
}));
function getNextCallee() {
    return __awaiter(this, void 0, void 0, function* () {
        const requestHeaders = new Headers();
        if (userId != null) {
            requestHeaders.set('userId', userId);
        }
        let response = yield fetch("https://petr-acs-roulette-server.azurewebsites.net/next", { headers: requestHeaders });
        let callee = null;
        if (response.ok) {
            let json = yield response.json();
            console.log("getNextCallee:");
            console.log(json);
            callee = json.callee;
        }
        else {
            console.log(response.status + ": " + response.statusText);
        }
        return callee;
    });
}
function callUser(userToCall) {
    return __awaiter(this, void 0, void 0, function* () {
        if (userToCall === null || userToCall === undefined) {
            console.log("waiting to be called");
        }
        else {
            const videoDevices = yield deviceManager.getCameras();
            const videoDeviceInfo = videoDevices[0];
            localVideoStream = new communication_calling_1.LocalVideoStream(videoDeviceInfo);
            localVideoView();
            console.log("callee: " + userToCall);
            call = callAgent.startCall([{ communicationUserId: userToCall }], {
                videoOptions: { localVideoStreams: [localVideoStream] },
            });
            subscribeToRemoteParticipantInCall(call);
        }
    });
}
function hangUp() {
    return __awaiter(this, void 0, void 0, function* () {
        iTerminated = true;
        yield call.hangUp();
    });
}
//# sourceMappingURL=client.js.map