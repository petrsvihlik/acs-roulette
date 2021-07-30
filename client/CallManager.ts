import {
  CallClient,
  CallAgent,
  VideoStreamRenderer,
  LocalVideoStream,
  Call,
  DeviceManager,
  RemoteVideoStream,
  RemoteParticipant,
  VideoStreamRendererView,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { CallStatus } from "./CallStatus";
import { ConnectionProvider } from "./ConnectionProvider";
import { VideoDirection } from "./VideoDirection";

let call: Call;
let callAgent: CallAgent;

let iTerminated: boolean = false;

let connectionProvider: ConnectionProvider = new ConnectionProvider();

let deviceManager: DeviceManager;
let rendererLocal: VideoStreamRenderer;
let rendererRemote: VideoStreamRenderer;

export class CallManager {
  constructor(
    public setStatus: (status: CallStatus) => void,
    public handleViewView: (
      view: VideoStreamRendererView,
      type: VideoDirection
    ) => void
  ) {}

  public async init() {
    let token = (await connectionProvider.init())?.token;
    const callClient = new CallClient();
    const tokenCredential = new AzureCommunicationTokenCredential(token);
    callAgent = await callClient.createCallAgent(tokenCredential, {
      displayName: "optional ACS user name",
    });

    deviceManager = await callClient.getDeviceManager();
    this.setStatus(CallStatus.Disconnected);

    callAgent.on("incomingCall", async (e) => {
      const videoDevices = await deviceManager.getCameras();
      const videoDeviceInfo = videoDevices[0];
      let localVideoStream = new LocalVideoStream(videoDeviceInfo);
      this.localVideoView(localVideoStream);

      const addedCall = await e.incomingCall.accept({
        videoOptions: { localVideoStreams: [localVideoStream] },
      });
      call = addedCall;

      this.subscribeToRemoteParticipantInCall(addedCall);

      this.setStatus(CallStatus.Connected);
    });

    callAgent.on("callsUpdated", (e) => {
      console.log("callsUpdated");
      console.log(e);
      e.removed.forEach(async (removedCall) => {
        // dispose of video renderers
        console.log("disposing onCallsUpdated");
        rendererLocal.dispose();
        //rendererRemote.dispose();
        // toggle button states
        this.setStatus(CallStatus.Disconnected);
        console.log("call has been terminated");
        if (iTerminated === false) {
          // call was terminated by the other side
          let callee = await connectionProvider.getNextCallee();

          if (callee === null || callee === undefined) {
            console.log("waiting to be called");
            this.setStatus(CallStatus.Waiting);
          } else {
            await this.callUser(callee);
            this.setStatus(CallStatus.Connected);
          }
        } else {
          iTerminated = false;
        }
      });
    });
  }

  private handleVideoStream(remoteVideoStream: RemoteVideoStream) {
    remoteVideoStream.on("isAvailableChanged", async () => {
      if (remoteVideoStream.isAvailable) {
        this.remoteVideoView(remoteVideoStream);
      } else {
        console.log("disposing handleVideoStream");

        // error
        // sdk.bundle.js:4 Uncaught (in promise) CallingCommunicationError: Failed to start stream, disposing stream
        // at RemoteStreamRenderer.dispose (sdk.bundle.js:143)
        // at RemoteStreamRenderer.i.value (sdk.bundle.js:4)
        // at VideoStreamRendererViewImpl.attemptToDisposeStreamRenderer (sdk.bundle.js:143)
        // at VideoStreamRendererViewImpl.dispose (sdk.bundle.js:143)
        // at VideoStreamRendererViewImpl.i.value (sdk.bundle.js:4)
        // at VideoStreamRenderer._attemptToDisposeView (sdk.bundle.js:143)
        // at Map.forEach (<anonymous>)
        // at VideoStreamRenderer.dispose (sdk.bundle.js:143)
        // at VideoStreamRenderer.i.value (sdk.bundle.js:4)
        // at t.CallManager.<anonymous> (CallManager.ts:99)

        rendererRemote.dispose();
      }
    });
    if (remoteVideoStream.isAvailable) {
      this.remoteVideoView(remoteVideoStream);
    }
  }

  private subscribeToParticipantVideoStreams(
    remoteParticipant: RemoteParticipant
  ) {
    remoteParticipant.on("videoStreamsUpdated", (e) => {
      e.added.forEach((v) => {
        this.handleVideoStream(v);
      });
    });
    remoteParticipant.videoStreams.forEach((v) => {
      this.handleVideoStream(v);
    });
  }

  private subscribeToRemoteParticipantInCall(callInstance: Call) {
    callInstance.on("remoteParticipantsUpdated", (e) => {
      e.added.forEach((p) => {
        this.subscribeToParticipantVideoStreams(p);
      });
    });
    callInstance.remoteParticipants.forEach((p) => {
      this.subscribeToParticipantVideoStreams(p);
    });
  }
  private async localVideoView(localVideoStream: LocalVideoStream) {
    rendererLocal = new VideoStreamRenderer(localVideoStream);
    const view = await rendererLocal.createView();
    this.handleViewView(view, VideoDirection.Local);
  }

  private async remoteVideoView(remoteVideoStream: RemoteVideoStream) {
    rendererRemote = new VideoStreamRenderer(remoteVideoStream);
    const view = await rendererRemote.createView();
    this.handleViewView(view, VideoDirection.Remote);
  }

  private async callUser(userToCall: string) {
    const videoDevices = await deviceManager.getCameras();
    const videoDeviceInfo = videoDevices[0];
    let localVideoStream = new LocalVideoStream(videoDeviceInfo);

    this.localVideoView(localVideoStream);
    console.log("callee: " + userToCall);
    call = callAgent.startCall([{ communicationUserId: userToCall }], {
      videoOptions: { localVideoStreams: [localVideoStream] },
    });

    this.subscribeToRemoteParticipantInCall(call);
  }

  private async hangUp() {
    iTerminated = true;
    if (call !== undefined && call !== null) {
      // end the current call
      await call.hangUp();
    }
  }

  public async call() {
    let callee = await connectionProvider.getNextCallee();

    if (callee === null || callee === undefined) {
      console.log("waiting to be called");
      this.setStatus(CallStatus.Waiting);
    } else {
      await this.callUser(callee);
      this.setStatus(CallStatus.Connected);
    }
  }

  public async next() {
    await this.hangUp();
    await this.call();
  }

  public async hangUpCall() {
    // dispose of video renderers
    await this.hangUp();

    // toggle button states
    this.setStatus(CallStatus.Disconnected);
  }
}
