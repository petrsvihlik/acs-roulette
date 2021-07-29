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
exports.CallManager = void 0;
const communication_calling_1 = require("@azure/communication-calling");
const communication_common_1 = require("@azure/communication-common");
const CallStatus_1 = require("./CallStatus");
const ConnectionProvider_1 = require("./ConnectionProvider");
const VideoDirection_1 = require("./VideoDirection");
let call;
let callAgent;
let iTerminated = false;
let connectionProvider = new ConnectionProvider_1.ConnectionProvider();
let deviceManager;
let rendererLocal;
let rendererRemote;
class CallManager {
    constructor(setStatus, handleViewView) {
        this.setStatus = setStatus;
        this.handleViewView = handleViewView;
    }
    init() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let token = (_a = (yield connectionProvider.init())) === null || _a === void 0 ? void 0 : _a.token;
            const callClient = new communication_calling_1.CallClient();
            const tokenCredential = new communication_common_1.AzureCommunicationTokenCredential(token);
            callAgent = yield callClient.createCallAgent(tokenCredential, {
                displayName: "optional ACS user name",
            });
            deviceManager = yield callClient.getDeviceManager();
            this.setStatus(CallStatus_1.CallStatus.Disconnected);
            callAgent.on("incomingCall", (e) => __awaiter(this, void 0, void 0, function* () {
                const videoDevices = yield deviceManager.getCameras();
                const videoDeviceInfo = videoDevices[0];
                let localVideoStream = new communication_calling_1.LocalVideoStream(videoDeviceInfo);
                this.localVideoView(localVideoStream);
                const addedCall = yield e.incomingCall.accept({
                    videoOptions: { localVideoStreams: [localVideoStream] },
                });
                call = addedCall;
                this.subscribeToRemoteParticipantInCall(addedCall);
                this.setStatus(CallStatus_1.CallStatus.Connected);
            }));
            callAgent.on("callsUpdated", (e) => {
                console.log("callsUpdated");
                console.log(e);
                e.removed.forEach((removedCall) => __awaiter(this, void 0, void 0, function* () {
                    console.log("disposing onCallsUpdated");
                    rendererLocal.dispose();
                    this.setStatus(CallStatus_1.CallStatus.Disconnected);
                    console.log("call has been terminated");
                    if (iTerminated === false) {
                        let callee = yield connectionProvider.getNextCallee();
                        if (callee === null || callee === undefined) {
                            console.log("waiting to be called");
                            this.setStatus(CallStatus_1.CallStatus.Waiting);
                        }
                        else {
                            yield this.callUser(callee);
                            this.setStatus(CallStatus_1.CallStatus.Connected);
                        }
                    }
                    else {
                        iTerminated = false;
                    }
                }));
            });
        });
    }
    handleVideoStream(remoteVideoStream) {
        remoteVideoStream.on("isAvailableChanged", () => __awaiter(this, void 0, void 0, function* () {
            if (remoteVideoStream.isAvailable) {
                this.remoteVideoView(remoteVideoStream);
            }
            else {
                console.log("disposing handleVideoStream");
                rendererRemote.dispose();
            }
        }));
        if (remoteVideoStream.isAvailable) {
            this.remoteVideoView(remoteVideoStream);
        }
    }
    subscribeToParticipantVideoStreams(remoteParticipant) {
        remoteParticipant.on("videoStreamsUpdated", (e) => {
            e.added.forEach((v) => {
                this.handleVideoStream(v);
            });
        });
        remoteParticipant.videoStreams.forEach((v) => {
            this.handleVideoStream(v);
        });
    }
    subscribeToRemoteParticipantInCall(callInstance) {
        callInstance.on("remoteParticipantsUpdated", (e) => {
            e.added.forEach((p) => {
                this.subscribeToParticipantVideoStreams(p);
            });
        });
        callInstance.remoteParticipants.forEach((p) => {
            this.subscribeToParticipantVideoStreams(p);
        });
    }
    localVideoView(localVideoStream) {
        return __awaiter(this, void 0, void 0, function* () {
            rendererLocal = new communication_calling_1.VideoStreamRenderer(localVideoStream);
            const view = yield rendererLocal.createView();
            this.handleViewView(view, VideoDirection_1.VideoDirection.Local);
        });
    }
    remoteVideoView(remoteVideoStream) {
        return __awaiter(this, void 0, void 0, function* () {
            rendererRemote = new communication_calling_1.VideoStreamRenderer(remoteVideoStream);
            const view = yield rendererRemote.createView();
            this.handleViewView(view, VideoDirection_1.VideoDirection.Remote);
        });
    }
    callUser(userToCall) {
        return __awaiter(this, void 0, void 0, function* () {
            const videoDevices = yield deviceManager.getCameras();
            const videoDeviceInfo = videoDevices[0];
            let localVideoStream = new communication_calling_1.LocalVideoStream(videoDeviceInfo);
            this.localVideoView(localVideoStream);
            console.log("callee: " + userToCall);
            call = callAgent.startCall([{ communicationUserId: userToCall }], {
                videoOptions: { localVideoStreams: [localVideoStream] },
            });
            this.subscribeToRemoteParticipantInCall(call);
        });
    }
    hangUp() {
        return __awaiter(this, void 0, void 0, function* () {
            iTerminated = true;
            if (call !== undefined && call !== null) {
                yield call.hangUp();
            }
        });
    }
    call() {
        return __awaiter(this, void 0, void 0, function* () {
            let callee = yield connectionProvider.getNextCallee();
            if (callee === null || callee === undefined) {
                console.log("waiting to be called");
                this.setStatus(CallStatus_1.CallStatus.Waiting);
            }
            else {
                yield this.callUser(callee);
                this.setStatus(CallStatus_1.CallStatus.Connected);
            }
        });
    }
    next() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.hangUp();
            yield this.call();
        });
    }
    hangUpCall() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.hangUp();
            this.setStatus(CallStatus_1.CallStatus.Disconnected);
        });
    }
}
exports.CallManager = CallManager;
//# sourceMappingURL=CallManager.js.map