import {
  CallClient,
  CallAgent,
  VideoStreamRenderer,
  LocalVideoStream,
  Call,
  DeviceManager,
  RemoteVideoStream,
  RemoteParticipant,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { CallStatus } from "./CallStatus";
import { CountDownTimer } from "./CountDownTimer";
import  {ConnectionProvider} from "./ConnectionProvider"

let call: Call;
let callAgent: CallAgent;

let iTerminated: boolean = false;

const callButton = document.getElementById("call-button") as HTMLButtonElement;
const hangUpButton = document.getElementById(
  "hang-up-button"
) as HTMLButtonElement;
const nextButton = document.getElementById(
  "next-button"
) as HTMLButtonElement;
const waitingLabel = document.getElementById("waiting") as HTMLDivElement;

const myVideoElement: HTMLElement = document.getElementById(
  "myVideo"
) as HTMLElement;

const remoteVideoElement = document.getElementById(
  "remoteVideo"
) as HTMLElement;

console.log(nextButton);
let countdown: CountDownTimer = new CountDownTimer(
  nextButton,
  120,
  "NEXT 🎲 >>"
);

let connectionProvider:ConnectionProvider = new ConnectionProvider();

let deviceManager: DeviceManager;
let rendererLocal: VideoStreamRenderer;
let rendererRemote: VideoStreamRenderer;

function handleVideoStream(remoteVideoStream: RemoteVideoStream) {
  remoteVideoStream.on("isAvailableChanged", async () => {
    if (remoteVideoStream.isAvailable) {
      remoteVideoView(remoteVideoStream);
    } else {
      console.log("disposing handleVideoStream");
      rendererRemote.dispose();
    }
  });
  if (remoteVideoStream.isAvailable) {
    remoteVideoView(remoteVideoStream);
  }
}

function subscribeToParticipantVideoStreams(
  remoteParticipant: RemoteParticipant
) {
  remoteParticipant.on("videoStreamsUpdated", (e) => {
    e.added.forEach((v) => {
      handleVideoStream(v);
    });
  });
  remoteParticipant.videoStreams.forEach((v) => {
    handleVideoStream(v);
  });
}

function subscribeToRemoteParticipantInCall(callInstance: Call) {
  callInstance.on("remoteParticipantsUpdated", (e) => {
    e.added.forEach((p) => {
      subscribeToParticipantVideoStreams(p);
    });
  });
  callInstance.remoteParticipants.forEach((p) => {
    subscribeToParticipantVideoStreams(p);
  });
}

async function init() {
  let token = (await connectionProvider.init())?.token;
  const callClient = new CallClient();
  const tokenCredential = new AzureCommunicationTokenCredential(token);
  callAgent = await callClient.createCallAgent(tokenCredential, {
    displayName: "optional ACS user name",
  });

  deviceManager = await callClient.getDeviceManager();
  setUI(CallStatus.Disconnected);

  callAgent.on("incomingCall", async (e) => {
    const videoDevices = await deviceManager.getCameras();
    const videoDeviceInfo = videoDevices[0];
    let localVideoStream = new LocalVideoStream(videoDeviceInfo);
    localVideoView(localVideoStream);

    const addedCall = await e.incomingCall.accept({
      videoOptions: { localVideoStreams: [localVideoStream] },
    });
    call = addedCall;

    subscribeToRemoteParticipantInCall(addedCall);

    setUI(CallStatus.Connected);
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
      setUI(CallStatus.Disconnected);
      console.log("call has been terminated");
      if (iTerminated === false) {
        // call was terminated by the other side
        let callee = await connectionProvider.getNextCallee();

        if (callee === null || callee === undefined) {
          console.log("waiting to be called");
          setUI(CallStatus.Waiting);
        } else {
          await callUser(callee);
          setUI(CallStatus.Connected);
        }
      }
      else
      {
        iTerminated = false;
      }
    });
  });
}
init();

function removeAllChildNodes(parent: HTMLElement | null) {
  if (parent != null) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  }
}

async function localVideoView(localVideoStream: LocalVideoStream) {
  rendererLocal = new VideoStreamRenderer(localVideoStream);
  const view = await rendererLocal.createView();
  
  removeAllChildNodes(myVideoElement);
  myVideoElement.appendChild(view.target);
}

async function remoteVideoView(remoteVideoStream: RemoteVideoStream) {
  rendererRemote = new VideoStreamRenderer(remoteVideoStream);
  const view = await rendererRemote.createView();
  
  removeAllChildNodes(remoteVideoElement);
  remoteVideoElement.appendChild(view.target);
}

window.addEventListener("beforeunload", async function (e) {
  delete e["returnValue"];
  await hangUp();
});

callButton.addEventListener("click", async () => {
  let callee = await connectionProvider.getNextCallee();

  if (callee === null || callee === undefined) {
    console.log("waiting to be called");
    setUI(CallStatus.Waiting);
  } else {
    await callUser(callee);
    setUI(CallStatus.Connected);
  }
});

nextButton.addEventListener("click", async () => {
  await hangUp();

  // Get callee
  let callee = await connectionProvider.getNextCallee();

  if (callee === null || callee === undefined) {
    console.log("waiting to be called");
    setUI(CallStatus.Waiting);
  } else {
    await callUser(callee);
    setUI(CallStatus.Connected);
  }
});

hangUpButton.addEventListener("click", async () => {
  // dispose of video renderers
  await hangUp();

  // toggle button states
  setUI(CallStatus.Disconnected);
});

async function callUser(userToCall: string) {
  const videoDevices = await deviceManager.getCameras();
  const videoDeviceInfo = videoDevices[0];
  let localVideoStream = new LocalVideoStream(videoDeviceInfo);

  localVideoView(localVideoStream);
  console.log("callee: " + userToCall);
  call = callAgent.startCall([{ communicationUserId: userToCall }], {
    videoOptions: { localVideoStreams: [localVideoStream] },
  });

  subscribeToRemoteParticipantInCall(call);
}

async function hangUp() {
  iTerminated = true;
  if (call !== undefined && call !== null) {
    // end the current call
    await call.hangUp();
  }
}

function setUI(status: CallStatus) {
  switch (status) {
    case CallStatus.Disconnected:
      hangUpButton.disabled = true;
      callButton.disabled = false;
      nextButton.disabled = true;
      waitingLabel.style.visibility = "hidden";
      countdown.resetCountdown();
      break;

    case CallStatus.Connected:
      hangUpButton.disabled = false;
      callButton.disabled = true;
      nextButton.disabled = false;
      waitingLabel.style.visibility = "hidden";
      countdown.startCountdown();
      break;

    case CallStatus.Waiting:
      hangUpButton.disabled = false;
      callButton.disabled = true;
      nextButton.disabled = true;
      waitingLabel.style.visibility = "visible";
      countdown.resetCountdown();
      break;
  }
}
